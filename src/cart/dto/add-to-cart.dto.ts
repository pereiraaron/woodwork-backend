import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ description: 'Product ID to add', example: 'recZkNf2ECmz' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'Quantity to add',
    minimum: 1,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Color variant', example: '#ff0000' })
  @IsString()
  @IsOptional()
  color?: string;
}
