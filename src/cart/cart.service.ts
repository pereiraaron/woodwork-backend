import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/product.schema';
import { Cart, CartDocument } from './cart.schema';

const MAX_CART_ITEMS = 5;
const MAX_ITEM_QUANTITY = 10;

interface AddToCartDto {
  productId: string;
  quantity?: number;
  color?: string;
}

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async getCart(
    userId: string,
  ): Promise<{ userId: string; items: Cart['items'] }> {
    const cart = await this.cartModel.findOne({ userId }).lean();
    return { userId, items: cart?.items ?? [] };
  }

  async addItem(userId: string, dto: AddToCartDto): Promise<Cart> {
    const color = dto.color ?? '';
    const quantity = dto.quantity ?? 1;

    // Look up product for trusted price/name/image
    const product = await this.productModel.findOne({ id: dto.productId });
    if (!product) {
      throw new NotFoundException(`Product "${dto.productId}" not found`);
    }

    if (color && !product.colors.includes(color)) {
      throw new BadRequestException(
        `Invalid color "${color}" for this product`,
      );
    }

    // Try to increment quantity if item already exists (atomic, with max cap)
    const updated = await this.cartModel.findOneAndUpdate(
      {
        userId,
        'items.productId': dto.productId,
        'items.color': color,
        'items.quantity': { $lte: MAX_ITEM_QUANTITY - quantity },
      },
      { $inc: { 'items.$.quantity': quantity } },
      { new: true },
    );

    if (updated) {
      return updated.toObject();
    }

    // Check if item exists but would exceed max quantity
    const existing = await this.cartModel.findOne({
      userId,
      'items.productId': dto.productId,
      'items.color': color,
    });
    if (existing) {
      throw new BadRequestException(
        `Cannot exceed ${MAX_ITEM_QUANTITY} of the same item`,
      );
    }

    // Item doesn't exist — push new item, enforcing max cart size atomically
    const newItem = {
      productId: dto.productId,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
      color,
    };

    try {
      const pushed = await this.cartModel.findOneAndUpdate(
        { userId, [`items.${MAX_CART_ITEMS - 1}`]: { $exists: false } },
        { $push: { items: newItem } },
        { new: true, upsert: true },
      );
      return pushed.toObject();
    } catch (err: unknown) {
      // Duplicate key = cart exists but is full (upsert tried to create a new doc)
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new BadRequestException(
          `Cart cannot have more than ${MAX_CART_ITEMS} items`,
        );
      }
      throw err;
    }
  }

  async removeItem(
    userId: string,
    productId: string,
    color?: string,
  ): Promise<Cart> {
    const pullFilter: Record<string, string> = { productId };
    if (color !== undefined) {
      pullFilter.color = color;
    }

    const cart = await this.cartModel.findOneAndUpdate(
      { userId },
      { $pull: { items: pullFilter } },
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
