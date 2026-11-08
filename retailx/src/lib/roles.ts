// What each role may do (enforced in the UI AND, for destructive actions, in the repo). License features are checked on top.
import type { Role } from '../db/types';

export type Action =
  | 'sell' | 'product.edit' | 'customer.edit' | 'customer.delete' | 'sale.refund' | 'sales.viewAll'
  | 'report.view' | 'expense.manage' | 'staff.manage' | 'settings.edit' | 'backup';

const CASHIER: Action[] = ['sell', 'customer.edit'];
export const roleCan = (role: Role | undefined, action: Action): boolean => role === 'admin' || (role === 'cashier' && CASHIER.includes(action));

// action -> license feature that must also be on ('' = no license feature needed)
export const ACTION_FEATURE: Record<Action, string> = {
  sell: 'pos.billing', 'product.edit': 'inventory.manage', 'customer.edit': 'customers.manage', 'customer.delete': 'customers.manage',
  'sale.refund': 'history.returns', 'sales.viewAll': '', 'report.view': 'reports.view', 'expense.manage': 'expenses.manage',
  'staff.manage': 'staff.manage', 'settings.edit': '', backup: 'backup.export',
};
