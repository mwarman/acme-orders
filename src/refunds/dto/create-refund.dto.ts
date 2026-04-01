import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { REFUND_REASONS, type RefundReason } from '../refund-policy.js';

export class RefundLineDto {
  @IsInt()
  orderItemId!: number;

  @IsInt()
  @Min(1)
  qty!: number;

  /** REF-9: put the units back into on-hand stock when the refund completes. */
  @IsOptional()
  @IsBoolean()
  returnToStock?: boolean;
}

export class CreateRefundDto {
  @IsInt()
  orderId!: number;

  @IsIn(REFUND_REASONS)
  reason!: RefundReason;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RefundLineDto)
  lines!: RefundLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
