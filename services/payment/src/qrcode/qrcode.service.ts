import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as generatePayload from 'promptpay-qr';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);
  private readonly userDriverServiceUrl: string;
  private readonly DEFAULT_PHONE_NUMBER: string;

  constructor(private configService: ConfigService) {
    this.userDriverServiceUrl =
      this.configService.get<string>('services.userDriver.url') ||
      'http://localhost:3001';

    this.DEFAULT_PHONE_NUMBER =
      this.configService.get<string>('promptPay.defaultPhoneNumber') ||
      '0891234567';
  }

  /**
   * Get all drivers to validate driver ID
   * @returns List of drivers
   */
  private async getAllDrivers(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.userDriverServiceUrl}/api/drivers`
      );

      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      this.logger.warn(`Failed to fetch drivers: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if driver ID exists
   * @param driverId Driver ID to check
   * @returns Boolean indicating if driver exists
   */
  private async isValidDriverId(driverId: string): Promise<boolean> {
    const drivers = await this.getAllDrivers();
    return drivers.some(driver => driver.id === driverId);
  }

  /**
   * Get driver details from user-driver service
   * @param driverId The driver ID
   * @returns The driver details or null
   */
  async getDriverDetails(driverId: string): Promise<any> {
    try {
      // First, check if driver ID exists
      const isValid = await this.isValidDriverId(driverId);
      if (!isValid) {
        this.logger.warn(`Driver ID ${driverId} not found`);
        return null;
      }

      const response = await axios.get(
        `${this.userDriverServiceUrl}/api/drivers/${driverId}`,
      );

      // Check if the response has the expected structure
      if (
        response.data &&
        response.data.success &&
        response.data.data &&
        response.data.data.user
      ) {
        return response.data.data.user;
      }

      this.logger.warn(
        `Driver details not found for driver ${driverId}, using default`,
      );
      return null;
    } catch (error) {
      this.logger.warn(
        `Failed to get driver details from API: ${error.message}, using default`,
      );
      return null;
    }
  }

  /**
   * Get driver phone number from user-driver service
   * @param driverId The driver ID
   * @returns The driver's phone number
   */
  async getDriverPhoneNumber(driverId: string): Promise<string> {
    // First, check if driver exists
    const isValid = await this.isValidDriverId(driverId);
    if (!isValid) {
      this.logger.warn(`Driver ID ${driverId} not found, using default phone number`);
      return this.DEFAULT_PHONE_NUMBER;
    }

    // First, try to get driver details
    const driverDetails = await this.getDriverDetails(driverId);

    // If driver details found and phone exists
    if (driverDetails && driverDetails.phone) {
      // Clean the phone number (remove spaces, dashes, etc.)
      const phone = driverDetails.phone.replace(/[^0-9]/g, '');

      // Make sure it's a valid Thai phone number (should be 10 digits starting with 0)
      if (phone.match(/^0\d{9}$/)) {
        this.logger.log(`Using phone number ${phone} for driver ${driverId}`);
        return phone;
      } else {
        this.logger.warn(
          `Invalid Thai phone number format for driver ${driverId}, using default`,
        );
      }
    }

    // Use default phone number
    this.logger.warn(
      `No valid phone number found for driver ${driverId}, using default: ${this.DEFAULT_PHONE_NUMBER}`
    );

    return this.DEFAULT_PHONE_NUMBER;
  }

  /**
   * Generate a PromptPay QR code for a payment
   * @param paymentId The payment ID
   * @param amount The payment amount
   * @param driverId The driver ID (optional)
   * @returns The base64 encoded QR code data
   */
  async generatePromptpayQrCode(
    paymentId: string,
    amount: number,
    driverId: string | null,
  ): Promise<string> {
    try {
      const phoneNumber = driverId 
        ? await this.getDriverPhoneNumber(driverId)
        : this.DEFAULT_PHONE_NUMBER;

      const payload = generatePayload(phoneNumber, { amount });

      const qrCodeData = await new Promise<string>((resolve, reject) => {
        QRCode.toDataURL(
          payload,
          {
            type: 'image/png',
            width: 300,
            margin: 4,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          },
          (err, url) => {
            if (err) reject(err);
            else resolve(url);
          },
        );
      });

      this.logger.log(
        `Generated PromptPay QR code for payment ${paymentId} to driver ${driverId || 'default'}`,
      );
      return qrCodeData;
    } catch (error) {
      this.logger.error(
        `Failed to generate PromptPay QR code: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to generate PromptPay QR code: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify a QR code scan
   * @param scanData The data from the QR code scan
   * @returns Whether the scan is valid
   */
  async verifyQrCodeScan(
    scanData: string,
  ): Promise<{ valid: boolean; paymentId?: string }> {
    try {
      // For PromptPay, verification would typically be handled by a bank or payment provider
      // Since we don't have direct access to those systems, we'll simulate verification
      // In a real application, you would integrate with a payment processor or bank API

      // Extract payment ID from a custom field in the scan data
      // Update regex to match UUIDs instead of just digits
      const match = scanData.match(/REF([a-f0-9-]+)/i);
      if (!match || !match[1]) {
        this.logger.warn(`Invalid QR code scan data: ${scanData}`);
        return { valid: false };
      }

      const paymentId = match[1];
      
      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        this.logger.warn(`Invalid payment ID format in QR code: ${paymentId}`);
        return { valid: false };
      }

      // In a real implementation, you would verify with a payment gateway
      // For now, we just return success
      this.logger.log(`Valid PromptPay QR code scan for payment ${paymentId}`);
      return { valid: true, paymentId };
    } catch (error) {
      this.logger.error(
        `Failed to verify QR code scan: ${error.message}`,
        error.stack,
      );
      return { valid: false };
    }
  }
}