import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QrCodeService } from './qrcode.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifyQrCodeDto } from './dto/verify-qrcode.dto';

@ApiTags('qr-codes')
@Controller('qr-codes')
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a QR code scan' })
  @ApiResponse({ status: 200, description: 'QR code verification result' })
  async verifyQrCode(@Body() verifyQrCodeDto: VerifyQrCodeDto) {
    return this.qrCodeService.verifyQrCodeScan(verifyQrCodeDto.scanData);
  }

  @Get('generate/promptpay')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a PromptPay QR code for testing' })
  @ApiResponse({ status: 200, description: 'PromptPay QR code generated' })
  @ApiQuery({ name: 'driverId', type: Number, required: true })
  @ApiQuery({ name: 'amount', type: Number, required: true })
  async generateTestPromptPayQr(
    @Query('driverId') driverId: string,
    @Query('amount') amount: string,
  ) {
    const driverIdNum = parseInt(driverId);
    const amountNum = parseFloat(amount);
    
    const qrCodeData = await this.qrCodeService.generatePaymentQrCode(
      999, // Test payment ID
      amountNum,
      driverIdNum,
    );
    
    return { qrCodeData };
  }
}