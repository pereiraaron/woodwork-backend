import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

const mockCart = {
  userId: 'user1',
  items: [
    {
      productId: 'rec123',
      name: 'test chair',
      price: 25999,
      image: 'https://example.com/img.jpg',
      quantity: 1,
      color: '#ff0000',
    },
  ],
};

const mockCartService = {
  getCart: jest.fn().mockResolvedValue(mockCart),
  addItem: jest.fn().mockResolvedValue(mockCart),
  removeItem: jest.fn().mockResolvedValue({ userId: 'user1', items: [] }),
  clearCart: jest.fn().mockResolvedValue({ userId: 'user1', items: [] }),
};

describe('CartController', () => {
  let controller: CartController;
  const mockReq = { user: { id: 'user1' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: mockCartService }],
    }).compile();

    controller = module.get<CartController>(CartController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should get cart', async () => {
    const result = await controller.getCart(mockReq);

    expect(result).toEqual(mockCart);
    expect(mockCartService.getCart).toHaveBeenCalledWith('user1');
  });

  it('should add item to cart', async () => {
    const body = {
      productId: 'rec123',
      quantity: 1,
      color: '#ff0000',
    };

    const result = await controller.addItem(mockReq, body);

    expect(result).toEqual(mockCart);
    expect(mockCartService.addItem).toHaveBeenCalledWith('user1', body);
  });

  it('should remove item from cart', async () => {
    const result = await controller.removeItem(mockReq, 'rec123', undefined);

    expect(result.items).toHaveLength(0);
    expect(mockCartService.removeItem).toHaveBeenCalledWith(
      'user1',
      'rec123',
      undefined,
    );
  });

  it('should clear cart', async () => {
    const result = await controller.clearCart(mockReq);

    expect(result.items).toHaveLength(0);
    expect(mockCartService.clearCart).toHaveBeenCalledWith('user1');
  });
});
