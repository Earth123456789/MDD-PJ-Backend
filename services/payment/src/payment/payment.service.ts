import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { QrCodeService } from '../qrcode/qrcode.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private qrCodeService: QrCodeService,
    @Inject('RABBITMQ_SERVICE') private client: ClientProxy,
  ) {}

  /**
   * Create a new payment for an order
   */
  async createPayment(createPaymentDto: CreatePaymentDto) {
    try {
      const { order_id, amount, payment_method, driver_id } = createPaymentDto;
      
      // Create the payment record - explicitly don't set qr_code_url here
      const payment = await this.prisma.payment.create({
        data: {
          order_id,
          amount,
          payment_method: payment_method || PaymentMethod.QR_CODE,
          status: PaymentStatus.PENDING,
          driver_id,
        },
      });
      
      // Generate QR code if payment method is QR_CODE
      if (payment.payment_method === PaymentMethod.QR_CODE) {
        const qrCodeUrl = await this.qrCodeService.generatePaymentQrCode(
          payment.id,
          payment.amount,
          payment.driver_id || 0, // Make sure driver_id is provided, default to 0 for error handling
        );
        
        // Update payment with QR code URL (base64 data URI)
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { qr_code_url: qrCodeUrl },
        });
        
        // Update the local object
        payment.qr_code_url = qrCodeUrl;
      }
      
      // Log payment creation
      await this.prisma.paymentLog.create({
        data: {
          payment_id: payment.id,
          status: 'CREATED',
          message: `Payment created for order ${order_id}`,
          metadata: { ...createPaymentDto },
        },
      });
      
      // Publish payment created event
      this.client.emit('payment.created', {
        payment_id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        status: payment.status,
      });
      
      return payment;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Process payment when QR code is scanned
   */
  async processPayment(paymentId: number) {
    try {
      // Get the payment
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          driverAccount: true,
        },
      });
      
      if (!payment) {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }
      
      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(`Payment is already ${payment.status}`);
      }
      
      // Update payment status to PROCESSING
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.PROCESSING },
      });
      
      // Log payment processing start
      await this.prisma.paymentLog.create({
        data: {
          payment_id: paymentId,
          status: 'PROCESSING',
          message: `Payment processing started`,
        },
      });
      
      // Find driver's bank account or create a default one if not exists
      let driverAccount = payment.driverAccount;
      
      if (!driverAccount && payment.driver_id) {
        // Try to find an existing account for this driver
        driverAccount = await this.prisma.driverBankAccount.findFirst({
          where: { driver_id: payment.driver_id },
        });
        
        // If no account exists, create a default one
        if (!driverAccount) {
          driverAccount = await this.prisma.driverBankAccount.create({
            data: {
              driver_id: payment.driver_id,
              bank_name: 'Kasikorn Bank',
              account_number: `DEF-${payment.driver_id}-${Date.now()}`,
              account_holder: `Driver ${payment.driver_id}`,
              balance: 0,
              currency: 'THB',
            },
          });
        }
        
        // Link payment with driver account
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { driver_account_id: driverAccount.id },
        });
      }
      
      // Add transaction to driver's account if account exists
      if (driverAccount) {
        // Create transaction record
        await this.prisma.paymentTransaction.create({
          data: {
            driver_account_id: driverAccount.id,
            amount: payment.amount,
            transaction_type: 'DEPOSIT',
            status: 'COMPLETED',
            description: `Payment for order ${payment.order_id}`,
          },
        });
        
        // Update driver's balance
        await this.prisma.driverBankAccount.update({
          where: { id: driverAccount.id },
          data: { 
            balance: { increment: payment.amount },
          },
        });
      }
      
      // Complete the payment
      const completedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: { 
          status: PaymentStatus.COMPLETED,
          transaction_id: `TRX-${Date.now()}-${paymentId}`,
        },
      });
      
      // Log payment completion
      await this.prisma.paymentLog.create({
        data: {
          payment_id: paymentId,
          status: 'COMPLETED',
          message: `Payment completed successfully`,
        },
      });
      
      // Publish payment completed event
      this.client.emit('payment.completed', {
        payment_id: completedPayment.id,
        order_id: completedPayment.order_id,
        amount: completedPayment.amount,
        transaction_id: completedPayment.transaction_id,
        driver_id: completedPayment.driver_id,
      });
      
      // Notify matching service about payment completion for status update
      this.client.emit('order.payment.completed', {
        order_id: completedPayment.order_id,
        payment_id: completedPayment.id,
      });
      
      return completedPayment;
    } catch (error) {
      this.logger.error(`Failed to process payment ${paymentId}: ${error.message}`, error.stack);
      
      // Log payment failure
      await this.prisma.paymentLog.create({
        data: {
          payment_id: paymentId,
          status: 'FAILED',
          message: `Payment processing failed: ${error.message}`,
        },
      });
      
      // Update payment status to FAILED
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED },
      });
      
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(id: number, updateStatusDto: UpdatePaymentStatusDto) {
    try {
      const { status } = updateStatusDto;
      
      const payment = await this.prisma.payment.findUnique({
        where: { id },
      });
      
      if (!payment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }
      
      // Update payment status
      const updatedPayment = await this.prisma.payment.update({
        where: { id },
        data: { status },
      });
      
      // Log status update
      await this.prisma.paymentLog.create({
        data: {
          payment_id: id,
          status,
          message: `Payment status updated to ${status}`,
        },
      });
      
      // Publish payment status updated event
      this.client.emit('payment.status.updated', {
        payment_id: id,
        order_id: payment.order_id,
        status,
      });
      
      return updatedPayment;
    } catch (error) {
      this.logger.error(`Failed to update payment status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        driverAccount: true,
        paymentLogs: {
          orderBy: { created_at: 'desc' },
        },
      },
    });
    
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    
    return payment;
  }

  /**
   * Get payments by order ID
   */
  async getPaymentsByOrderId(orderId: number) {
    return this.prisma.payment.findMany({
      where: { order_id: orderId },
      include: {
        paymentLogs: {
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get payments by driver ID
   */
  async getPaymentsByDriverId(driverId: number) {
    return this.prisma.payment.findMany({
      where: { driver_id: driverId },
      include: {
        paymentLogs: {
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Handle matches from the matching service and generate payment
   */
  async handleMatchCreated(data: any) {
    try {
      this.logger.log(`Received match created event: ${JSON.stringify(data)}`);
      
      const { order_id, vehicle_id, driver_id } = data;
      
      // Check if payment already exists for this order
      const existingPayment = await this.prisma.payment.findFirst({
        where: { order_id },
      });
      
      if (existingPayment) {
        this.logger.log(`Payment already exists for order ${order_id}, skipping creation`);
        return existingPayment;
      }
      
      // Create a payment for the match
      // Sample amount calculation - in real app this would be based on distance, time, etc.
      // Using Thai Baht (THB) for pricing
      const amount = 3500.00; // 3,500 THB
      
      const paymentData: CreatePaymentDto = {
        order_id,
        amount,
        payment_method: PaymentMethod.QR_CODE,
        driver_id,
      };
      
      const payment = await this.createPayment(paymentData);
      
      this.logger.log(`Created payment ${payment.id} for match between order ${order_id} and vehicle ${vehicle_id}`);
      
      return payment;
    } catch (error) {
      this.logger.error(`Failed to handle match created event: ${error.message}`, error.stack);
      throw error;
    }
  }
}