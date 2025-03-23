import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({
    status: 201,
    description: 'The order has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(@Body() createOrderDto: CreateOrderDto) {
    return {
      success: true,
      data: await this.orderService.create(createOrderDto),
      message: 'Order created successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders with optional filters' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'vehicle_id', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of orders',
  })
  async findAll(
    @Query('status') status?: OrderStatus,
    @Query('user_id') userId?: number,
    @Query('vehicle_id') vehicleId?: number,
  ) {
    return {
      success: true,
      data: await this.orderService.findAll({
        status,
        userId,
        vehicleId,
      }),
      message: 'Orders retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'The order has been found',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id') id: string) {
    const order = await this.orderService.findOne(id);

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data: order,
      message: 'Order retrieved successfully',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'The order has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    try {
      const updatedOrder = await this.orderService.update(id, updateOrderDto);

      return {
        success: true,
        data: updatedOrder,
        message: 'Order updated successfully',
      };
    } catch (error) {
      if (error.message === 'Order not found') {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'The order has been successfully cancelled.',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  async remove(@Param('id') id: string) {
    try {
      await this.orderService.cancel(Number(id));

      return {
        success: true,
        data: null,
        message: 'Order cancelled successfully',
      };
    } catch (error) {
      if (error.message === 'Order not found') {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      } else if (error.message.includes('cannot be cancelled')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'The order status has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    try {
      const updatedOrder = await this.orderService.updateStatus(id, status);

      return {
        success: true,
        data: updatedOrder,
        message: 'Order status updated successfully',
      };
    } catch (error) {
      if (error.message === 'Order not found') {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Post(':id/match')
  @ApiOperation({ summary: 'Match an order with a suitable vehicle' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'The order has been successfully matched.',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found or no suitable vehicle',
  })
  @ApiResponse({ status: 400, description: 'Order cannot be matched' })
  async matchOrder(@Param('id') id: string) {
    try {
      const result = await this.orderService.matchOrder(id);

      return {
        success: true,
        data: result,
        message: result.vehicle_matched
          ? 'Order matched successfully'
          : 'No suitable vehicle found',
      };
    } catch (error) {
      if (error.message === 'Order not found') {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      } else if (error.message.includes('cannot be matched')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get order tracking information' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Order tracking information retrieved',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getTracking(@Param('id') id: string) {
    try {
      const tracking = await this.orderService.getTracking(id);

      return {
        success: true,
        data: tracking,
        message: 'Order tracking retrieved successfully',
      };
    } catch (error) {
      if (error.message === 'Order not found') {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }
}
