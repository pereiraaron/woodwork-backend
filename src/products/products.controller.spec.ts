import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService, ProductsResponse } from './products.service';

const mockResponse: ProductsResponse = {
  data: [
    {
      id: 'rec123',
      attributes: {
        title: 'test chair',
        company: 'testco',
        description: 'A test product',
        featured: true,
        category: 'office',
        image: 'https://example.com/image.jpeg',
        price: '25999',
        shipping: true,
        colors: ['#ff0000'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        publishedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  ],
  meta: {
    pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 },
    categories: ['all', 'office'],
    companies: ['all', 'testco'],
  },
};

const mockSingleProduct = {
  id: 'rec123',
  name: 'test chair',
  price: 25999,
  images: [{ url: 'https://example.com/image.jpeg' }],
  colors: ['#ff0000'],
  company: 'testco',
  description: 'A test product',
  category: 'office',
  shipping: true,
  featured: false,
  stock: 3,
  reviews: 10,
  stars: 4.5,
};

const mockProductsService = {
  findAll: jest.fn().mockResolvedValue(mockResponse),
  findOne: jest.fn().mockResolvedValue(mockSingleProduct),
};

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return products without filter', async () => {
      const result = await controller.findAll();

      expect(result).toEqual(mockResponse);
      expect(mockProductsService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass featured=true filter', async () => {
      await controller.findAll('true');

      expect(mockProductsService.findAll).toHaveBeenCalledWith(true);
    });

    it('should pass featured=false filter', async () => {
      await controller.findAll('false');

      expect(mockProductsService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      const result = await controller.findOne('rec123');

      expect(result).toEqual(mockSingleProduct);
      expect(mockProductsService.findOne).toHaveBeenCalledWith('rec123');
    });

    it('should propagate NotFoundException', async () => {
      mockProductsService.findOne.mockRejectedValueOnce(
        new NotFoundException(),
      );

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
