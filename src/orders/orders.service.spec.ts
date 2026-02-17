import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './order.schema';
import { Cart } from '../cart/cart.schema';
import { Product } from '../products/product.schema';
import { PaymentsService } from '../payments/payments.service';

const VALID_ORDER_ID = new Types.ObjectId().toString();

describe('OrdersService', () => {
  let service: OrdersService;

  const mockCartItems = [
    {
      productId: 'prod1',
      name: 'Chair',
      price: 100,
      image: 'chair.jpg',
      quantity: 2,
      color: 'blue',
    },
    {
      productId: 'prod2',
      name: 'Table',
      price: 250,
      image: 'table.jpg',
      quantity: 1,
      color: '',
    },
  ];

  const mockOrderModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    updateMany: jest.fn().mockResolvedValue(undefined),
  };

  const mockCartModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockProductModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockPaymentsService = {
    createCheckoutSession: jest
      .fn()
      .mockResolvedValue('https://checkout.stripe.com/test'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Cart.name), useValue: mockCartModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkout', () => {
    it('should create an order using current product prices', async () => {
      mockCartModel.findOne.mockResolvedValue({ items: mockCartItems });
      mockProductModel.find.mockResolvedValue([
        {
          id: 'prod1',
          name: 'Chair',
          price: 120,
          image: 'chair.jpg',
          stock: 10,
        },
        {
          id: 'prod2',
          name: 'Table',
          price: 250,
          image: 'table.jpg',
          stock: 5,
        },
      ]);
      mockOrderModel.create.mockResolvedValue({
        _id: 'order123',
        toObject: () => ({
          userId: 'user1',
          items: mockCartItems,
          total: 490,
          status: OrderStatus.Pending,
        }),
      });

      const result = await service.checkout('user1');

      // 120*2 + 250*1 = 490 (no extra line items)
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/test');
      expect(mockOrderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ total: 490, lineItems: [] }),
      );
      // Verify existing pending orders were cancelled
      expect(mockOrderModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user1', status: OrderStatus.Pending },
        { status: OrderStatus.Cancelled },
      );
    });

    it('should throw if cart is empty', async () => {
      mockCartModel.findOne.mockResolvedValue(null);

      await expect(service.checkout('user1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if stock is insufficient', async () => {
      mockCartModel.findOne.mockResolvedValue({ items: mockCartItems });
      mockProductModel.find.mockResolvedValue([
        {
          id: 'prod1',
          name: 'Chair',
          price: 100,
          image: 'chair.jpg',
          stock: 1,
        },
        {
          id: 'prod2',
          name: 'Table',
          price: 250,
          image: 'table.jpg',
          stock: 5,
        },
      ]);

      await expect(service.checkout('user1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOrders', () => {
    it('should return orders sorted by newest first', async () => {
      const mockOrders = [{ userId: 'user1', total: 450 }];
      mockOrderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockOrders),
        }),
      });

      const result = await service.getOrders('user1');

      expect(result).toEqual(mockOrders);
      expect(mockOrderModel.find).toHaveBeenCalledWith({ userId: 'user1' });
    });
  });

  describe('getOrder', () => {
    it('should return a single order', async () => {
      const mockOrder = { userId: 'user1', total: 450 };
      mockOrderModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOrder),
      });

      const result = await service.getOrder('user1', VALID_ORDER_ID);

      expect(result).toEqual(mockOrder);
    });

    it('should throw if order not found', async () => {
      mockOrderModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getOrder('user1', VALID_ORDER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if orderId is not a valid ObjectId', async () => {
      await expect(service.getOrder('user1', 'not-valid')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockOrderModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a pending order', async () => {
      const mockOrder = {
        status: OrderStatus.Pending,
        items: mockCartItems,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({
          userId: 'user1',
          items: mockCartItems,
          total: 450,
          status: OrderStatus.Cancelled,
        }),
      };
      mockOrderModel.findOne.mockResolvedValue(mockOrder);

      const result = await service.cancelOrder('user1', VALID_ORDER_ID);

      expect(result.status).toBe(OrderStatus.Cancelled);
    });

    it('should throw if order is not pending', async () => {
      mockOrderModel.findOne.mockResolvedValue({
        status: OrderStatus.Confirmed,
      });

      await expect(
        service.cancelOrder('user1', VALID_ORDER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if order not found', async () => {
      mockOrderModel.findOne.mockResolvedValue(null);

      await expect(
        service.cancelOrder('user1', VALID_ORDER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if orderId is not a valid ObjectId', async () => {
      await expect(service.cancelOrder('user1', 'not-valid')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockOrderModel.findOne).not.toHaveBeenCalled();
    });
  });
});
