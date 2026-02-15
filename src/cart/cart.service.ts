import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './cart.schema';

const MAX_CART_ITEMS = 5;

interface AddToCartDto {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity?: number;
  color?: string;
}

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private cartModel: Model<CartDocument>) {}

  async getCart(
    userId: string,
  ): Promise<{ userId: string; items: Cart['items'] }> {
    const cart = await this.cartModel.findOne({ userId }).lean();
    if (!cart) {
      return { userId, items: [] };
    }
    return cart;
  }

  async addItem(userId: string, dto: AddToCartDto): Promise<Cart> {
    let cart = await this.cartModel.findOne({ userId });

    if (!cart) {
      cart = new this.cartModel({ userId, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.productId === dto.productId && item.color === dto.color,
    );

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += dto.quantity ?? 1;
    } else {
      if (cart.items.length >= MAX_CART_ITEMS) {
        throw new BadRequestException(
          `Cart cannot have more than ${MAX_CART_ITEMS} items`,
        );
      }
      cart.items.push({
        productId: dto.productId,
        name: dto.name,
        price: dto.price,
        image: dto.image,
        quantity: dto.quantity ?? 1,
        color: dto.color ?? '',
      });
    }

    await cart.save();
    return cart.toObject();
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    const cart = await this.cartModel.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true },
    );
    return cart?.toObject() ?? ({ userId, items: [] } as Cart);
  }

  async clearCart(userId: string): Promise<Cart> {
    const cart = await this.cartModel.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { new: true },
    );
    return cart?.toObject() ?? ({ userId, items: [] } as Cart);
  }
}
