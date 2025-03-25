import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as generatePayload from 'promptpay-qr';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);
  private readonly userDriverServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.userDriverServiceUrl = this.configService.get<string>('services.userDriver.url') || 'http://localhost:3001';
  }

  /**
   * Get driver phone number from user-driver service
   * @param driverId The driver ID
   * @returns The driver's phone number
   */
  async getDriverPhoneNumber(driverId: number): Promise<string> {
    try {
      const response = await axios.get(`${this.userDriverServiceUrl}/api/drivers/${driverId}`);
      
      // Check if the response has the expected structure
      // The phone number is in the nested user object
      if (response.data && 
          response.data.success && 
          response.data.data && 
          response.data.data.user && 
          response.data.data.user.phone) {
        
        // Clean the phone number (remove spaces, dashes, etc.)
        const phone = response.data.data.user.phone.replace(/[^0-9]/g, '');
        
        // Make sure it's a valid Thai phone number (should be 10 digits starting with 0)
        if (phone.match(/^0\d{9}$/)) {
          this.logger.log(`Using phone number ${phone} for driver ${driverId}`);
          return phone;
        } else {
          this.logger.warn(`Invalid Thai phone number format for driver ${driverId}, using default`);
        }
      } else {
        this.logger.warn(`Driver phone number not found for driver ${driverId}, using default`);
      }
      
      // Use a default phone number from configuration
      return this.configService.get<string>('promptPay.defaultPhoneNumber') || '0891234567';
    } catch (error) {
      this.logger.warn(`Failed to get driver phone number from API: ${error.message}, using default`);
      // Use a default phone number from configuration
      return this.configService.get<string>('promptPay.defaultPhoneNumber') || '0891234567';
    }
  }

  /**
   * Generate a PromptPay QR code for a payment
   * @param paymentId The payment ID
   * @param amount The payment amount
   * @param driverId The driver ID
   * @returns The base64 encoded QR code data
   */
  async generatePaymentQrCode(paymentId: number, amount: number, driverId: number): Promise<string> {
    try {
      // Get the driver's phone number
      const phoneNumber = await this.getDriverPhoneNumber(driverId);
      
      // Create PromptPay payload
      const payload = generatePayload(phoneNumber, {
        amount, // amount in Thai Baht
      });
      
      // Convert payload to QR code
      const qrCodeData = await new Promise<string>((resolve, reject) => {
        QRCode.toDataURL(payload, {
          type: 'image/png',
          width: 300,
          margin: 4,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        }, (err, url) => {
          if (err) {
            reject(err);
          } else {
            resolve(url);
          }
        });
      });
      
      this.logger.log(`Generated PromptPay QR code for payment ${paymentId} to driver ${driverId}`);
      return qrCodeData;
    } catch (error) {
      this.logger.error(`Failed to generate PromptPay QR code: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to generate PromptPay QR code: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify a QR code scan
   * @param scanData The data from the QR code scan
   * @returns Whether the scan is valid
   */
  async verifyQrCodeScan(scanData: string): Promise<{ valid: boolean; paymentId?: number }> {
    try {
      // For PromptPay, verification would typically be handled by a bank or payment provider
      // Since we don't have direct access to those systems, we'll simulate verification
      // In a real application, you would integrate with a payment processor or bank API
      
      // Extract payment ID from a custom field in the scan data
      const match = scanData.match(/REF(\d+)/);
      if (!match || !match[1]) {
        this.logger.warn(`Invalid QR code scan data: ${scanData}`);
        return { valid: false };
      }
      
      const paymentId = parseInt(match[1], 10);
      if (isNaN(paymentId)) {
        this.logger.warn(`Invalid payment ID in QR code: ${match[1]}`);
        return { valid: false };
      }
      
      // In a real implementation, you would verify with a payment gateway
      // For now, we just return success
      this.logger.log(`Valid PromptPay QR code scan for payment ${paymentId}`);
      return { valid: true, paymentId };
    } catch (error) {
      this.logger.error(`Failed to verify QR code scan: ${error.message}`, error.stack);
      return { valid: false };
    }
  }
}