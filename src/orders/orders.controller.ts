import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  checkout(@Req() req: { user: { id: string } }) {
    return this.ordersService.checkout(req.user.id);
  }

  @Get()
  getOrders(@Req() req: { user: { id: string } }) {
    return this.ordersService.getOrders(req.user.id);
  }

  @Get(':id')
  getOrder(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.ordersService.getOrder(req.user.id, id);
  }

  @Patch(':id/cancel')
  cancelOrder(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.ordersService.cancelOrder(req.user.id, id);
  }
}
