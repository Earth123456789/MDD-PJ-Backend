import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';
import { QrCodeService } from 'src/qrcode/qrcode.service';
import { PricingCalculatorService } from 'src/pricing/pricing-calculator.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import { VehicleType } from 'src/common/enums/vehicle-type.enum';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PriceBreakdown } from '../pricing/pricing.types';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly vehicleMatchingServiceUrl: string;
  private readonly userDriverServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private qrCodeService: QrCodeService,
    private pricingCalculator: PricingCalculatorService,
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject('RABBITMQ_SERVICE') private client: ClientProxy,
  ) {
    this.vehicleMatchingServiceUrl =
      this.configService.get<string>('services.vehicleMatching.url') ||
      'http://localhost:3002';
    this.userDriverServiceUrl =
      this.configService.get<string>('services.userDriver.url') ||
      'http://localhost:3001';
  }

  /**
   * Get order details from matching service
   * @param orderId Order ID
   * @returns Order details or null
   */
  public async getOrderDetails(orderId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: { data: any } }>(
          `${this.vehicleMatchingServiceUrl}/matching/order/${orderId}`
        )
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to get order details: ${error.message}`);
      return null;
    }
  }

  /**
   * Create a new payment
   * @param createPaymentDto Payment creation details
   * @returns Created payment
   */
  async createPayment(createPaymentDto: CreatePaymentDto) {
    try {
      const { order_id, driver_id, payment_method } = createPaymentDto;
      let amount: number;

      const orderDetails = await this.getOrderDetails(order_id);

      if (!orderDetails) {
        throw new NotFoundException(`Order with ID ${order_id} not found in matching service`);
      }

      try {
        if (orderDetails.price) {
          amount = orderDetails.price;
          this.logger.log(`Using price ${amount} from matching service for order ${order_id}`);
        } else {
          this.logger.warn(`No price available in order details for order ${order_id}`);
          amount = 500;
        }
      } catch (error) {
        this.logger.warn(`Error determining price: ${error.message}`);
        amount = 500;
      }

      const payment = await this.prisma.payment.create({
        data: {
          order_id,
          amount: amount,
          payment_method: payment_method || PaymentMethod.QR_CODE,
          status: PaymentStatus.PENDING,
          driver_id: driver_id || null, // Use null for optional string IDs
        },
      });

      if (payment.payment_method === PaymentMethod.QR_CODE) {
        const qrCodeUrl = await this.qrCodeService.generatePromptpayQrCode(
          payment.id, // Use string ID directly
          payment.amount, // amount (second argument)
          payment.driver_id // driver_id is now a string or null
        );

        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { qr_code_url: qrCodeUrl },
        });

        payment.qr_code_url = qrCodeUrl;
      }

      await this.prisma.paymentLog.create({
        data: {
          payment_id: payment.id,
          status: 'CREATED',
          message: `Payment created for order ${order_id}`,
          metadata: JSON.parse(JSON.stringify({
            ...createPaymentDto,
            price_source: 'matching_service'
          })),
        },
      });

      this.client.emit('payment.created', {
        payment_id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        status: payment.status,
      });

      return payment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Handle order matched event and create a payment
   * @param data Order matched event data
   */
  async handleMatchCreated(data: any) {
    try {
      this.logger.log(`Processing matched order: ${JSON.stringify(data)}`);

      // Validate required data
      if (!data.order_id || !data.driver_id) {
        throw new Error('Missing required order or driver information');
      }

      // Create payment using the matched order details
      const payment = await this.createPayment({
        order_id: data.order_id,
        driver_id: data.driver_id,
        payment_method: PaymentMethod.QR_CODE,
      });

      this.logger.log(`Payment created for matched order: ${payment.id}`);

      return payment;
    } catch (error) {
      this.logger.error(`Failed to handle matched order: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all payments
   */
  async findAllPayments() {
    return this.prisma.payment.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get payment by ID
   * @param id Payment ID
   */
  async getPaymentById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  /**
   * Update payment status
   * @param id Payment ID
   * @param updateStatusDto Status update details
   */
  async updatePaymentStatus(id: string, updateStatusDto: UpdatePaymentStatusDto) {
    try {
      const updatedPayment = await this.prisma.payment.update({
        where: { id },
        data: {
          status: updateStatusDto.status,
        },
      });

      await this.prisma.paymentLog.create({
        data: {
          payment_id: id,
          status: updateStatusDto.status,
          message: `Payment status updated to ${updateStatusDto.status}`,
          metadata: JSON.parse(JSON.stringify({
            status: updateStatusDto.status
          })),
        },
      });

      return updatedPayment;
    } catch (error) {
      throw new BadRequestException(`Failed to update payment status: ${error.message}`);
    }
  }

  /**
   * Delete a payment
   * @param id Payment ID
   */
  async deletePayment(id: string) {
    try {
      // First, check if payment exists
      await this.getPaymentById(id);

      // Then delete
      return this.prisma.payment.delete({
        where: { id },
      });
    } catch (error) {
      throw new BadRequestException(`Failed to delete payment: ${error.message}`);
    }
  }

  /**
   * Process a payment
   * @param id Payment ID
   */
  async processPayment(id: string) {
    try {
      const payment = await this.getPaymentById(id);

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(`Payment ${id} cannot be processed. Current status: ${payment.status}`);
      }

      // Here you would integrate with a payment gateway
      // For now, we'll just update the status
      const processedPayment = await this.prisma.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.COMPLETED,
        },
      });

      await this.prisma.paymentLog.create({
        data: {
          payment_id: id,
          status: 'PROCESSED',
          message: `Payment ${id} processed successfully`,
        },
      });

      return processedPayment;
    } catch (error) {
      throw new BadRequestException(`Failed to process payment: ${error.message}`);
    }
  }

  /**
   * Calculate order price
   * @param orderId Order ID
   * @param vehicleType Vehicle type
   */
  async calculateOrderPrice(orderId: string, vehicleType: VehicleType): Promise<PriceBreakdown> {
    const orderDetails = await this.getOrderDetails(orderId);

    if (!orderDetails) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Estimate distance and calculate price
    const distanceKm = orderDetails.distance || 0;
    const estimatedMinutes = this.pricingCalculator.estimateTravelTime(distanceKm);
    const isSurgeTime = this.pricingCalculator.isSurgeTime();

    return this.pricingCalculator.calculatePrice({
      vehicleType,
      distanceKm,
      estimatedMinutes,
      isSurgeTime,
    });
  }

  /**
   * Get payments by order ID
   * @param orderId Order ID
   */
  async getPaymentsByOrderId(orderId: string) {
    return this.prisma.payment.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get payments by driver ID
   * @param driverId Driver ID
   */
  async getPaymentsByDriverId(driverId: string) {
    return this.prisma.payment.findMany({
      where: { driver_id: driverId },
      orderBy: { created_at: 'desc' },
    });
  }
}