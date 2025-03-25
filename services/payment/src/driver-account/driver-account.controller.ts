import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DriverAccountService } from './driver-account.service';
import { CreateDriverAccountDto } from './dto/create-driver-account.dto';
import { UpdateDriverAccountDto } from './dto/update-driver-account.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('driver-accounts')
@Controller('driver-accounts')
export class DriverAccountController {
  constructor(private readonly driverAccountService: DriverAccountService) {}

  @Post()
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new driver bank account' })
  @ApiResponse({
    status: 201,
    description: 'The driver bank account has been successfully created.',
  })
  async createDriverAccount(
    @Body() createDriverAccountDto: CreateDriverAccountDto,
  ) {
    return this.driverAccountService.createDriverAccount(
      createDriverAccountDto,
    );
  }

  @Get(':id')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get driver bank account by ID' })
  @ApiResponse({ status: 200, description: 'Return the driver bank account.' })
  @ApiResponse({ status: 404, description: 'Driver bank account not found.' })
  async getDriverAccount(@Param('id', ParseIntPipe) id: number) {
    return this.driverAccountService.getDriverAccountById(id);
  }

  @Get('driver/:driverId')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bank accounts for a driver' })
  @ApiResponse({
    status: 200,
    description: 'Return all bank accounts for the driver.',
  })
  async getDriverAccounts(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.driverAccountService.getDriverAccountsByDriverId(driverId);
  }

  @Patch(':id')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a driver bank account' })
  @ApiResponse({
    status: 200,
    description: 'The driver bank account has been successfully updated.',
  })
  async updateDriverAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDriverAccountDto: UpdateDriverAccountDto,
  ) {
    return this.driverAccountService.updateDriverAccount(
      id,
      updateDriverAccountDto,
    );
  }

  @Get('driver/:driverId/transactions')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction history for a driver' })
  @ApiResponse({
    status: 200,
    description: 'Return the transaction history for the driver.',
  })
  async getDriverTransactions(
    @Param('driverId', ParseIntPipe) driverId: number,
  ) {
    return this.driverAccountService.getDriverTransactions(driverId);
  }

  @Get('driver/:driverId/balance')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get account balance for a driver' })
  @ApiResponse({
    status: 200,
    description: 'Return the account balance for the driver.',
  })
  async getDriverBalance(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.driverAccountService.getDriverBalance(driverId);
  }
}
