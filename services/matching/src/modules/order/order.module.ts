// matching/src/modules/order/order.module.ts

import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueService } from 'src/queue/queue.service';
import { WebsocketGateway } from 'src/websocket/websocket.gateway';
import { UserDriverValidationService } from 'src/user-driver-validation.service';
import { HttpModule } from '@nestjs/axios';
// import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

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
    // JwtAuthGuard,
  ],
  exports: [OrderService],
})
export class OrderModule {}
