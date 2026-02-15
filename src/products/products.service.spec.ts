import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.schema';

const now = new Date();

const mockProduct = {
  id: 'rec123',
  name: 'test chair',
  price: 25999,
  image: 'https://example.com/image.jpeg',
  images: [{ url: 'https://example.com/image.jpeg' }],
  colors: ['#ff0000'],
  company: 'testco',
  description: 'A test product',
  category: 'office',
  shipping: true,
  featured: true,
  stock: 3,
  reviews: 10,
  stars: 4.5,
  createdAt: now,
  updatedAt: now,
  publishedAt: now,
};

const mockProductModel = {
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([mockProduct]),
    }),
  }),
  findOne: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockProduct),
    }),
  }),
  distinct: jest.fn().mockResolvedValue(['office']),
  countDocuments: jest.fn().mockResolvedValue(1),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: mockProductModel },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return products in Strapi-like format', async () => {
      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('rec123');
      expect(result.data[0].attributes.title).toBe('test chair');
      expect(result.data[0].attributes.price).toBe('25999');
      expect(result.meta.pagination.total).toBe(1);
      expect(result.meta.categories[0]).toBe('all');
      expect(result.meta.companies[0]).toBe('all');
    });

    it('should filter by featured when provided', async () => {
      await service.findAll(true);

      expect(mockProductModel.find).toHaveBeenCalledWith({ featured: true });
    });

    it('should not filter when featured is undefined', async () => {
      await service.findAll();

      expect(mockProductModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return a single product by id', async () => {
      const result = await service.findOne('rec123');

      expect(result).toEqual(mockProduct);
      expect(mockProductModel.findOne).toHaveBeenCalledWith({ id: 'rec123' });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductModel.findOne.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
