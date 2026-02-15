import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';

export interface ProductsResponse {
  data: {
    id: string;
    attributes: {
      title: string;
      company: string;
      description: string;
      featured: boolean;
      category: string;
      image: string;
      price: string;
      shipping: boolean;
      colors: string[];
      createdAt: string;
      updatedAt: string;
      publishedAt: string;
    };
  }[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    categories: string[];
    companies: string[];
  };
}

interface ProductLean {
  id: string;
  name: string;
  price: number;
  image: string;
  colors: string[];
  company: string;
  description: string;
  category: string;
  shipping: boolean;
  featured: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async findAll(featured?: boolean): Promise<ProductsResponse> {
    const filter: Record<string, boolean> = {};
    if (featured !== undefined) {
      filter.featured = featured;
    }

    const [products, allCategories, allCompanies, total] = await Promise.all([
      this.productModel.find(filter).select('-_id -__v').lean<ProductLean[]>(),
      this.productModel.distinct('category'),
      this.productModel.distinct('company'),
      this.productModel.countDocuments(filter),
    ]);

    const data = products.map((p) => ({
      id: p.id,
      attributes: {
        title: p.name,
        company: p.company,
        description: p.description,
        featured: p.featured,
        category: p.category,
        image: p.image,
        price: String(p.price),
        shipping: p.shipping,
        colors: p.colors,
        createdAt: p.createdAt?.toISOString() ?? '',
        updatedAt: p.updatedAt?.toISOString() ?? '',
        publishedAt: p.publishedAt?.toISOString() ?? '',
      },
    }));

    return {
      data,
      meta: {
        pagination: {
          page: 1,
          pageSize: total,
          pageCount: 1,
          total,
        },
        categories: ['all', ...allCategories.sort()],
        companies: ['all', ...allCompanies.sort()],
      },
    };
  }

  async findOne(productId: string): Promise<Product> {
    const product = await this.productModel
      .findOne({ id: productId })
      .select('-_id -__v -image')
      .lean();

    if (!product) {
      throw new NotFoundException(`Product with id "${productId}" not found`);
    }

    return product;
  }
}
