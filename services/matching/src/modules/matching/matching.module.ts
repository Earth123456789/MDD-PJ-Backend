// matching/src/modules/matching/matching.module.ts

import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { UserDriverValidationService } from '../../user-driver-validation.service';
import { HttpModule } from '@nestjs/axios';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Module({
  imports: [
    HttpModule, // Import HttpModule for making HTTP requests
  ],
  controllers: [MatchingController],
  providers: [
    MatchingService,
    PrismaService,
    QueueService,
    WebsocketGateway,
    UserDriverValidationService,
    JwtAuthGuard,
  ],
  exports: [MatchingService],
})
export class MatchingModule {}
