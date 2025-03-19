import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { WebsocketModule } from '../../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
