// matching/src/modules/vehicle/vehicle.module.ts

import { Module } from '@nestjs/common';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { UserDriverValidationService } from '../../user-driver-validation.service';
import { HttpModule } from '@nestjs/axios';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';


@Module({
  imports: [
    HttpModule, // Import HttpModule for making HTTP requests
  ],
  controllers: [VehicleController],
  providers: [
    VehicleService,
    PrismaService,
    QueueService,
    UserDriverValidationService,
    JwtAuthGuard,
  ],
  exports: [VehicleService],
})
export class VehicleModule {}
