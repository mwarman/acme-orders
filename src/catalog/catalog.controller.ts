import { Controller, Get, Param } from '@nestjs/common';
import type { Product } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';

/** Public: browsing the catalog needs no identity. */
@Controller('catalog/products')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(): Product[] {
    return this.catalog.list();
  }

  @Get(':sku')
  get(@Param('sku') sku: string): Product {
    return this.catalog.get(sku);
  }
}
