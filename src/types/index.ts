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
}

export interface Order {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  serviceCharge: number;
  subtotal: number;
  total: number;
  timestamp: Date;
  status: 'active' | 'completed' | 'cancelled';
  kotPrinted: boolean;
  customerBillPrinted: boolean;
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