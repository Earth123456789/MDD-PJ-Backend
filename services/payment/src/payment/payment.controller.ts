import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  NotFoundException,
  BadRequestException,
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

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'The payment has been successfully created.' })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    try {
      const orderDetails = await this.paymentService.getOrderDetails(createPaymentDto.order_id);
      if (!orderDetails) {
        throw new NotFoundException(`Order with ID ${createPaymentDto.order_id} not found in matching service`);
      }
      return this.paymentService.createPayment(createPaymentDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create payment: ${error.message}`);
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Return all payments.' })
  async findAllPayments() {
    return this.paymentService.findAllPayments();
  }

  @Get('order/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments by order ID' })
  @ApiParam({ name: 'orderId', description: 'Order UUID', type: String })
  @ApiResponse({ status: 200, description: 'Return the payments for an order.' })
  async getPaymentsByOrderId(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentsByOrderId(orderId);
  }

  @Get('driver/:driverId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments by driver ID' })
  @ApiParam({ name: 'driverId', description: 'Driver UUID', type: String })
  @ApiResponse({ status: 200, description: 'Return the payments for a driver.' })
  async getPaymentsByDriverId(@Param('driverId') driverId: string) {
    return this.paymentService.getPaymentsByDriverId(driverId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment UUID', type: String })
  @ApiResponse({ status: 200, description: 'Return the payment.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  async getPayment(@Param('id') id: string) {
    return this.paymentService.getPaymentById(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment status' })
  @ApiParam({ name: 'id', description: 'Payment UUID', type: String })
  @ApiResponse({ status: 200, description: 'The payment status has been successfully updated.' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdatePaymentStatusDto,
  ) {
    return this.paymentService.updatePaymentStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment UUID', type: String })
  @ApiResponse({ status: 200, description: 'Payment deleted successfully.' })
  async deletePayment(@Param('id') id: string) {
    return this.paymentService.deletePayment(id);
  }

  @Post(':id/process')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a payment' })
  @ApiParam({ name: 'id', description: 'Payment UUID', type: String })
  @ApiResponse({ status: 200, description: 'The payment has been successfully processed.' })
  async processPayment(@Param('id') id: string) {
    return this.paymentService.processPayment(id);
  }

  @Get('calculate/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate price for an order' })
  @ApiParam({ name: 'orderId', description: 'Order UUID', type: String })
  @ApiQuery({
    name: 'vehicleType',
    enum: VehicleType,
    description: 'Type of vehicle to use for delivery',
  })
  @ApiResponse({ status: 200, description: 'Price calculation details' })
  async calculatePrice(
    @Param('orderId') orderId: string,
    @Query('vehicleType') vehicleType: VehicleType,
  ) {
    const priceDetails = await this.paymentService.calculateOrderPrice(orderId, vehicleType);
    return {
      success: true,
      data: priceDetails,
      message: 'Price calculated successfully',
    };
  }

  @Get('estimate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get price estimate for a trip' })
  @ApiQuery({ name: 'vehicleType', enum: VehicleType, required: true })
  @ApiQuery({ name: 'startLat', type: Number, required: true })
  @ApiQuery({ name: 'startLng', type: Number, required: true })
  @ApiQuery({ name: 'endLat', type: Number, required: true })
  @ApiQuery({ name: 'endLng', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Return price estimate for the trip.' })
  async getPriceEstimate(
    @Query('vehicleType') vehicleType: VehicleType,
    @Query('startLat') startLat: number,
    @Query('startLng') startLng: number,
    @Query('endLat') endLat: number,
    @Query('endLng') endLng: number,
  ): Promise<any> {
    const R = 6371;
    const dLat = this.deg2rad(endLat - startLat);
    const dLon = this.deg2rad(endLng - startLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(startLat)) *
        Math.cos(this.deg2rad(endLat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = parseFloat((R * c).toFixed(2));

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
