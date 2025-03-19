import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Global()
@Module({
  imports: [WebsocketModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
