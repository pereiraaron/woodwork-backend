import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop()
  id: string;

  @Prop()
  name: string;

  @Prop()
  price: number;

  @Prop()
  image: string;

  @Prop({ type: [MongooseSchema.Types.Mixed] })
  images: Record<string, any>[];

  @Prop([String])
  colors: string[];

  @Prop()
  company: string;

  @Prop()
  description: string;

  @Prop()
  category: string;

  @Prop()
  shipping: boolean;

  @Prop()
  featured: boolean;

  @Prop()
  stock: number;

  @Prop()
  reviews: number;

  @Prop()
  stars: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
