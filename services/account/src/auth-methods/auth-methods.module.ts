import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMethodsService } from './auth-methods.service';
import { AuthMethodsController } from './auth-methods.controller';
import { AuthMethod } from './entities/auth-method.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuthMethod])],
  controllers: [AuthMethodsController],
  providers: [AuthMethodsService],
  exports: [AuthMethodsService],
})
export class AuthMethodsModule {}
