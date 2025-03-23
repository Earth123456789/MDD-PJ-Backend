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
  ParseIntPipe,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VehicleType, VehicleStatus } from '@prisma/client';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({
    status: 201,
    description: 'The vehicle has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(@Body() createVehicleDto: CreateVehicleDto) {
    return {
      success: true,
      data: await this.vehicleService.create(createVehicleDto),
      message: 'Vehicle created successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles with optional filters' })
  @ApiQuery({ name: 'type', enum: VehicleType, required: false })
  @ApiQuery({ name: 'status', enum: VehicleStatus, required: false })
  @ApiQuery({ name: 'min_weight', required: false })
  @ApiQuery({ name: 'min_volume', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of vehicles',
  })
  async findAll(
    @Query('type') type?: VehicleType,
    @Query('status') status?: VehicleStatus,
    @Query('min_weight') minWeight?: number,
    @Query('min_volume') minVolume?: number,
  ) {
    return {
      success: true,
      data: await this.vehicleService.findAll({
        type,
        status,
        minWeight,
        minVolume,
      }),
      message: 'Vehicles retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle by ID' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  @ApiResponse({
    status: 200,
    description: 'The vehicle has been found',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const vehicle = await this.vehicleService.findOne(id);

    if (!vehicle) {
      throw new HttpException('Vehicle not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data: vehicle,
      message: 'Vehicle retrieved successfully',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  @ApiResponse({
    status: 200,
    description: 'The vehicle has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    try {
      const updatedVehicle = await this.vehicleService.update(
        id,
        updateVehicleDto,
      );

      return {
        success: true,
        data: updatedVehicle,
        message: 'Vehicle updated successfully',
      };
    } catch (error) {
      if (error.message === 'Vehicle not found') {
        throw new HttpException('Vehicle not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  @ApiResponse({
    status: 200,
    description: 'The vehicle has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.vehicleService.remove(id);

      return {
        success: true,
        data: null,
        message: 'Vehicle deleted successfully',
      };
    } catch (error) {
      if (error.message === 'Vehicle not found') {
        throw new HttpException('Vehicle not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update vehicle status' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  @ApiResponse({
    status: 200,
    description: 'The vehicle status has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: VehicleStatus,
  ) {
    try {
      const updatedVehicle = await this.vehicleService.updateStatus(id, status);

      return {
        success: true,
        data: updatedVehicle,
        message: 'Vehicle status updated successfully',
      };
    } catch (error) {
      if (error.message === 'Vehicle not found') {
        throw new HttpException('Vehicle not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'Get all orders assigned to a vehicle' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  @ApiResponse({
    status: 200,
    description: 'List of orders assigned to the vehicle',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async getVehicleOrders(@Param('id', ParseIntPipe) id: number) {
    try {
      const orders = await this.vehicleService.getVehicleOrders(id);

      return {
        success: true,
        data: orders,
        message: 'Vehicle orders retrieved successfully',
      };
    } catch (error) {
      if (error.message === 'Vehicle not found') {
        throw new HttpException('Vehicle not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }
}
