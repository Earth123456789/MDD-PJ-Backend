import { Module } from '@nestjs/common';
import { OrderService } from '../../modules/order/order.service';
import { OrderController } from '../../modules/order/order.controller';
import { WebsocketModule } from '../../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  providers: [OrderService],
  controllers: [OrderController],
})
export class OrderModule {}
