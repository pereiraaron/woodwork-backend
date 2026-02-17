import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart } from './cart.schema';
import { Product } from '../products/product.schema';

describe('CartService', () => {
  let service: CartService;

  const mockCartModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockProductModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getModelToken(Cart.name), useValue: mockCartModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return existing cart items', async () => {
      const cart = {
        userId: 'user1',
        items: [{ productId: 'rec1', name: 'Chair', price: 100 }],
      };
      mockCartModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(cart),
      });

      const result = await service.getCart('user1');

      expect(result.userId).toBe('user1');
      expect(result.items).toHaveLength(1);
    });

    it('should return empty items if no cart exists', async () => {
      mockCartModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getCart('user1');

      expect(result.userId).toBe('user1');
      expect(result.items).toHaveLength(0);
    });
  });

  describe('addItem', () => {
    const mockProduct = {
      id: 'prod1',
      name: 'Chair',
      price: 199,
      image: 'chair.jpg',
      colors: ['#ff0000', '#0000ff'],
      stock: 10,
    };

    it('should throw if product not found', async () => {
      mockProductModel.findOne.mockResolvedValue(null);

      await expect(
        service.addItem('user1', { productId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if color is invalid for the product', async () => {
      mockProductModel.findOne.mockResolvedValue(mockProduct);

      await expect(
        service.addItem('user1', { productId: 'prod1', color: '#invalid' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should increment quantity if item already exists', async () => {
      mockProductModel.findOne.mockResolvedValue(mockProduct);
      mockCartModel.findOneAndUpdate.mockResolvedValue({
        toObject: () => ({
          userId: 'user1',
          items: [{ productId: 'prod1', quantity: 2, color: '' }],
        }),
      });

      const result = await service.addItem('user1', { productId: 'prod1' });

      expect(result.items[0].quantity).toBe(2);
      expect(mockCartModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          userId: 'user1',
          'items.productId': 'prod1',
          'items.color': '',
          'items.quantity': { $lte: 9 },
        },
        { $inc: { 'items.$.quantity': 1 } },
        { new: true },
      );
    });

    it('should throw when quantity would exceed max', async () => {
      mockProductModel.findOne.mockResolvedValue(mockProduct);
      // Increment fails (quantity cap filter doesn't match)
      mockCartModel.findOneAndUpdate.mockResolvedValueOnce(null);
      // Existence check finds the item (it exists, just at max qty)
      mockCartModel.findOne.mockResolvedValueOnce({
        items: [{ productId: 'prod1' }],
      });

      await expect(
        service.addItem('user1', { productId: 'prod1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should push new item when not in cart', async () => {
      mockProductModel.findOne.mockResolvedValue(mockProduct);
      // Increment returns null (item not in cart)
      mockCartModel.findOneAndUpdate.mockResolvedValueOnce(null);
      // Existence check returns null (item truly not in cart)
      mockCartModel.findOne.mockResolvedValueOnce(null);
      // Push succeeds
      mockCartModel.findOneAndUpdate.mockResolvedValueOnce({
        toObject: () => ({
          userId: 'user1',
          items: [
            {
              productId: 'prod1',
              name: 'Chair',
              price: 199,
              image: 'chair.jpg',
              quantity: 1,
              color: '',
            },
          ],
        }),
      });

      const result = await service.addItem('user1', { productId: 'prod1' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].price).toBe(199);
      expect(result.items[0].name).toBe('Chair');
    });

    it('should throw when cart is full (duplicate key on upsert)', async () => {
      mockProductModel.findOne.mockResolvedValue(mockProduct);
      // Increment returns null
      mockCartModel.findOneAndUpdate.mockResolvedValueOnce(null);
      // Existence check returns null (item not in cart)
      mockCartModel.findOne.mockResolvedValueOnce(null);
      // Push upsert throws duplicate key (cart exists but is full)
      const dupKeyError = new Error('E11000 duplicate key');
      Object.assign(dupKeyError, { code: 11000 });
      mockCartModel.findOneAndUpdate.mockRejectedValueOnce(dupKeyError);

      await expect(
        service.addItem('user1', { productId: 'prod1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      mockCartModel.findOneAndUpdate.mockResolvedValue({
        toObject: () => ({ userId: 'user1', items: [] }),
      });

      const result = await service.removeItem('user1', 'rec123');

      expect(result.items).toHaveLength(0);
      expect(mockCartModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user1' },
        { $pull: { items: { productId: 'rec123' } } },
        { new: true },
      );
    });

    it('should include color in pull filter when provided', async () => {
      mockCartModel.findOneAndUpdate.mockResolvedValue({
        toObject: () => ({ userId: 'user1', items: [] }),
      });

      await service.removeItem('user1', 'rec123', '#ff0000');

      expect(mockCartModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user1' },
        { $pull: { items: { productId: 'rec123', color: '#ff0000' } } },
        { new: true },
      );
    });

    it('should return empty cart if cart does not exist', async () => {
      mockCartModel.findOneAndUpdate.mockResolvedValue(null);

      const result = await service.removeItem('user1', 'rec123');

      expect(result.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should clear all items', async () => {
      mockCartModel.findOneAndUpdate.mockResolvedValue({
        toObject: () => ({ userId: 'user1', items: [] }),
      });

      const result = await service.clearCart('user1');

      expect(result.items).toHaveLength(0);
    });
  });
});
