import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { Order, OrderStatus } from '../orders/order.schema';
import { Cart } from '../cart/cart.schema';

const mockStripeSession = {
  url: 'https://checkout.stripe.com/test',
};

const mockStripeEvent = {
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_123',
      metadata: { orderId: 'order1', userId: 'user1' },
    },
  },
};

const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue(mockStripeSession),
    },
  },
  webhooks: {
    constructEvent: jest.fn().mockReturnValue(mockStripeEvent),
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockOrderModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockCartModel = {
    findOneAndUpdate: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('test-value'),
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Cart.name), useValue: mockCartModel },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    const items = [
      { name: 'Chair', price: 100, quantity: 2, image: 'chair.jpg' },
    ];

    it('should return a checkout URL', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue(mockStripeSession);

      const result = await service.createCheckoutSession(
        'order1',
        'user1',
        items,
      );

      expect(result).toBe('https://checkout.stripe.com/test');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          metadata: { orderId: 'order1', userId: 'user1' },
        }),
      );
    });

    it('should throw if session URL is null', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({ url: null });

      await expect(
        service.createCheckoutSession('order1', 'user1', items),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhook', () => {
    const payload = Buffer.from('test');
    const signature = 'sig_test';

    it('should confirm order and clear cart', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(mockStripeEvent);
      mockOrderModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ stripeSessionId: null }),
      });
      mockOrderModel.findByIdAndUpdate.mockResolvedValue(undefined);
      mockCartModel.findOneAndUpdate.mockResolvedValue(undefined);

      await service.handleWebhook(payload, signature);

      expect(mockOrderModel.findByIdAndUpdate).toHaveBeenCalledWith('order1', {
        status: OrderStatus.Confirmed,
        stripeSessionId: 'cs_test_123',
      });
      expect(mockCartModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user1' },
        { $set: { items: [] } },
      );
    });

    it('should throw on invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.handleWebhook(payload, signature)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip if metadata is missing', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test', metadata: {} } },
      });

      await service.handleWebhook(payload, signature);

      expect(mockOrderModel.findById).not.toHaveBeenCalled();
    });

    it('should skip duplicate webhook events', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(mockStripeEvent);
      mockOrderModel.findById.mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue({ stripeSessionId: 'cs_already_set' }),
      });

      await service.handleWebhook(payload, signature);

      expect(mockOrderModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(mockCartModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should ignore non-checkout events', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: {} },
      });

      await service.handleWebhook(payload, signature);

      expect(mockOrderModel.findById).not.toHaveBeenCalled();
    });
  });
});
