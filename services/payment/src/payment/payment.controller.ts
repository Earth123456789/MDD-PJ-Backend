// payment/src/payment/payment.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  ParseIntPipe,
  Query,
  NotFoundException,  
  BadRequestException  
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { PriceBreakdown } from '../pricing/pricing.types';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({
    status: 201,
    description: 'The payment has been successfully created.',
  })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    try {
      // First, validate that the order exists
      const orderDetails = await this.paymentService.getOrderDetails(
        createPaymentDto.order_id,
      );
      
      if (!orderDetails) {
        throw new NotFoundException(
          `Order with ID ${createPaymentDto.order_id} not found in matching service`
        );
      }
      
      // Continue with payment creation logic if order exists
      if (!createPaymentDto.amount) {
        const vehicleId = orderDetails?.vehicle_matched;
        // Rest of your existing logic...
      }
  
      return this.paymentService.createPayment(createPaymentDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Handle other errors
      throw new BadRequestException(`Failed to create payment: ${error.message}`);
    }
  }

  @Get('calculate/:orderId')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate price for an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID to calculate price for' })
  @ApiQuery({
    name: 'vehicleType',
    enum: VehicleType,
    description: 'Type of vehicle to use for delivery',
  })
  @ApiResponse({
    status: 200,
    description: 'Price calculation details',
  })
  async calculatePrice(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query('vehicleType') vehicleType: VehicleType,
  ) {
    const priceDetails = await this.paymentService.calculateOrderPrice(
      orderId,
      vehicleType,
    );

    return {
      success: true,
      data: priceDetails,
      message: 'Price calculated successfully',
    };
  }

  @Post(':id/process')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a payment' })
  @ApiResponse({
    status: 200,
    description: 'The payment has been successfully processed.',
  })
  async processPayment(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.processPayment(id);
  }

  @Patch(':id/status')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({
    status: 200,
    description: 'The payment status has been successfully updated.',
  })
  async updatePaymentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdatePaymentStatusDto,
  ) {
    return this.paymentService.updatePaymentStatus(id, updateStatusDto);
  }

  @Get(':id')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Return the payment.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  async getPayment(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.getPaymentById(id);
  }

  @Get('order/:orderId')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments by order ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the payments for an order.',
  })
  async getPaymentsByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.getPaymentsByOrderId(orderId);
  }

  @Get('driver/:driverId')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments by driver ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the payments for a driver.',
  })
  async getPaymentsByDriverId(
    @Param('driverId', ParseIntPipe) driverId: number,
  ) {
    return this.paymentService.getPaymentsByDriverId(driverId);
  }

  @Get('estimate')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get price estimate for a trip' })
  @ApiQuery({ name: 'vehicleType', enum: VehicleType, required: true })
  @ApiQuery({ name: 'startLat', type: Number, required: true })
  @ApiQuery({ name: 'startLng', type: Number, required: true })
  @ApiQuery({ name: 'endLat', type: Number, required: true })
  @ApiQuery({ name: 'endLng', type: Number, required: true })
  @ApiResponse({
    status: 200,
    description: 'Return price estimate for the trip.',
  })
  async getPriceEstimate(
    @Query('vehicleType') vehicleType: VehicleType,
    @Query('startLat') startLat: number,
    @Query('startLng') startLng: number,
    @Query('endLat') endLat: number,
    @Query('endLng') endLng: number,
  ): Promise<{
    success: boolean;
    data: {
      vehicle_type: VehicleType;
      distance_km: number;
      estimated_minutes: number;
      is_surge_time: boolean;
      price_details: PriceBreakdown;
    };
    message: string;
  }> {
    // Calculate distance using the Haversine formula
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(Number(endLat) - Number(startLat));
    const dLon = this.deg2rad(Number(endLng) - Number(startLng));
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(Number(startLat))) *
        Math.cos(this.deg2rad(Number(endLat))) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = parseFloat((R * c).toFixed(2)); // Distance in km

    const pricingCalculator = this.paymentService['pricingCalculator'];
    const estimatedMinutes = pricingCalculator.estimateTravelTime(distanceKm);
    const isSurgeTime = pricingCalculator.isSurgeTime();

    const priceBreakdown = pricingCalculator.calculatePrice({
      vehicleType,
      distanceKm,
      estimatedMinutes,
      isSurgeTime,
    });

    return {
      success: true,
      data: {
        vehicle_type: vehicleType,
        distance_km: distanceKm,
        estimated_minutes: estimatedMinutes,
        is_surge_time: isSurgeTime,
        price_details: priceBreakdown,
      },
      message: 'Price estimated successfully',
    };
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
