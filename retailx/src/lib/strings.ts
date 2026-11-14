// RetailX UI strings (English only).
import { registerDict } from './i18n';

registerDict({
  // navigation
  navRegister: ['Sell'], navProducts: ['Products'], navCustomers: ['Customers'], navHistory: ['History'], navMore: ['More'],
  // setup
  setupTitle: ['Set up your store'], setupSub: ['Create the owner account to get started'], storeName: ['Store name'], ownerPin: ['Owner PIN (4 digits)'],
  confirmOwnerPin: ['Confirm PIN'], loadDemo: ['Load 100 demo products'], startSelling: ['Start selling'], fillAll: ['Please fill in all required fields'],
  // lock
  whoIsThis: ['Enter your PIN'], lockNow: ['Lock now'], logout: ['Log out'],
  // register
  searchProducts: ['Search name, SKU or barcode'], all: ['All'], cart: ['Cart'], items: ['items'], checkout: ['Checkout'], emptyCart: ['Cart is empty'],
  tapToAdd: ['Tap a product to add it'], scan: ['Scan'], scanHint: ['Point the camera at a barcode'], noProductForCode: ['No product with this barcode'],
  cameraDenied: ['Camera permission is needed to scan'], clearCart: ['Clear cart'], subtotal: ['Subtotal'], discount: ['Discount'], tax: ['Tax'], total: ['Total'],
  payment: ['Payment'], cash: ['Cash'], card: ['Card'], split: ['Split'], received: ['Received'], change: ['Change'], exact: ['Exact'],
  customer: ['Customer'], walkIn: ['Walk-in customer'], addCustomer: ['New customer'], completeSale: ['Complete sale'], saleDone: ['Sale completed'],
  printReceipt: ['Print'], sharePdf: ['Share PDF'], newSale: ['New sale'], receipt: ['Receipt'], inStock: ['in stock'], unlimited: ['Unlimited'], outOfStockLabel: ['Out of stock'],
  // errors
  err_cartEmpty: ['The cart is empty'], err_invalidPayment: ['Invalid payment method'], err_invalidLine: ['A cart line is invalid'],
  err_underpaid: ['The amount received is less than the total'], err_outOfStock: ['Not enough stock'], err_productGone: ['A product was removed'],
  err_barcodeExists: ['Another product already uses this barcode'], err_pinTaken: ['This PIN is already used by another staff member'],
  err_lastAdmin: ['At least one active admin is required'], err_pin4: ['PIN must be 4 digits'], err_nameRequired: ['Name is required'],
  err_alreadyRefunded: ['This sale is already refunded'], err_expenseInvalid: ['Enter a valid expense amount'], err_invalidPrice: ['Enter a valid price'], err_notFound: ['Record not found'], err_generic: ['Something went wrong'], err_userLimit: ['Your license allows only {n} active staff accounts'],
  // products
  productsTitle: ['Products'], addProduct: ['Add product'], editProduct: ['Edit product'], name: ['Name'], category: ['Category'], price: ['Price'], costPrice: ['Cost price (optional)'],
  stock: ['Stock'], stockHint: ['Leave empty for unlimited stock'], unit: ['Unit'], barcode: ['Barcode'], sku: ['SKU'], low: ['Low'], out: ['Out'], delete: ['Delete'],
  deleteProductMsg: ['Delete this product? Past sales keep their details.'], noProducts: ['No products yet'], noProductsHint: ['Add your first product or load demo data'],
  // customers
  customersTitle: ['Customers'], editCustomer: ['Edit customer'], notes: ['Notes'], visits: ['visits'], spent: ['Spent'], noCustomers: ['No customers yet'],
  deleteCustomerMsg: ['Delete this customer? Past sales are kept.'],
  // history
  historyTitle: ['Sales history'], today: ['Today'], days7: ['7 days'], days30: ['30 days'], allTime: ['All time'], noSales: ['No sales in this period'],
  refund: ['Refund'], refunded: ['Refunded'], completed: ['Completed'], refundMsg: ['Refund this sale and return items to stock?'], refundDone: ['Sale refunded'],
  exportCsv: ['Export CSV'], cashier: ['Cashier'], date: ['Date'], status: ['Status'], method: ['Method'],
  // reports
  reportsTitle: ['Reports'], revenue: ['Revenue'], sales: ['Sales'], avgSale: ['Average sale'], expenses: ['Expenses'], profit: ['Net (revenue - expenses)'],
  topProducts: ['Top products'], byCategory: ['By category'], revenueTrend: ['Revenue, last 7 days'], reportPdf: ['Share report PDF'], discounts: ['Discounts'], taxCollected: ['Tax collected'],
  // expenses
  expensesTitle: ['Expenses'], addExpense: ['Add expense'], amount: ['Amount'], note: ['Note'], noExpenses: ['No expenses recorded'], deleteExpenseMsg: ['Delete this expense?'],
  // staff
  staffTitle: ['Staff'], addStaff: ['Add staff'], editStaff: ['Edit staff'], role: ['Role'], admin: ['Admin'], cashierRole: ['Cashier'], active: ['Active'], inactive: ['Inactive'],
  newPinOptional: ['New PIN (leave empty to keep)'], pin4Label: ['PIN (4 digits)'], deleteStaffMsg: ['Delete this staff account? Their past sales are kept.'], staffLimit: ['Active staff'],
  // more
  moreTitle: ['More'], storeInfo: ['Store details'], taxRate: ['Tax rate (%)'], lowStockAt: ['Low stock alert at'], receiptFormat: ['Receipt size'],
  thermal80: ['Thermal 80 mm'], thermal58: ['Thermal 58 mm'], a4: ['A4'], myPin: ['Change my PIN'], oldPin: ['Current PIN'], adminOnly: ['Available to admins only'],
  loggedInAs: ['Signed in as'], lowStockAlert: ['Low stock items'],
  // home / design refresh
  navHome: ['Home'], hello: ['Hello'], storeFallback: ['Main store'], todaySales: ["Today's sales"], thisMonth: ['This month'], totalSales: ['Total sales'],
  orders: ['Orders'], netProfit: ['Net profit'], quickActions: ['Quick actions'], sellAction: ['Sale'], vsYesterday: ['vs yesterday'], lowStockItems: ['Low stock items'],
  viewCart: ['View cart'], proceedCheckout: ['Proceed to checkout'], paymentMethod: ['Payment method'], orderSummary: ['Order summary'], clearCartMsg: ['Remove everything from the cart?'],
  continueSelling: ['Continue selling'], seeAll: ['View all'], thisWeek: ['This week'], scanBarcode: ['Scan a barcode…'], securityAccess: ['Security & access'],
  createBackup: ['Create backup'], restoreBackup: ['Restore backup'], backupYourData: ['Back up your data'], backupTagline: ['Keep your business data safe with an encrypted backup.'],
  staffRoleActive: ['Active'], tapToSetup: ['Configure your store details to start using RetailX.'], lockedTitle: ['Enter PIN'], settingsTitle: ['Settings'],
  tagline: ['Smart POS • Better Business'], itemsInCart: ['items in cart'], sellScreenTitle: ['Products'],
});
