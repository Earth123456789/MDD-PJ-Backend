// // src/guards/auth.middleware.ts
// import {
//   Injectable,
//   NestMiddleware,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { Request, Response, NextFunction } from 'express';
// import * as jwt from 'jsonwebtoken';
// import { ConfigService } from '@nestjs/config';

// @Injectable()
// export class AuthMiddleware implements NestMiddleware {
//   constructor(private configService: ConfigService) {}

//   use(req: Request, res: Response, next: NextFunction) {
//     const token = req.headers['authorization']?.split(' ')[1];
//     const secret = this.configService.get<string>('JWT_SECRET');

//     if (!token || !secret) {
//       throw new UnauthorizedException('Missing token or secret');
//     }

//     try {
//       const decoded = jwt.verify(token, secret);
//       (req as any).user = decoded;
//       next();
//     } catch (err) {
//       throw new UnauthorizedException('Invalid token');
//     }
//   }
// }
