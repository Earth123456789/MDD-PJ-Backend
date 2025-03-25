import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { OrderModule } from './modules/order/order.module';
import { MatchingModule } from './modules/matching/matching.module';
import { WebsocketModule } from './websocket/websocket.module';
import { QueueModule } from './queue/queue.module';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    VehicleModule,
    OrderModule,
    MatchingModule,
    WebsocketModule,
    QueueModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
