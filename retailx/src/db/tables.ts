// Tables included in backup / restore / "erase everything", in dependency order (parents first).
// Restore deletes in reverse order and inserts in this order.
export const BACKUP_TABLES: string[] = ['settings', 'staff', 'customers', 'products', 'sales', 'sale_items', 'expenses'];
