import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Checkout cart and create order' })
  checkout(@Req() req: { user: { id: string } }) {
    return this.ordersService.checkout(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders for current user' })
  getOrders(@Req() req: { user: { id: string } }) {
    return this.ordersService.getOrders(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  getOrder(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.ordersService.getOrder(req.user.id, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  cancelOrder(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.ordersService.cancelOrder(req.user.id, id);
  }
}
