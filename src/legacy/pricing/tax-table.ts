// Rates from the 2019 tax audit. Shared mutable state; read from everywhere.
export const taxTable: any = {
  GENERAL: 0.07,
  APPAREL: 0.05,
  EXEMPT: 0,
};

export const FREE_SHIPPING_THRESHOLD = 7500;
export const FLAT_SHIPPING = 799;
