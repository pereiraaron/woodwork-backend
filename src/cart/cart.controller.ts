import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: { user: { id: string } }) {
    return this.cartService.getCart(req.user.id);
  }

  @Post()
  addItem(
    @Req() req: { user: { id: string } },
    @Body()
    body: {
      productId: string;
      name: string;
      price: number;
      image: string;
      quantity?: number;
      color?: string;
    },
  ) {
    return this.cartService.addItem(req.user.id, body);
  }

  @Delete(':productId')
  removeItem(
    @Req() req: { user: { id: string } },
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(req.user.id, productId);
  }

  @Delete()
  clearCart(@Req() req: { user: { id: string } }) {
    return this.cartService.clearCart(req.user.id);
  }
}
