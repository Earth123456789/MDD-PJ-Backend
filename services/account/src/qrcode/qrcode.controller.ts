import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QrcodeService } from './qrcode.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('qrcode')
@Controller('qrcode')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QrcodeController {
  constructor(
    private readonly qrcodeService: QrcodeService,
    private readonly bankAccountsService: BankAccountsService,
  ) {}

  @Get('bank-account/:id')
  @ApiOperation({ summary: 'Generate QR code for a bank account' })
  @ApiResponse({ status: 200, description: 'QR code data URL' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'id', type: 'number', description: 'Bank account ID' })
  async generateBankAccountQRCode(
    @Param('id') id: string,
    @CurrentUser() user,
  ) {
    // Check if the bank account exists and belongs to the user
    const bankAccount = await this.bankAccountsService.findOne(+id);

    // Check permissions (admin or account owner)
    const isAdmin = user.roles?.includes('admin');
    const isOwner = bankAccount.customer.user_id === user.id;

    if (!isAdmin && !isOwner) {
      throw new NotFoundException('Bank account not found'); // Using NotFoundException for security
    }

    // Generate QR code
    const qrCodeDataUrl = await this.qrcodeService.generateBankAccountQRCode(
      bankAccount.id,
      bankAccount.account_number,
    );

    return { qrCodeDataUrl };
  }

  @Get('verify')
  @Roles('customer', 'admin', 'delivery')
  @ApiOperation({ summary: 'Verify a QR code token' })
  @ApiResponse({ status: 200, description: 'QR code verified successfully' })
  @ApiResponse({ status: 404, description: 'Invalid QR code' })
  @ApiQuery({ name: 'token', type: 'string', description: 'QR code token' })
  async verifyQRCode(@Query('token') token: string) {
    // In a real application, you would validate the token here
    // For this example, we'll just return success
    return {
      verified: true,
      message: 'QR code verified successfully',
    };
  }
}
