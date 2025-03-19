import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketDocController } from './websocket-doc.controller';
import { WebsocketApiController } from './websocket-api.controller';

@Module({
  controllers: [WebsocketDocController, WebsocketApiController],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
