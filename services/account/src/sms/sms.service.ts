import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: any = null;

  constructor(private readonly configService: ConfigService) {
    // Only initialize Twilio if valid credentials are provided
    this.initTwilioClient();
  }

  private initTwilioClient(): void {
    try {
      const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
      const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
      
      // Only initialize if we have valid credentials (Twilio account SIDs always start with "AC")
      if (accountSid && authToken && accountSid.startsWith('AC')) {
        // Dynamically import twilio to avoid initialization issues
        import('twilio').then(twilio => {
          this.twilioClient = twilio.default(accountSid, authToken);
          this.logger.log('Twilio client initialized successfully');
        }).catch(err => {
          this.logger.warn(`Could not load Twilio client: ${err.message}`);
        });
      } else {
        this.logger.warn('No valid Twilio credentials found, SMS functionality will be mocked');
      }
    } catch (error) {
      this.logger.warn(`Failed to initialize Twilio client: ${error.message}`);
    }
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    try {
      const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
      const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      
      // Use Twilio in production if client is available
      if (nodeEnv === 'production' && this.twilioClient) {
        await this.twilioClient.messages.create({
          body: message,
          from: fromNumber,
          to,
        });
        
        this.logger.log(`SMS sent to ${to}: ${message}`);
      } else {
        // Mock SMS sending in development environment
        this.logger.debug(`[MOCK SMS] to: ${to}, message: ${message}`);
        
        // For development, let's log the verification code to the console for easier testing
        if (message.includes('verification code')) {
          const code = message.match(/\d{6}/);
          if (code) {
            this.logger.debug(`⭐ VERIFICATION CODE: ${code[0]} ⭐`);
          }
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);
      return false;
    }
  }
}