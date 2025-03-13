import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    // Get JWT secret from config, with a fallback to ensure it's never undefined
    const jwtSecret =
      configService.get<string>('auth.jwtSecret') ||
      configService.get<string>('JWT_SECRET') ||
      'fallback_jwt_secret_for_development';

    if (
      process.env.NODE_ENV === 'production' &&
      jwtSecret === 'fallback_jwt_secret_for_development'
    ) {
      console.warn(
        'WARNING: Using fallback JWT secret in production environment!',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User is inactive or not found');
    }

    return {
      id: user.id,
      email: user.email,
      roles: payload.roles || [],
    };
  }
}
