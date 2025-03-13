import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthMethodsService } from '../auth-methods/auth-methods.service';
import { SmsService } from '../sms/sms.service';
import { User } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterDto } from './dto/register.dto';
import { SmsVerificationDto } from './dto/sms-verification.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authMethodsService: AuthMethodsService,
    private readonly smsService: SmsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(identifier: string, password: string): Promise<any> {
    // Determine if identifier is email, username, or phone
    let user: User | null = null;

    // Try to find by email
    if (identifier.includes('@')) {
      user = await this.usersService.findByEmail(identifier);
    }
    // Try to find by username
    else if (!identifier.match(/^\+?[0-9]+$/)) {
      user = await this.usersService.findByUsername(identifier);
    }
    // Try to find by phone
    else {
      user = await this.usersService.findByPhone(identifier);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Don't expose password hash
    const { password_hash, ...result } = user;
    return result;
  }

  async login(user: any) {
    // Prepare payload for JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles ? user.roles.map((role) => role.role_name) : [],
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('auth.jwtSecret'),
      expiresIn: this.configService.get('auth.jwtExpiration'),
    });

    // Generate refresh token
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get('auth.jwtRefreshSecret'),
        expiresIn: this.configService.get('auth.jwtRefreshExpiration'),
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles ? user.roles.map((role) => role.role_name) : [],
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists by email
    const existingUserByEmail = await this.usersService.findByEmail(
      registerDto.email,
    );
    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if user already exists by username if provided
    if (registerDto.username) {
      const existingUserByUsername = await this.usersService.findByUsername(
        registerDto.username,
      );
      if (existingUserByUsername) {
        throw new ConflictException('Username already exists');
      }
    }

    // Check if user already exists by phone if provided
    if (registerDto.phoneNumber) {
      const existingUserByPhone = await this.usersService.findByPhone(
        registerDto.phoneNumber,
      );
      if (existingUserByPhone) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const newUser = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      username: registerDto.username,
      phoneNumber: registerDto.phoneNumber,
    });

    // Create local auth method
    await this.authMethodsService.create({
      userId: newUser.id,
      authType: 'LOCAL',
      authIdentifier: newUser.email,
    });

    // Generate and send SMS verification code if phone is provided
    if (registerDto.phoneNumber) {
      await this.sendSmsVerification(registerDto.phoneNumber);
    }

    // Return user data without sensitive info
    const { password_hash, ...userData } = newUser;
    return userData;
  }

  async registerWithGoogle(profile: any) {
    // Check if user already exists by Google ID
    const existingAuthMethod =
      await this.authMethodsService.findByTypeAndIdentifier(
        'GOOGLE',
        profile.id,
      );

    if (existingAuthMethod) {
      // User already exists, return user
      return existingAuthMethod.user;
    }

    // Check if user exists by email
    const existingUserByEmail = await this.usersService.findByEmail(
      profile.emails[0].value,
    );

    if (existingUserByEmail) {
      // Add Google auth method to existing user
      await this.authMethodsService.create({
        userId: existingUserByEmail.id,
        authType: 'GOOGLE',
        authIdentifier: profile.id,
      });

      return existingUserByEmail;
    }

    // Create new user
    const randomPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const newUser = await this.usersService.create({
      email: profile.emails[0].value,
      password: hashedPassword,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
    });

    // Create Google auth method
    await this.authMethodsService.create({
      userId: newUser.id,
      authType: 'GOOGLE',
      authIdentifier: profile.id,
    });

    return newUser;
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('auth.jwtRefreshSecret'),
      });

      // Get user
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      // Generate new tokens
      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async sendSmsVerification(phoneNumber: string) {
    // Generate random 6-digit code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // Store verification code in database (this should be implemented with expiration)
    await this.usersService.setVerificationCode(phoneNumber, verificationCode);

    // Send SMS
    await this.smsService.sendSms(
      phoneNumber,
      `Your verification code is: ${verificationCode}`,
    );

    return { success: true, message: 'Verification code sent' };
  }

  async verifySmsCode(verificationDto: SmsVerificationDto) {
    const { phoneNumber, code } = verificationDto;

    // Verify code
    const isCodeValid = await this.usersService.verifyCode(phoneNumber, code);

    if (!isCodeValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Mark phone as verified
    await this.usersService.markPhoneAsVerified(phoneNumber);

    // Get user by phone
    const user = await this.usersService.findByPhone(phoneNumber);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Login user
    return this.login(user);
  }
}
