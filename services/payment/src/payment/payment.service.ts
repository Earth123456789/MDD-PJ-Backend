// payment/src/payment/payment.service.ts

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
import { PricingParams, PriceBreakdown } from 'src/pricing/pricing.types';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import { VehicleType } from 'src/common/enums/vehicle-type.enum';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

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
   * Create a new payment for an order
   */
  async createPayment(createPaymentDto: CreatePaymentDto) {
    try {
      const { order_id, driver_id, amount, payment_method } = createPaymentDto;

      // Ensure we have an amount - should already be handled by the controller,
      // but this is a safeguard
      const finalAmount = amount || 500; // Default if somehow still missing

      // Create the payment record - explicitly don't set qr_code_url here
      const payment = await this.prisma.payment.create({
        data: {
          order_id,
          amount: finalAmount,
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
      this.logger.error(
        `Failed to create payment: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to create payment: ${error.message}`,
      );
    }
  }

  /**
   * Calculate price for a delivery order
   * @param orderId - The ID of the order to calculate price for
   * @param vehicleType - The type of vehicle used for delivery
   */
  async calculateOrderPrice(
    orderId: number,
    vehicleType: VehicleType,
  ): Promise<any> {
    try {
      // Fetch order details from matching service
      const orderDetails = await this.getOrderDetails(orderId);

      if (!orderDetails) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Extract pickup and dropoff locations
      const { pickup_location, dropoff_location } = orderDetails;

      // Calculate distance using great-circle distance formula (Haversine formula)
      const distanceKm = this.calculateDistance(
        pickup_location.latitude,
        pickup_location.longitude,
        dropoff_location.latitude,
        dropoff_location.longitude,
      );

      // Estimate travel time
      const estimatedMinutes =
        this.pricingCalculator.estimateTravelTime(distanceKm);

      // Check if it's surge time
      const isSurgeTime = this.pricingCalculator.isSurgeTime();

      // Calculate price
      const priceBreakdown = this.pricingCalculator.calculatePrice({
        vehicleType,
        distanceKm,
        estimatedMinutes,
        isSurgeTime,
        hasTolls: false, // Simplified for this example
      });

      return {
        order_id: orderId,
        vehicle_type: vehicleType,
        distance_km: distanceKm,
        estimated_minutes: estimatedMinutes,
        is_surge_time: isSurgeTime,
        price_details: priceBreakdown,
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate price for order ${orderId}: ${error.message}`,
        error.stack,
      );
      throw error;
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
      this.logger.error(
        `Failed to process payment ${paymentId}: ${error.message}`,
        error.stack,
      );

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
  async updatePaymentStatus(
    id: number,
    updateStatusDto: UpdatePaymentStatusDto,
  ) {
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
      this.logger.error(
        `Failed to update payment status: ${error.message}`,
        error.stack,
      );
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
        this.logger.log(
          `Payment already exists for order ${order_id}, skipping creation`,
        );
        return existingPayment;
      }

      // Get order details and vehicle details to calculate price
      const orderDetails = await this.getOrderDetails(order_id);
      const vehicleDetails = await this.getVehicleDetails(vehicle_id);

      if (!orderDetails || !vehicleDetails) {
        throw new Error(
          'Could not retrieve order or vehicle details for price calculation',
        );
      }

      // Calculate price based on order, vehicle, and route details
      const priceCalculation = await this.calculateOrderPrice(
        order_id,
        vehicleDetails.vehicle_type,
      );

      const paymentData: CreatePaymentDto = {
        order_id,
        amount: priceCalculation.price_details.totalAmount,
        payment_method: PaymentMethod.QR_CODE,
        driver_id,
      };

      const payment = await this.createPayment(paymentData);

      // Store price breakdown in payment logs
      await this.prisma.paymentLog.create({
        data: {
          payment_id: payment.id,
          status: 'PRICE_CALCULATED',
          message: `Price calculated for order ${order_id}`,
          metadata: priceCalculation.price_details,
        },
      });

      this.logger.log(
        `Created payment ${payment.id} for match between order ${order_id} and vehicle ${vehicle_id}`,
      );

      return payment;
    } catch (error) {
      this.logger.error(
        `Failed to handle match created event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Utility functions
   */

  // Calculate distance between two points using the Haversine formula
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return parseFloat(distance.toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Get order details from matching service
  async getOrderDetails(orderId: number): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.vehicleMatchingServiceUrl}/matching/order/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${this.configService.get('services.vehicleMatching.apiKey')}`,
            },
          },
        ),
      );

      // If the data structure is different, transform it to what we need
      const data = response.data.data;

      // Ensure pickup_location and dropoff_location have latitude and longitude properties
      if (data && data.pickup_location && !data.pickup_location.latitude) {
        // Handle different location structures
        if (typeof data.pickup_location === 'string') {
          // If it's a string, try to parse it
          try {
            data.pickup_location = JSON.parse(data.pickup_location);
          } catch (e) {
            this.logger.error(`Failed to parse pickup_location: ${e.message}`);
          }
        }

        // If it's still not in the right format, try to extract lat/lng
        if (!data.pickup_location.latitude && data.pickup_location.lat) {
          data.pickup_location.latitude = data.pickup_location.lat;
          data.pickup_location.longitude =
            data.pickup_location.lng || data.pickup_location.lon;
        }
      }

      // Do the same for dropoff location
      if (data && data.dropoff_location && !data.dropoff_location.latitude) {
        if (typeof data.dropoff_location === 'string') {
          try {
            data.dropoff_location = JSON.parse(data.dropoff_location);
          } catch (e) {
            this.logger.error(`Failed to parse dropoff_location: ${e.message}`);
          }
        }

        if (!data.dropoff_location.latitude && data.dropoff_location.lat) {
          data.dropoff_location.latitude = data.dropoff_location.lat;
          data.dropoff_location.longitude =
            data.dropoff_location.lng || data.dropoff_location.lon;
        }
      }

      return data;
    } catch (error) {
      this.logger.error(`Failed to get order details: ${error.message}`);
      return null;
    }
  }

  // Get vehicle details from matching service
  async getVehicleDetails(vehicleId: number): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.vehicleMatchingServiceUrl}/vehicles/${vehicleId}`,
          {
            headers: {
              Authorization: `Bearer ${this.configService.get('services.vehicleMatching.apiKey')}`,
            },
          },
        ),
      );
      const vehicleData = response.data.data;

      // Map the vehicle_type from the matching service to our enum if needed
      if (vehicleData && vehicleData.vehicle_type) {
        // Ensure vehicle_type is a valid enum value
        const vehicleTypeValue = vehicleData.vehicle_type.toUpperCase();
        if (Object.values(VehicleType).includes(vehicleTypeValue)) {
          vehicleData.vehicle_type = vehicleTypeValue;
        } else {
          // Default to CAR if the type is not recognized
          vehicleData.vehicle_type = VehicleType.CAR;
        }
      }

      return vehicleData;
    } catch (error) {
      this.logger.error(`Failed to get vehicle details: ${error.message}`);
      return null;
    }
  }

  // Get driver details from user-driver service
  private async getDriverDetails(driverId: number): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.userDriverServiceUrl}/drivers/${driverId}`,
          {
            headers: {
              Authorization: `Bearer ${this.configService.get('services.userDriver.apiKey')}`,
            },
          },
        ),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to get driver details: ${error.message}`);
      return null;
    }
  }

  // Get vehicle type details from matching service to ensure compatibility
  private async getVehicleTypes(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.vehicleMatchingServiceUrl}/api/vehicle-types`,
          {
            headers: {
              Authorization: `Bearer ${this.configService.get('services.vehicleMatching.apiKey')}`,
            },
          },
        ),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to get vehicle types: ${error.message}`);
      // Return the default types if API call fails
      return Object.values(VehicleType).map((type) => ({
        type,
        description: `${type} vehicle`,
      }));
    }
  }
}
