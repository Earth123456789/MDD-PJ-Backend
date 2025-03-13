import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@ApiTags('bank-accounts')
@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Post()
  @Roles('admin', 'customer')
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({
    status: 201,
    description: 'The bank account has been successfully created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(
    @Body() createBankAccountDto: CreateBankAccountDto,
    @CurrentUser() user,
  ) {
    // In a real application, you would check permissions here
    return this.bankAccountsService.create(createBankAccountDto);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get all bank accounts' })
  @ApiResponse({ status: 200, description: 'Return all bank accounts.' })
  findAll() {
    return this.bankAccountsService.findAll();
  }

  @Get('customer')
  @Roles('customer', 'admin')
  @ApiOperation({ summary: 'Get bank accounts for current user' })
  @ApiResponse({ status: 200, description: 'Return user bank accounts.' })
  findMyAccounts(@CurrentUser() user) {
    // For a customer, we would get accounts associated with their customer records
    // For now, this is a placeholder implementation
    if (user.roles.includes('admin')) {
      return this.bankAccountsService.findAll();
    } else {
      // Assume the user has a customerId property
      // In a real app, you'd look up the customer ID for this user
      return this.bankAccountsService.findByCustomerId(user.customerId || 0);
    }
  }

  @Get(':id')
  @Roles('customer', 'admin')
  @ApiOperation({ summary: 'Get a bank account by id' })
  @ApiResponse({ status: 200, description: 'Return the bank account.' })
  @ApiResponse({ status: 404, description: 'Bank account not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.bankAccountsService.findOne(+id);
    // In a real application, you would check permissions here
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiResponse({
    status: 200,
    description: 'The bank account has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Bank account not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id') id: string,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    return this.bankAccountsService.update(+id, updateBankAccountDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a bank account' })
  @ApiResponse({
    status: 200,
    description: 'The bank account has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Bank account not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  remove(@Param('id') id: string) {
    return this.bankAccountsService.remove(+id);
  }
}
