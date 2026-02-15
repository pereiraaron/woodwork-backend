import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart } from './cart.schema';

function createMockCartModel() {
  const model = Object.assign(
    jest.fn().mockImplementation((data: Record<string, unknown>) => ({
      ...data,
      items: (data.items as unknown[]) || [],
      save: jest.fn().mockResolvedValue(undefined),
      toObject() {
        return {
          userId: data.userId,
          items: (this as Record<string, unknown>).items,
        };
      },
    })),
    {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    },
  );
  return model;
}

describe('CartService', () => {
  let service: CartService;
  let cartModel: ReturnType<typeof createMockCartModel>;

  beforeEach(async () => {
    cartModel = createMockCartModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getModelToken(Cart.name), useValue: cartModel },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return existing cart', async () => {
      const cart = { userId: 'user1', items: [{ productId: 'rec1' }] };
      cartModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(cart),
      });

      const result = await service.getCart('user1');

      expect(result.userId).toBe('user1');
      expect(result.items).toHaveLength(1);
    });

    it('should return empty cart if none exists', async () => {
      cartModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getCart('user1');

      expect(result.userId).toBe('user1');
      expect(result.items).toHaveLength(0);
    });
  });

  describe('addItem', () => {
    it('should throw when cart has 5 items and adding a new one', async () => {
      const fullCart = {
        userId: 'user1',
        items: Array.from({ length: 5 }, (_, i) => ({
          productId: `rec${i}`,
          name: `item ${i}`,
          price: 100,
          image: 'img.jpg',
          quantity: 1,
          color: '',
        })),
        save: jest.fn(),
      };

      cartModel.findOne.mockResolvedValue(fullCart);

      await expect(
        service.addItem('user1', {
          productId: 'new-item',
          name: 'new',
          price: 100,
          image: 'img.jpg',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      cartModel.findOneAndUpdate.mockResolvedValue({
        toObject: () => ({ userId: 'user1', items: [] }),
      });

      const result = await service.removeItem('user1', 'rec123');

      expect(result.items).toHaveLength(0);
    });

    it('should return empty cart if cart does not exist', async () => {
      cartModel.findOneAndUpdate.mockResolvedValue(null);

      const result = await service.removeItem('user1', 'rec123');

      expect(result.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should clear all items', async () => {
      cartModel.findOneAndUpdate.mockResolvedValue({
        toObject: () => ({ userId: 'user1', items: [] }),
      });

      const result = await service.clearCart('user1');

      expect(result.items).toHaveLength(0);
    });
  });
});
