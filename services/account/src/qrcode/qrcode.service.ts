import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QrcodeService {
  constructor(private readonly configService: ConfigService) {}

  async generateQRCode(data: string): Promise<string> {
    try {
      // Generate QR code as data URL
      return await QRCode.toDataURL(data);
    } catch (error) {
      throw new Error(`QR Code generation failed: ${error.message}`);
    }
  }

  async generateBankAccountQRCode(
    accountId: number,
    accountNumber: string,
  ): Promise<string> {
    // Create a secure token for the bank account
    const apiBaseUrl = this.configService.get<string>(
      'API_BASE_URL',
      'http://localhost:3001',
    );
    const data = `${apiBaseUrl}/bank-accounts/${accountId}?token=${this.generateSecureToken(accountNumber)}`;

    return this.generateQRCode(data);
  }

  private generateSecureToken(accountNumber: string): string {
    // In a real application, you would use a more secure method
    // This is a simple example that combines accountNumber with timestamp and a secret
    const secret = this.configService.get<string>(
      'JWT_SECRET',
      'default_secret',
    );
    const timestamp = Date.now();
    const token = Buffer.from(
      `${accountNumber}-${timestamp}-${secret}`,
    ).toString('base64');

    return token;
  }
}
