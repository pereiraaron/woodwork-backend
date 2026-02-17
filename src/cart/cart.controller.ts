import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: { user: { id: string } }) {
    return this.cartService.getCart(req.user.id);
  }

  @Post()
  addItem(@Req() req: { user: { id: string } }, @Body() body: AddToCartDto) {
    return this.cartService.addItem(req.user.id, body);
  }

  @Delete(':productId')
  removeItem(
    @Req() req: { user: { id: string } },
    @Param('productId') productId: string,
    @Query('color') color?: string,
  ) {
    return this.cartService.removeItem(req.user.id, productId, color);
  }

  @Delete()
  clearCart(@Req() req: { user: { id: string } }) {
    return this.cartService.clearCart(req.user.id);
  }
}
