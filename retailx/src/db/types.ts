export type Role = 'admin' | 'cashier';
export type PayMethod = 'cash' | 'card' | 'split';
export type SaleStatus = 'completed' | 'refunded';
export type ReceiptFormat = 'thermal80' | 'thermal58' | 'a4';

export interface Settings {
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  currency: string;
  language: 'en' | 'ur';
  receiptFooter: string;
  lastBackupAt: number;
  taxRate: number;            // percent
  lowStockThreshold: number;
  nextReceiptSeq: number;
  setupDone: boolean;
  receiptFormat: ReceiptFormat;
}

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'My Store',
  ownerName: '',
  phone: '',
  address: '',
  currency: 'Rs',
  language: 'en',
  receiptFooter: 'Thank you for shopping with us!',
  lastBackupAt: 0,
  taxRate: 0,
  lowStockThreshold: 5,
  nextReceiptSeq: 1,
  setupDone: false,
  receiptFormat: 'thermal80',
};

export interface Staff { id: number; name: string; role: Role; active: boolean; createdAt: number }
export interface Product {
  id: number; name: string; category: string; price: number; cost: number | null; stock: number | null;
  unit: string; barcode: string; sku: string; createdAt: number;
}
export interface Customer { id: number; name: string; phone: string; notes: string; totalSpent: number; visits: number; lastVisit: number | null; createdAt: number }
export interface Sale {
  id: number; number: string; subtotal: number; discount: number; tax: number; total: number; paymentMethod: PayMethod;
  tendered: number | null; customerId: number | null; staffId: number | null; status: SaleStatus; refundedAt: number | null; createdAt: number;
}
export interface SaleItem { id: number; saleId: number; productId: number | null; name: string; category: string; price: number; cost: number | null; qty: number; lineTotal: number }
export interface Expense { id: number; date: string; category: string; amount: number; note: string; staffId: number | null; createdAt: number }

export interface CartLine { productId: number; name: string; price: number; qty: number; unit: string }
export interface NewSale { lines: { productId: number; qty: number; price: number }[]; discount: number; paymentMethod: PayMethod; tendered?: number; customerId?: number | null; staffId?: number | null }
