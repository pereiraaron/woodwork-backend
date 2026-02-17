import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

@Schema()
export class OrderItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  image: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop()
  color: string;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema()
export class LineItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  amount: number;
}

export const LineItemSchema = SchemaFactory.createForClass(LineItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: [LineItemSchema], default: [] })
  lineItems: LineItem[];

  @Prop({ required: true })
  total: number;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.Pending,
    index: true,
  })
  status: OrderStatus;

  @Prop({ index: true })
  stripeSessionId: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1, createdAt: -1 });
