// import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { JwtService } from '@nestjs/jwt';
// import { ConfigService } from '@nestjs/config';

// @Injectable()
// export class JwtAuthGuard extends AuthGuard('jwt') {
//   private readonly logger = new Logger(JwtAuthGuard.name);

//   constructor(
//     private readonly jwtService: JwtService,
//     private readonly configService: ConfigService,
//   ) {
//     super();
//   }

//   async canActivate(context: ExecutionContext) {
//     // For REST endpoints
//     const request = context.switchToHttp().getRequest();
//     const token = this.extractTokenFromHeader(request);

//     if (!token) {
//       this.logger.warn('JWT token is missing in the request');
//       throw new UnauthorizedException('JWT token is missing');
//     }

//     try {
//       // Get secret from configuration
//       const secret = this.configService.get<string>('jwt.secret') || 'your-secret-key-here';

//       // Add debug logging
//       this.logger.debug(`Validating token: ${token.substring(0, 15)}...`);
//       this.logger.debug(`Using secret: ${secret.substring(0, 5)}...`);

//       // Regular JWT token should have 3 parts separated by dots
//       if (!token.includes('.')) {
//         this.logger.warn('Malformed JWT token: Missing dots');
//         throw new UnauthorizedException('Malformed JWT token');
//       }

//       // Verify the token
//       const payload = this.jwtService.verify(token, { secret });

//       // Log success
//       this.logger.debug(`JWT verification successful for user: ${payload.email}`);

//       // Attach the user to the request
//       request.user = payload;
//       return true;
//     } catch (error) {
//       this.logger.error(`JWT verification error: ${error.message}`);
//       throw new UnauthorizedException('Invalid JWT token');
//     }
//   }

//   private extractTokenFromHeader(request: any): string | undefined {
//     const [type, token] = request.headers.authorization?.split(' ') ?? [];
//     return type === 'Bearer' ? token : undefined;
//   }
// }
