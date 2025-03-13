import { registerAs } from '@nestjs/config';

interface AuthConfig {
  jwtSecret: string;
  jwtExpiration: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiration: string;
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  sms: {
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioPhoneNumber: string;
  };
}

export default registerAs(
  'auth',
  (): AuthConfig => ({
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiration: process.env.JWT_EXPIRATION || '1d',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
    },
    sms: {
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },
  }),
);
