// import { Controller, Post, Body, Logger } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { ConfigService } from '@nestjs/config';
// import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
// import { LoginDto } from './dto/login.dto';

// @ApiTags('auth')
// @Controller('auth')
// export class AuthController {
//   private readonly logger = new Logger(AuthController.name);

//   constructor(
//     private jwtService: JwtService,
//     private configService: ConfigService
//   ) {}

//   @Post('login')
//   @ApiOperation({ summary: 'Get JWT token for testing' })
//   @ApiResponse({ status: 200, description: 'Login successful' })
//   login(@Body() loginDto: LoginDto) {
//     // For testing/development purposes only
//     // In production, you would verify credentials against your database
//     const payload = {
//       sub: 1,
//       email: loginDto.email || 'test@example.com',
//       role: loginDto.role || 'admin',
//       driverId: loginDto.role === 'driver' ? 1 : undefined
//     };

//     // Get JWT secret from config
//     const secret = this.configService.get<string>('jwt.secret') || 'your-secret-key-here';

//     // Generate token using NestJS JwtService
//     const token = this.jwtService.sign(payload, { secret });

//     // Decode token to get expiration time
//     const decoded = this.jwtService.decode(token);

//     this.logger.debug(`Generated token: ${token.substring(0, 20)}...`);
//     this.logger.debug(`Token will expire at: ${new Date((decoded as any).exp * 1000).toISOString()}`);

//     return {
//       accessToken: token,
//       expiresAt: new Date((decoded as any).exp * 1000).toISOString(),
//       user: {
//         id: 1,
//         email: loginDto.email || 'test@example.com',
//         role: loginDto.role || 'admin'
//       }
//     };
//   }
// }
