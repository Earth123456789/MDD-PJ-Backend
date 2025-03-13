import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiOAuth2,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SmsVerificationDto } from './dto/sms-verification.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/username/phone and password' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.identifier,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiOAuth2(['profile', 'email'])
  async googleAuth() {
    // This route initiates Google OAuth flow - no implementation needed
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in with Google',
  })
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    const user = req.user;
    const authResponse = await this.authService.login(user);

    // Redirect to frontend with tokens as query parameters
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    return res.redirect(
      `${frontendUrl}/auth/callback?access_token=${authResponse.accessToken}&refresh_token=${authResponse.refreshToken}`,
    );
  }

  @Public()
  @Post('send-sms-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send SMS verification code' })
  @ApiResponse({ status: 200, description: 'SMS verification code sent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendSmsVerification(@Body('phoneNumber') phoneNumber: string) {
    return this.authService.sendSmsVerification(phoneNumber);
  }

  @Public()
  @Post('verify-sms')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify SMS code and login' })
  @ApiResponse({
    status: 200,
    description: 'SMS code verified and user logged in',
  })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  @ApiBody({ type: SmsVerificationDto })
  async verifySmsCode(@Body() verificationDto: SmsVerificationDto) {
    return this.authService.verifySmsCode(verificationDto);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user) {
    return user;
  }
}
