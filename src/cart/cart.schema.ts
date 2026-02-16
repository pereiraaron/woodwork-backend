import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;

@Schema()
export class CartItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  image: string;

  @Prop({ default: 1, min: 1 })
  quantity: number;

  @Prop()
  color: string;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true })
export class Cart {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({
    type: [CartItemSchema],
    validate: [
      (v: CartItem[]) => v.length <= 5,
      'Cart cannot have more than 5 items',
    ],
  })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
