// import { Module, Logger } from '@nestjs/common';
// import { JwtModule } from '@nestjs/jwt';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { JwtAuthGuard } from './guards/jwt-auth.guard';
// import { AuthController } from './auth.controller';

// @Module({
//   imports: [
//     JwtModule.registerAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => {
//         const logger = new Logger('JwtModule');
//         const secret = configService.get<string>('jwt.secret') || 'your-secret-key-here';
//         const expiresIn = configService.get<string>('jwt.expiresIn') || '24h';

//         logger.log(`JWT Module configured with secret (length: ${secret.length}) and expiration: ${expiresIn}`);

//         return {
//           secret,
//           signOptions: {
//             expiresIn,
//           },
//         };
//       },
//     }),
//   ],
//   controllers: [AuthController],
//   providers: [JwtAuthGuard],
//   exports: [JwtModule, JwtAuthGuard],
// })
// export class AuthModule {}
