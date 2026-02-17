import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

    // Cancel any existing pending orders to prevent orphaned orders
    await this.orderModel.updateMany(
      { userId, status: OrderStatus.Pending },
      { status: OrderStatus.Cancelled },
    );

    const productIds = cart.items.map((item) => item.productId);
    const products = await this.productModel.find({ id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of cart.items) {
      const product = productMap.get(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${item.name}"`);
      }
    }

    // Use current product prices, not stale cart prices
    const orderItems = cart.items.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        productId: item.productId,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: item.quantity,
        color: item.color,
      };
    });

    const total = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

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
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    const order = await this.orderModel
      .findOne({ _id: orderId, userId })
      .lean();

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    return order;
  }

  async cancelOrder(userId: string, orderId: string): Promise<Order> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    const order = await this.orderModel.findOne({ _id: orderId, userId });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    if (order.status !== OrderStatus.Pending) {
      throw new BadRequestException(
        `Cannot cancel order with status "${order.status}"`,
      );
    }

    // Stock restore skipped —I dont want to keep running migrations ro restock
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
