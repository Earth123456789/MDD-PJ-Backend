import {
  Controller,
  Post,
  Body,
  Param,
  Get,
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
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('matching')
@Controller('matching')
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
