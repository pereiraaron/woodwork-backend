import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../cart/cart.schema';
import { PaymentsService } from '../payments/payments.service';
import { Product, ProductDocument } from '../products/product.schema';
import { Order, OrderDocument, OrderStatus } from './order.schema';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private paymentsService: PaymentsService,
  ) {}

  async checkout(
    userId: string,
  ): Promise<{ order: Order; checkoutUrl: string }> {
    const cart = await this.cartModel.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const productIds = cart.items.map((item) => item.productId);
    const products = await this.productModel.find({ id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of cart.items) {
      const product = productMap.get(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${item.name}"`);
      }
    }

    const total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const orderItems = cart.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
      color: item.color,
    }));

    const order = await this.orderModel.create({
      userId,
      items: orderItems,
      total,
    });

    const checkoutUrl = await this.paymentsService.createCheckoutSession(
      String(order._id),
      userId,
      orderItems,
    );

    this.logger.log(
      `Checkout started for user ${userId}, order ${String(order._id)}`,
    );

    return { order: order.toObject(), checkoutUrl };
  }

  async getOrders(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async getOrder(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderModel
      .findOne({ _id: orderId, userId })
      .lean();

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    return order;
  }

  async cancelOrder(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ _id: orderId, userId });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    if (order.status !== OrderStatus.Pending) {
      throw new BadRequestException(
        `Cannot cancel order with status "${order.status}"`,
      );
    }

    // TODO: Stock restore skipped — not an actual purchase workflow
    // for (const item of order.items) {
    //   await this.productModel.updateOne(
    //     { id: item.productId },
    //     { $inc: { stock: item.quantity } },
    //   );
    // }

    order.status = OrderStatus.Cancelled;
    await order.save();

    this.logger.log(`Order ${orderId} cancelled by user ${userId}`);

    return order.toObject();
  }
}
