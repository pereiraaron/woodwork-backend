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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  getCart(@Req() req: { user: { id: string } }) {
    return this.cartService.getCart(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(@Req() req: { user: { id: string } }, @Body() body: AddToCartDto) {
    return this.cartService.addItem(req.user.id, body);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'productId', description: 'Product ID to remove' })
  @ApiQuery({
    name: 'color',
    required: false,
    description: 'Color variant to remove',
  })
  removeItem(
    @Req() req: { user: { id: string } },
    @Param('productId') productId: string,
    @Query('color') color?: string,
  ) {
    return this.cartService.removeItem(req.user.id, productId, color);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from cart' })
  clearCart(@Req() req: { user: { id: string } }) {
    return this.cartService.clearCart(req.user.id);
  }
}
