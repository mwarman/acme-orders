export interface Page<T> {
  items: T[];
  total: number;
}

export function paginate<T>(all: T[], page: number, size: number): Page<T> {
  const start = (page - 1) * size;
  return { items: all.slice(start, start + size), total: all.length };
}
