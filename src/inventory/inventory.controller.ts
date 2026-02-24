import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsInt } from 'class-validator';
import { Roles } from '../common/roles.decorator.js';
import { RolesGuard } from '../common/roles.guard.js';
import type { StockLevel } from './inventory.repository.js';
import { InventoryService } from './inventory.service.js';

class AdjustStockDto {
  @IsInt()
  delta!: number;
}

@Controller('inventory')
@UseGuards(RolesGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get(':sku')
  @Roles('support', 'admin')
  get(@Param('sku') sku: string): StockLevel {
    return this.inventory.get(sku);
  }

  @Post(':sku/adjust')
  @Roles('admin')
  adjust(@Param('sku') sku: string, @Body() dto: AdjustStockDto): StockLevel {
    return this.inventory.adjust(sku, dto.delta);
  }
}
