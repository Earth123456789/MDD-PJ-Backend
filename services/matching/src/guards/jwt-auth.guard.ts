// import {
//   Injectable,
//   CanActivate,
//   ExecutionContext,
//   UnauthorizedException,
// } from '@nestjs/common';
// import * as jwt from 'jsonwebtoken';

// @Injectable()
// export class JwtAuthGuard implements CanActivate {
//   canActivate(context: ExecutionContext): boolean {
//     const request = context.switchToHttp().getRequest();
//     const authHeader = request.headers['authorization'];

//     if (!authHeader) {
//       throw new UnauthorizedException('Missing Authorization header');
//     }

//     const token = authHeader.split(' ')[1];
//     if (!token) {
//       throw new UnauthorizedException('Invalid token format');
//     }

//     try {
//       const secret = process.env.JWT_SECRET;
//       if (!secret) {
//         throw new Error('JWT_SECRET is not defined in environment variables');
//       }

//       const decoded = jwt.verify(token, secret);

//       request.user = decoded; // แนบ user ไว้ใน req.user
//       return true;
//     } catch (err) {
//       throw new UnauthorizedException('Invalid or expired token');
//     }
//   }
// }
