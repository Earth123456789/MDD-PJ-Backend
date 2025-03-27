// matching/src/modules/matching/matching.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchingRequestDto } from './dto/matching-request.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  // ApiBearerAuth,
} from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

@ApiTags('matching')
@Controller('matching')
// @ApiBearerAuth('JWT-auth')
export class MatchingController {
  private readonly logger = new Logger(MatchingController.name);

  constructor(private readonly matchingService: MatchingService) {}

  @Post('order/:orderId')
  @ApiOperation({
    summary: 'Match a single order with the best available vehicle',
  })
  @ApiParam({ name: 'orderId', description: 'The ID of the order to match' })
  @ApiResponse({
    status: 200,
    description: 'Order successfully matched with a vehicle',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found or no suitable vehicle available',
  })
  async matchOrderWithVehicle(@Param('orderId') orderId: string) {
    try {
      const matchedOrder =
        await this.matchingService.matchOrderWithVehicle(orderId);

      if (!matchedOrder) {
        throw new HttpException(
          'No suitable vehicle found for the order',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: {
          orderId: matchedOrder.id,
          vehicleId: matchedOrder.vehicle_matched,
          status: matchedOrder.status,
        },
        message: 'Order successfully matched with a vehicle',
      };
    } catch (error) {
      this.logger.error(`Error matching order ${orderId}: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred during the matching process',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('order/:orderId/start')
  @ApiOperation({
    summary: 'Start delivery for an order (change to IN_TRANSIT)',
  })
  @ApiParam({
    name: 'orderId',
    description: 'The ID of the order to start delivery for',
  })
  @ApiResponse({
    status: 200,
    description: 'Order delivery started successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found or no suitable vehicle available',
  })
  async startDelivery(@Param('orderId') orderId: string) {
    try {
      const updatedOrder = await this.matchingService.startDelivery(orderId);

      if (!updatedOrder) {
        throw new HttpException(
          'Order not found or not in correct status',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: {
          orderId: updatedOrder.id,
          vehicleId: updatedOrder.vehicle_matched,
          status: updatedOrder.status,
        },
        message: 'Order delivery started successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error starting delivery for order ${orderId}: ${error.message}`,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred during the delivery start process',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('order/:orderId/complete')
  @ApiOperation({
    summary: 'Complete delivery for an order (change to DELIVERED)',
  })
  @ApiParam({
    name: 'orderId',
    description: 'The ID of the order to complete delivery for',
  })
  @ApiResponse({
    status: 200,
    description: 'Order delivery completed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found or not in correct status',
  })
  async completeDelivery(@Param('orderId') orderId: string) {
    try {
      const updatedOrder = await this.matchingService.completeDelivery(orderId);

      if (!updatedOrder) {
        throw new HttpException(
          'Order not found or not in correct status',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: {
          orderId: updatedOrder.id,
          vehicleId: updatedOrder.vehicle_matched,
          status: updatedOrder.status,
        },
        message: 'Order delivery completed successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error completing delivery for order ${orderId}: ${error.message}`,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred during the delivery completion process',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('order/:orderId/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
  })
  @ApiParam({ name: 'orderId', description: 'The ID of the order to cancel' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async cancelOrder(@Param('orderId') orderId: string) {
    try {
      const updatedOrder = await this.matchingService.cancelOrder(orderId);

      if (!updatedOrder) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: {
          orderId: updatedOrder.id,
          status: updatedOrder.status,
        },
        message: 'Order cancelled successfully',
      };
    } catch (error) {
      this.logger.error(`Error cancelling order ${orderId}: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred during the order cancellation process',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('batch')
  @ApiOperation({ summary: 'Process batch matching for multiple orders' })
  @ApiBody({ type: MatchingRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Batch matching process completed',
  })
  async processBatchMatching(@Body() dto: MatchingRequestDto) {
    try {
      const results = await this.matchingService.processBatchMatching(dto);

      return {
        success: true,
        data: results,
        message: 'Batch matching process completed',
      };
    } catch (error) {
      this.logger.error(`Error processing batch matching: ${error.message}`);

      throw new HttpException(
        'An error occurred during the batch matching process',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'orderId', description: 'The ID of the order to retrieve' })
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async getOrder(@Param('orderId') orderId: string) {
    try {
      const order = await this.matchingService.getOrderById(orderId);

      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: order,
        message: 'Order details retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Error retrieving order ${orderId}: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'An error occurred while retrieving order details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders with optional filters' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
  })
  async getOrders(
    @Query('status') status?: OrderStatus,
    @Query('vehicleId') vehicleId?: string,
    @Query('userId') userId?: string,
  ) {
    try {
      const orders = await this.matchingService.getAllOrders(
        status,
        vehicleId ? parseInt(vehicleId, 10) : undefined,
        userId ? parseInt(userId, 10) : undefined,
      );

      return {
        success: true,
        data: orders,
        message: 'Orders retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Error retrieving orders: ${error.message}`);

      throw new HttpException(
        'An error occurred while retrieving orders',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get matching algorithm statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getMatchingStats() {
    // In a real implementation, this would retrieve statistics from a database or cache
    return {
      success: true,
      data: {
        totalMatches: 1250,
        successfulMatches: 1150,
        failedMatches: 100,
        averageMatchingTime: '1.5s',
        matchingSuccessRate: '92%',
      },
      message: 'Statistics retrieved successfully',
    };
  }
}
