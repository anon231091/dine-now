// packages/database/src/utils/transforms.ts
/**
 * Utility functions to handle null/undefined transformations between database and TypeScript types
 */

/**
 * Transform null values to undefined recursively
 */
function nullToUndefined<T>(obj: T): T {
  if (obj === null) {
    return undefined as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(nullToUndefined) as T;
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result = {} as T;
    for (const [key, value] of Object.entries(obj)) {
      (result as any)[key] = nullToUndefined(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * Transform database row to match TypeScript types
 */
export function transformDatabaseRow<T>(row: any): T {
  return nullToUndefined(row) as T;
}

/**
 * Transform array of database rows
 */
export function transformDatabaseRows<T>(rows: any[]): T[] {
  return rows.map(item => transformDatabaseRow<T>(item));
}

/**
 * Transform database decimal strings to numbers
 */
function decimalToNumber(value: string | null): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Transform database row with decimal conversion
 */
export function transformDatabaseRowWithDecimals<T>(row: any): T {
  const transformed = nullToUndefined(row);
  
  // Convert common decimal fields
  if (transformed && typeof transformed === 'object') {
    const result = { ...transformed };
    
    // Convert price fields
    if ('price' in result && typeof result.price === 'string') {
      result.price = decimalToNumber(result.price) || 0;
    }
    
    // Convert amount fields
    if ('totalAmount' in result && typeof result.totalAmount === 'string') {
      result.totalAmount = decimalToNumber(result.totalAmount) || 0;
    }
    
    if ('unitPrice' in result && typeof result.unitPrice === 'string') {
      result.unitPrice = decimalToNumber(result.unitPrice) || 0;
    }
    
    if ('subtotal' in result && typeof result.subtotal === 'string') {
      result.subtotal = decimalToNumber(result.subtotal) || 0;
    }
    
    return result as T;
  }
  
  return transformed as T;
}
