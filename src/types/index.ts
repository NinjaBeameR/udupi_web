export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  available: boolean;
}

export interface OrderItem extends MenuItem {
  quantity: number;
  isParcel: boolean;
  parcelCharge: number; // New field - amount in rupees for parcel charge per item
}

export interface Order {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  serviceCharge: number;
  parcelCharges: number; // New field - total of all parcel charges
  subtotal: number;
  total: number;
  timestamp: Date;
  status: 'active' | 'completed' | 'cancelled';
  kotPrinted: boolean;
  customerBillPrinted: boolean;
  billNumber?: string; // Daily sequential bill number (001, 002, 003...)
}

export interface Table {
  number: number;
  status: 'available' | 'occupied' | 'reserved';
  currentOrder?: Order;
  lastActivity?: Date;
}

export interface PrintJob {
  id: string;
  type: 'kot' | 'customer_bill' | 'both';
  orderId: string;
  content: string;
  timestamp: Date;
}