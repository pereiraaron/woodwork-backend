import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class LineItemDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  amount: number;
}

export class CheckoutDto {
  @ApiPropertyOptional({
    description: 'Extra line items (e.g. shipping, gift wrap)',
    type: [LineItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  @IsOptional()
  lineItems?: LineItemDto[];
}
