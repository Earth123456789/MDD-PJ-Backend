import { Module, Global } from '@nestjs/common';
import { QueueService } from './queue.service';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Global()
@Module({
  imports: [WebsocketModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
