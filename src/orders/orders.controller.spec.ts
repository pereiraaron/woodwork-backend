import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus } from './order.schema';

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockOrder = {
    userId: 'user1',
    items: [
      {
        productId: 'prod1',
        name: 'Chair',
        price: 100,
        image: 'chair.jpg',
        quantity: 2,
        color: 'blue',
      },
    ],
    total: 200,
    status: OrderStatus.Pending,
  };

  const mockOrdersService = {
    checkout: jest.fn().mockResolvedValue(mockOrder),
    getOrders: jest.fn().mockResolvedValue([mockOrder]),
    getOrder: jest.fn().mockResolvedValue(mockOrder),
    cancelOrder: jest.fn().mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.Cancelled,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /orders — should checkout cart', async () => {
    const req = { user: { id: 'user1' } };
    const dto = { lineItems: [{ name: 'Shipping', amount: 999 }] };
    const result = await controller.checkout(req, dto);

    expect(result).toEqual(mockOrder);
    expect(mockOrdersService.checkout).toHaveBeenCalledWith('user1', [
      { name: 'Shipping', amount: 999 },
    ]);
  });

  it('GET /orders — should return user orders', async () => {
    const req = { user: { id: 'user1' } };
    const result = await controller.getOrders(req);

    expect(result).toEqual([mockOrder]);
    expect(mockOrdersService.getOrders).toHaveBeenCalledWith('user1');
  });

  it('GET /orders/:id — should return single order', async () => {
    const req = { user: { id: 'user1' } };
    const result = await controller.getOrder(req, 'order1');

    expect(result).toEqual(mockOrder);
    expect(mockOrdersService.getOrder).toHaveBeenCalledWith('user1', 'order1');
  });

  it('PATCH /orders/:id/cancel — should cancel order', async () => {
    const req = { user: { id: 'user1' } };
    const result = await controller.cancelOrder(req, 'order1');

    expect(result.status).toBe(OrderStatus.Cancelled);
    expect(mockOrdersService.cancelOrder).toHaveBeenCalledWith(
      'user1',
      'order1',
    );
  });
});
