// matching/src/modules/order/order.module.ts

import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { UserDriverValidationService } from '../../user-driver-validation.service';
import { HttpModule } from '@nestjs/axios';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';


@Module({
  imports: [
    HttpModule, // Import HttpModule for making HTTP requests
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    PrismaService,
    QueueService,
    WebsocketGateway,
    UserDriverValidationService,
    JwtAuthGuard,
  ],
  exports: [OrderService],
})
export class OrderModule {}
