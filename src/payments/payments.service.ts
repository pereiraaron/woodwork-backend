import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { Cart, CartDocument } from '../cart/cart.schema';
import { Order, OrderDocument, OrderStatus } from '../orders/order.schema';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private webhookSecret: string;
  private logger = new Logger(PaymentsService.name);

  constructor(
    private configService: ConfigService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
    this.webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
  }

  async createCheckoutSession(
    orderId: string,
    userId: string,
    items: { name: string; price: number; quantity: number; image: string }[],
  ): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: [item.image],
          },
          unit_amount: item.price,
        },
        quantity: item.quantity,
      })),
      metadata: { orderId, userId },
      success_url: `${this.configService.get<string>('CLIENT_URL', 'http://localhost:3000')}/orders?success=true`,
      cancel_url: `${this.configService.get<string>('CLIENT_URL', 'http://localhost:3000')}/cart?cancelled=true`,
    });

    if (!session.url) {
      throw new BadRequestException('Failed to create checkout session');
    }

    return session.url;
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const userId = session.metadata?.userId;

      if (!orderId || !userId) {
        this.logger.warn('Webhook missing metadata');
        return;
      }

      // Verify order exists and belongs to the user
      const existing = await this.orderModel.findById(orderId).lean();
      if (!existing) {
        this.logger.warn(`Webhook references non-existent order ${orderId}`);
        return;
      }

      if (existing.userId !== userId) {
        this.logger.warn(`Webhook userId mismatch for order ${orderId}`);
        return;
      }

      if (existing.stripeSessionId) {
        this.logger.warn(`Duplicate webhook for order ${orderId}, skipping`);
        return;
      }

      await this.orderModel.findByIdAndUpdate(orderId, {
        status: OrderStatus.Confirmed,
        stripeSessionId: session.id,
      });

      await this.cartModel.findOneAndUpdate(
        { userId },
        { $set: { items: [] } },
      );

      this.logger.log(`Order ${orderId} confirmed via Stripe`);
    }
  }
}
