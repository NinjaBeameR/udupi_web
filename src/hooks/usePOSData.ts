import { useState, useEffect } from 'react';
import { Table, MenuItem, Order, OrderItem } from '../types';
import { safeRead, safeWrite, safeUpdate, safeDelete, testConnection, supabase } from '../services/supabase';
import { BillNumberService } from '../services/billNumberService';

export function usePOSData() {
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Initialize tables (all available, no mock data)
  useEffect(() => {
    const initialTables: Table[] = Array.from({ length: 14 }, (_, i) => ({
      number: i + 1,
      status: 'available',
      lastActivity: undefined,
    }));
    setTables(initialTables);
  }, []);

  // Test Supabase connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  // Migration (temporary)
  const migrateFromOldTable = async () => {
    try {
      await testConnection();
      console.log('Migrating tables to Supabase...');
      
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
      const { data, error } = await supabase
        .from('tables')
        .select('*');
      
      if (error) {
        console.error('Migration failed:', error.message);
        return;
      }
      
      console.log('Migration successful. Found tables:', data?.length || 0);
    } catch (error) {
      console.error('Migration failed:', error);
    }
  };

  // Clear all orders (manual clear function)
  const clearAllOrders = async () => {
    try {
      console.log('🧹 Clearing all orders...');
      
      // Clear from Supabase
      if (supabase) {
        console.log('🔄 Attempting to clear from completed_orders table...');
        const { error } = await supabase
          .from('completed_orders')
          .delete()
          .neq('id', 'dummy'); // Delete all orders
        
        if (error) {
          console.error('❌ Failed to clear orders from Supabase:', error);
          console.error('Error details:', error.message, error.details, error.hint);
        } else {
          console.log('✅ Cleared all orders from Supabase successfully');
        }
      } else {
        console.log('⚠️ Supabase client not available, skipping database clear');
      }
    } catch (error) {
      console.error('💥 Exception while clearing orders from Supabase:', error);
    }
    
    // Clear local state
    setOrders([]);
    localStorage.removeItem('pos_orders');
    
    // Reset current order if it exists
    if (currentOrder) {
      const freshOrder: Order = {
        id: crypto.randomUUID(),
        tableNumber: currentOrder.tableNumber,
        items: [],
        subtotal: 0,
        total: 0,
        serviceCharge: 0,
        parcelCharges: 0,
        timestamp: new Date(),
        status: 'active',
        kotPrinted: false,
        customerBillPrinted: false
      };
      setCurrentOrder(freshOrder);
    }
    
    // Reset bill counter in localStorage
    const today = new Date().toISOString().split('T')[0];
    localStorage.removeItem(`bill_counter_${today}`);
    
    console.log('🧹 All orders cleared successfully');
  };

  // Automatic midnight clear
  useEffect(() => {
    const scheduleAutoClear = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Set to midnight
      
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      
      console.log(`⏰ Auto-clear scheduled in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes at midnight`);
      
      const timeoutId = setTimeout(() => {
        console.log('🌙 Midnight auto-clear triggered');
        clearAllOrders();
        // Schedule the next clear
        scheduleAutoClear();
      }, timeUntilMidnight);
      
      return timeoutId;
    };
    
    const timeoutId = scheduleAutoClear();
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Load menu items from Supabase
  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        const supabaseMenuItems = await safeRead('menu_items');
        if (supabaseMenuItems && supabaseMenuItems.length > 0) {
          console.log('📋 Loaded menu items from Supabase:', supabaseMenuItems.length);
          setMenuItems(supabaseMenuItems);
        } else {
          console.log('📋 No menu items in Supabase, using local data');
        }
      } catch (error) {
        console.error('Failed to load menu items:', error);
      }
    };

    loadMenuItems();
  }, []);

  // Load saved data from localStorage
  useEffect(() => {
    const savedOrders = localStorage.getItem('pos-orders');
    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders).map((order: any) => ({
          ...order,
          timestamp: new Date(order.timestamp),
        }));
        setOrders(parsedOrders);
      } catch (error) {
        console.error('Failed to load saved orders:', error);
      }
    }
  }, []);

  // Save orders to localStorage
  useEffect(() => {
    localStorage.setItem('pos-orders', JSON.stringify(orders));
  }, [orders]);

  // Update table status when currentOrder changes
  useEffect(() => {
    if (!currentOrder) return;

    setTables(prevTables => prevTables.map(table => {
      if (table.number === currentOrder.tableNumber) {
        // If order has no items, make table available
        if (currentOrder.items.length === 0) {
          return { 
            ...table, 
            status: 'available', 
            currentOrder: undefined, 
            lastActivity: new Date() 
          };
        } else {
          // If order has items, mark table as occupied
          return { 
            ...table, 
            status: 'occupied', 
            currentOrder: currentOrder, 
            lastActivity: new Date() 
          };
        }
      }
      return table;
    }));
  }, [currentOrder]);

  const selectTable = (tableNumber: number) => {
    const table = tables.find(t => t.number === tableNumber);
    if (!table) return;

    // Check if there's an existing active order for this table
    const existingOrder = orders.find(order => 
      order.tableNumber === tableNumber && order.status === 'active'
    );
    
    if (existingOrder) {
      setCurrentOrder(existingOrder);
    } else if (table.currentOrder) {
      setCurrentOrder(table.currentOrder);
    } else {
      const newOrder: Order = {
        id: `order-${Date.now()}-${tableNumber}`,
        tableNumber,
        items: [],
        serviceCharge: 0,
        parcelCharges: 0,
        subtotal: 0,
        total: 0,
        timestamp: new Date(),
        status: 'active',
        kotPrinted: false,
        customerBillPrinted: false,
      };
      setCurrentOrder(newOrder);
      
      // Update table status to occupied when creating new order
      setTables(tables.map(t =>
        t.number === tableNumber
          ? { ...t, status: 'occupied', lastActivity: new Date() }
          : t
      ));
    }
  };

  // Helper function to calculate order totals safely
  const calculateOrderTotals = (items: OrderItem[], serviceChargePercent: number) => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const parcelCharges = items.reduce((sum, item) => {
      // Handle backward compatibility - items might not have parcelCharge field, default to 5 if isParcel
      const itemParcelCharge = item.parcelCharge ?? (item.isParcel ? 5 : 0);
      return sum + (item.isParcel ? itemParcelCharge : 0);
    }, 0);
    const serviceChargeAmount = subtotal * serviceChargePercent / 100;
    const total = subtotal + parcelCharges + serviceChargeAmount;
    
    return { subtotal, parcelCharges, total };
  };

  const addItemToOrder = (menuItem: MenuItem) => {
    if (!currentOrder) return;

    const existingItem = currentOrder.items.find(item => item.id === menuItem.id);
    
    let updatedItems: OrderItem[];
    if (existingItem) {
      updatedItems = currentOrder.items.map(item =>
        item.id === menuItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      const orderItem: OrderItem = {
        ...menuItem,
        quantity: 1,
        isParcel: false,
        parcelCharge: 0, // Default to 0, will be set to 5 when isParcel is toggled to true
      };
      updatedItems = [...currentOrder.items, orderItem];
    }

    const { subtotal, parcelCharges, total } = calculateOrderTotals(updatedItems, currentOrder.serviceCharge);

    const updatedOrder = {
      ...currentOrder,
      items: updatedItems,
      subtotal,
      parcelCharges,
      total,
    };

    setCurrentOrder(updatedOrder);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (!currentOrder) return;

    let updatedItems: OrderItem[];
    if (quantity === 0) {
      updatedItems = currentOrder.items.filter(item => item.id !== itemId);
    } else {
      updatedItems = currentOrder.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );
    }

    const { subtotal, parcelCharges, total } = calculateOrderTotals(updatedItems, currentOrder.serviceCharge);

    const updatedOrder = {
      ...currentOrder,
      items: updatedItems,
      subtotal,
      parcelCharges,
      total,
    };

    setCurrentOrder(updatedOrder);

    // If no items left, also update the orders array to remove this order
    if (updatedItems.length === 0) {
      setOrders(prevOrders => prevOrders.filter(order => order.id !== currentOrder.id));
    }
  };

  const toggleItemParcel = (itemId: string) => {
    if (!currentOrder) return;

    const updatedItems = currentOrder.items.map(item => {
      if (item.id === itemId) {
        // Handle backward compatibility and set default parcel charge
        return { 
          ...item, 
          isParcel: !item.isParcel,
          parcelCharge: !item.isParcel ? 5 : 0 // Set to ₹5 when enabling parcel, ₹0 when disabling
        };
      }
      return item;
    });

    setCurrentOrder({
      ...currentOrder,
      items: updatedItems,
    });
  };

  const removeItem = (itemId: string) => {
    updateItemQuantity(itemId, 0);
  };

  const updateItemParcelCharge = (itemId: string, parcelCharge: number) => {
    if (!currentOrder) return;

    const updatedItems = currentOrder.items.map(item =>
      item.id === itemId ? { ...item, parcelCharge } : item
    );

    const { subtotal, parcelCharges, total } = calculateOrderTotals(updatedItems, currentOrder.serviceCharge);

    const updatedOrder = {
      ...currentOrder,
      items: updatedItems,
      subtotal,
      parcelCharges,
      total,
    };

    setCurrentOrder(updatedOrder);
  };

  const updateServiceCharge = (serviceCharge: number) => {
    if (!currentOrder) return;

    const { subtotal, parcelCharges, total } = calculateOrderTotals(currentOrder.items, serviceCharge);

    setCurrentOrder({
      ...currentOrder,
      serviceCharge,
      subtotal,
      parcelCharges,
      total,
    });
  };

  const saveOrder = () => {
    if (!currentOrder || currentOrder.items.length === 0) return;

    const updatedOrder = { ...currentOrder };
    const existingOrderIndex = orders.findIndex(order => order.id === updatedOrder.id);
    
    let updatedOrders;
    if (existingOrderIndex >= 0) {
      // Update existing order
      updatedOrders = orders.map((order, index) => 
        index === existingOrderIndex ? updatedOrder : order
      );
    } else {
      // Add new order
      updatedOrders = [...orders, updatedOrder];
    }
    
    setOrders(updatedOrders);

    // Update table status
    setTables(tables.map(table =>
      table.number === currentOrder.tableNumber
        ? { ...table, status: 'occupied', currentOrder: updatedOrder, lastActivity: new Date() }
        : table
    ));

    return updatedOrder.id;
  };

  const completeOrder = async () => {
    if (!currentOrder) return;

    // Generate bill number
    let billNumber: string;
    try {
      billNumber = await BillNumberService.getNextBillNumber();
    } catch (error) {
      console.error('Failed to generate bill number from Supabase:', error);
      // Use simple localStorage-based bill number as fallback
      billNumber = BillNumberService.getSimpleBillNumber();
      console.log('✅ Using localStorage fallback bill number:', billNumber);
    }
    
    const completedOrder = { ...currentOrder, status: 'completed' as const, billNumber };
    
    // Save completed order to Supabase
    try {
      const supabaseOrder = {
        id: completedOrder.id,
        table_number: completedOrder.tableNumber,
        items: completedOrder.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          isParcel: item.isParcel
        })),
        service_charge: completedOrder.serviceCharge,
        subtotal: completedOrder.subtotal,
        total: completedOrder.total,
        status: completedOrder.status,
        kot_printed: completedOrder.kotPrinted,
        customer_bill_printed: completedOrder.customerBillPrinted,
        timestamp: completedOrder.timestamp.toISOString(),
        restaurant_id: 'default-restaurant',
        bill_number: completedOrder.billNumber
      };

      console.log('🔄 Attempting to save completed order:', supabaseOrder);
      await safeWrite('completed_orders', supabaseOrder);
      console.log('💾 Order saved to Supabase successfully!');
    } catch (error) {
      console.error('❌ Failed to save order to Supabase:', error);
    }
    
    const existingOrderIndex = orders.findIndex(order => order.id === completedOrder.id);
    if (existingOrderIndex >= 0) {
      setOrders(orders.map((order, index) => 
        index === existingOrderIndex ? completedOrder : order
      ));
      console.log('📝 Updated existing order in local state');
    } else {
      setOrders([...orders, completedOrder]);
      console.log('➕ Added new completed order to local state');
    }
    console.log('📊 Total orders in state:', orders.length + 1);

    // Show success message
    setSuccessMessage(`Order #${completedOrder.id.slice(-4)} completed successfully! ✅`);
    
    // Create fresh order for the same table
    const freshOrder: Order = {
      id: Date.now().toString(),
      tableNumber: completedOrder.tableNumber,
      items: [],
      subtotal: 0,
      total: 0,
      serviceCharge: 0,
      parcelCharges: 0, // New field
      timestamp: new Date(),
      status: 'active',
      kotPrinted: false,
      customerBillPrinted: false
    };
    
    // Set the fresh order as current order (keep billing screen active)
    setCurrentOrder(freshOrder);
    
    // Update table to occupied with fresh order
    setTables(tables.map(table =>
      table.number === completedOrder.tableNumber
        ? { ...table, status: 'occupied', currentOrder: freshOrder, lastActivity: new Date() }
        : table
    ));
    
    // Hide success message after 1 second
    setTimeout(() => {
      setSuccessMessage(null);
    }, 1000);
  };

    const reprintOrder = (order: any, type: 'customer' | 'kot') => {
    // Convert historical order format to current format for printing
    const orderForPrint = {
      id: order.id,
      tableNumber: order.table_number || order.tableNumber,
      items: order.items || [],
      serviceCharge: order.service_charge || order.serviceCharge || 0,
      parcelCharges: order.parcel_charges || order.parcelCharges || 0,
      subtotal: order.subtotal || 0,
      total: order.total || 0,
      timestamp: new Date(order.timestamp),
      status: order.status || 'completed',
      kotPrinted: order.kot_printed || order.kotPrinted,
      customerBillPrinted: order.customer_bill_printed || order.customerBillPrinted,
      billNumber: order.bill_number || order.billNumber || 'N/A' // Handle legacy orders
    };

    // Generate and print the content
    const content = generatePrintContent(orderForPrint, type);
    
    // Create print iframe
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    printFrame.id = `reprint-frame-${Date.now()}`;
    document.body.appendChild(printFrame);
    
    const printDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (printDoc) {
      printDoc.open();
      printDoc.write(`
        <html>
          <head>
            <title>Reprint ${type.toUpperCase()}</title>
            <style>
              @media print {
                @page { 
                  margin: 0.5in; 
                  size: A4;
                }
                body { 
                  -webkit-print-color-adjust: exact; 
                  print-color-adjust: exact;
                }
              }
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                margin: 0; 
                padding: 10px; 
                background: white;
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
      printDoc.close();
      
      setTimeout(() => {
        const win = printFrame.contentWindow;
        if (win) {
          win.focus();
          win.print();
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 1000);
        }
      }, 200);
    }
    
    console.log(`🖨️ Reprinted ${type.toUpperCase()} for order #${order.id?.slice(-4) || 'Unknown'}`);
  };

    const performPrint = (order: Order, type: 'customer' | 'kot' | 'both') => {
    // 'both' case should not reach here as it's handled in handlePrint
    if (type === 'both') {
      console.error('performPrint should not receive "both" type directly');
      return;
    }
    
    const content = generatePrintContent(order, type);
    
    // Create a unique iframe for each print job
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);
    
    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (printDocument) {
      printDocument.open();
      printDocument.write(`
        <html>
          <head>
            <title>Print ${type}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; color: #000 !important; font-weight: bold !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
              .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
              .total-row { border-top: 1px solid #000; padding-top: 5px; margin-top: 10px; font-weight: bold; }
              * { color: #000 !important; font-weight: bold !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              h1, h2, h3, h4, h5, h6, p, span, div, a, strong, b, em, i { color: #000 !important; font-weight: bold !important; }
              @media print { * { color: #000 !important; font-weight: bold !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
              @media screen { * { color: #000 !important; font-weight: bold !important; } }
              @page { color: #000 !important; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
      printDocument.close();
      
      // Auto-print: trigger print and try to auto-close the window if possible
      setTimeout(() => {
        const win = printFrame.contentWindow;
        if (win) {
          win.focus();
          win.print();
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 500);
        }
      }, 100);
    }
  };

  const getAmountInWords = (amount: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 
                  'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (amount === 0) return 'Zero Rupees only';
    if (amount < 20) return ones[amount] + ' Rupees only';
    if (amount < 100) {
      const ten = Math.floor(amount / 10);
      const one = amount % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '') + ' Rupees only';
    }
    if (amount < 1000) {
      const hundred = Math.floor(amount / 100);
      const remainder = amount % 100;
      let result = ones[hundred] + ' Hundred';
      if (remainder > 0) {
        if (remainder < 20) {
          result += ' ' + ones[remainder];
        } else {
          const ten = Math.floor(remainder / 10);
          const one = remainder % 10;
          result += ' ' + tens[ten] + (one > 0 ? ' ' + ones[one] : '');
        }
      }
      return result + ' Rupees only';
    }
    return 'Amount in words';
  };

  const generatePrintContent = (order: Order, type: 'customer' | 'kot'): string => {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB');
    const time = now.toLocaleTimeString('en-GB', { hour12: true });
    const billNo = order.billNumber || 'N/A'; // Use order's bill number
    
    let content = '';
    
    if (type === 'kot') {
      content += `
        <div class="header">
          <h2 style="font-size: 18px; font-weight: bold; margin: 0; text-align: center; color: #000;">Udupi Krishnam Veg</h2>
          <p style="font-size: 10px; margin: 5px 0; text-align: center; line-height: 1.2; color: #000;">
            Contact No: 9535089567
          </p>
          <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin: 5px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #000;">
              <span>Bill No: ${billNo}</span>
              <span>Table: ${order.tableNumber}</span>
            </div>
            <div style="font-size: 10px; color: #000;">Print Time: ${date} ${time}</div>
          </div>
        </div>
        <div>
          <div style="text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; border: 2px solid #000; padding: 5px; color: #000;">
            KITCHEN ORDER TICKET
          </div>
          <div style="font-size: 12px; font-weight: bold; margin: 5px 0; color: #000;">
            Table: ${order.tableNumber} | Time: ${time}
          </div>
          <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin: 5px 0;">
            ${order.items.map(item => `
              <div style="font-size: 14px; font-weight: bold; margin: 5px 0; color: #000; ${item.isParcel ? 'background: #ffe6cc; padding: 3px;' : ''}">
                ${item.quantity}x ${item.name.toUpperCase()}
                ${item.isParcel ? '<span style="float: right; color: #ff6600; font-weight: bold;">[PARCEL]</span>' : ''}
              </div>
            `).join('')}
          </div>
          <div style="text-align: center; font-size: 10px; margin-top: 10px; color: #000;">
            Total Items: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}
          </div>
        </div>
      `;
    }

    if (type === 'customer') {
      const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const serviceChargeAmount = (subtotal * order.serviceCharge) / 100;
      const parcelCharges = order.items.reduce((sum, item) => {
        const itemParcelCharge = item.parcelCharge ?? (item.isParcel ? 5 : 0);
        return sum + (item.isParcel ? itemParcelCharge : 0);
      }, 0);
      const total = subtotal + serviceChargeAmount + parcelCharges;

      content += `
        <div>
          <!-- Restaurant Header -->
          <div style="text-align: center; margin-bottom: 15px;">
            <h1 style="font-size: 18px; font-weight: bold; margin: 0; line-height: 1.2; color: #000;">Udupi Krishnam Veg</h1>
            <p style="font-size: 10px; margin: 8px 0 0 0; line-height: 1.3; color: #000;">
              Bengaluru - Chennai Hwy, Konappana Agrahara,<br>
              Electronic City, Bengaluru, Karnataka,<br>
              India Bangalore, Karnataka Bengaluru<br>
              560100
            </p>
            <p style="font-size: 12px; font-weight: bold; margin: 8px 0 0 0; color: #000;">Tax Invoice</p>
          </div>

          <!-- Bill Information -->
          <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin: 12px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; color: #000;">
              <span>Bill No: ${billNo}</span>
              <span>Table: ${order.tableNumber}</span>
            </div>
            <div style="font-size: 11px; color: #000;">Print Time: ${date} ${time}</div>
          </div>

          <!-- Items Table Header -->
          <div style="margin: 12px 0;">
            <div style="display: flex; font-size: 10px; font-weight: bold; padding: 5px 0; border-bottom: 1px dashed #000; color: #000;">
              <span style="width: 60%; text-align: left;">Sl Item</span>
              <span style="width: 12%; text-align: center;">Qty</span>
              <span style="width: 14%; text-align: right; padding-right: 8px;">Rate</span>
              <span style="width: 14%; text-align: right;">Amount</span>
            </div>
            
            <!-- Items List -->
            <div style="padding: 3px 0;">
              ${order.items.map((item, index) => `
                <div style="display: flex; font-size: 11px; padding: 2px 0; color: #000;">
                  <span style="width: 60%; text-align: left;">${index + 1} ${item.name}</span>
                  <span style="width: 12%; text-align: center;">${item.quantity}</span>
                  <span style="width: 14%; text-align: right;">${item.price}</span>
                  <span style="width: 14%; text-align: right;">${item.price * item.quantity}</span>
                </div>
              `).join('')}
            </div>
            <div style="border-top: 1px dashed #000; margin-top: 5px;"></div>
          </div>

          <!-- Totals Section -->
          <div style="margin: 12px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; color: #000;">
              <span>Net All Total</span>
              <span>${Math.round(subtotal)}</span>
            </div>
            
            ${order.serviceCharge > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; color: #000;">
                <span>Service Charge (${order.serviceCharge}%)</span>
                <span>${Math.round(serviceChargeAmount)}</span>
              </div>
            ` : ''}
            
            ${parcelCharges > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; color: #000;">
                <span>Packing Charges</span>
                <span>${Math.round(parcelCharges)}</span>
              </div>
            ` : ''}

            <!-- Final Total -->
            <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 8px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #000;">
                <span>Gross Amount</span>
                <span>${Math.round(total)}</span>
              </div>
              <div style="text-align: right; font-size: 10px; margin-top: 5px; font-style: italic; color: #000;">
                ${getAmountInWords(Math.round(total))}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="font-size: 11px; margin-top: 15px; color: #000;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span>Total Items: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              <span>Steward Name: Admin</span>
            </div>
            <div style="text-align: center; margin: 8px 0;">
              <p style="margin: 2px 0;">Powered by: Múra</p>
              <p style="margin: 2px 0; font-weight: bold;">*** Thank you, Visit again ***</p>
            </div>
          </div>
        </div>
      `;
    }

    return content;
  };

  const handlePrint = async (type: 'customer' | 'kot' | 'both') => {
    if (!currentOrder) return;

    // If current order has items but no bill number, generate one
    if (currentOrder.items.length > 0 && !currentOrder.billNumber) {
      console.log('🔢 Current order has items but no bill number, generating one...');
      try {
        const billNumber = await BillNumberService.getNextBillNumber();
        console.log('✅ Generated bill number for printing:', billNumber);
        
        // Update current order with bill number
        const updatedOrder = { ...currentOrder, billNumber };
        setCurrentOrder(updatedOrder);
        
        // Update in orders array if it exists
        const existingOrderIndex = orders.findIndex(order => order.id === updatedOrder.id);
        if (existingOrderIndex >= 0) {
          setOrders(orders.map((order, index) => 
            index === existingOrderIndex ? updatedOrder : order
          ));
        }
        
        // Update table with updated order
        setTables(tables.map(table =>
          table.number === updatedOrder.tableNumber
            ? { ...table, currentOrder: updatedOrder, lastActivity: new Date() }
            : table
        ));
        
        // Use the updated order for printing
        currentOrder.billNumber = billNumber;
      } catch (error) {
        console.error('❌ Failed to generate bill number for printing:', error);
      }
    }

    // If current order is empty (just completed), use the most recent completed order for this table
    let orderToPrint = currentOrder;
    if (currentOrder.items.length === 0) {
      console.log('🔍 Current order is empty, looking for recent completed order...');
      console.log('📋 Available orders:', orders.length);
      console.log('🏢 Current table:', currentOrder.tableNumber);
      console.log('📊 All orders status check:', orders.map(o => ({ 
        id: o.id.slice(-4), 
        table: o.tableNumber, 
        status: o.status, 
        billNumber: o.billNumber, 
        hasItems: o.items?.length || 0 
      })));
      
      const completedOrders = orders.filter(order => 
        order.tableNumber === currentOrder.tableNumber && 
        order.status === 'completed' && 
        order.billNumber
      );
      
      console.log('✅ Found completed orders with bill numbers:', completedOrders.length);
      completedOrders.forEach(order => {
        console.log(`  - Order ${order.id.slice(-4)} | Bill: ${order.billNumber} | Time: ${order.timestamp}`);
      });
      
      const recentOrder = completedOrders
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      
      if (recentOrder) {
        orderToPrint = recentOrder;
        console.log('🖨️ Using recent completed order for printing:', recentOrder.id, 'Bill number:', recentOrder.billNumber);
      } else {
        console.log('❌ No suitable completed order found for printing');
      }
    } else {
      console.log('📝 Current order has items, using current order for printing');
    }

    if (type === 'both') {
      // Handle sequential printing for both documents
      console.log('Starting sequential print: KOT first...');
      performPrint(orderToPrint, 'kot');
      
      setTimeout(() => {
        console.log('Printing Customer Bill...');
        performPrint(orderToPrint, 'customer');
      }, 3000);
      
      // Update both print statuses immediately (only if it's the current order)
      if (orderToPrint.id === currentOrder.id) {
        const updatedOrder = {
          ...currentOrder,
          kotPrinted: true,
          customerBillPrinted: true,
        };
        
        setCurrentOrder(updatedOrder);
        
        // Save/update the order
        const existingOrderIndex = orders.findIndex(order => order.id === updatedOrder.id);
        if (existingOrderIndex >= 0) {
          setOrders(orders.map((order, index) => 
            index === existingOrderIndex ? updatedOrder : order
          ));
        } else {
          setOrders([...orders, updatedOrder]);
        }
        
        // Update table with current order
        setTables(tables.map(table =>
          table.number === updatedOrder.tableNumber
            ? { ...table, status: 'occupied', currentOrder: updatedOrder, lastActivity: new Date() }
            : table
        ));
      }
      
      return;
    }

    // Handle single print (existing logic)
    performPrint(orderToPrint, type);

    // Update print statuses (only if it's the current order)
    if (orderToPrint.id === currentOrder.id) {
      const updatedOrder = {
        ...currentOrder,
        kotPrinted: type === 'kot' ? true : currentOrder.kotPrinted,
        customerBillPrinted: type === 'customer' ? true : currentOrder.customerBillPrinted,
      };

      setCurrentOrder(updatedOrder);
      
      // Always save/update the order when printing
      const existingOrderIndex = orders.findIndex(order => order.id === updatedOrder.id);
      if (existingOrderIndex >= 0) {
        setOrders(orders.map((order, index) => 
          index === existingOrderIndex ? updatedOrder : order
        ));
      } else {
        setOrders([...orders, updatedOrder]);
      }
      
      // Update table with current order
      setTables(tables.map(table =>
        table.number === updatedOrder.tableNumber
          ? { ...table, status: 'occupied', currentOrder: updatedOrder, lastActivity: new Date() }
          : table
      ));
    }
  };

  const backToTables = () => {
    if (currentOrder) {
      if (currentOrder.items.length > 0) {
        saveOrder();
      } else {
        // If order is empty, remove it from orders array and make table available
        setOrders(prevOrders => prevOrders.filter(order => order.id !== currentOrder.id));
        setTables(prevTables => prevTables.map(table => 
          table.number === currentOrder.tableNumber
            ? { ...table, status: 'available', currentOrder: undefined }
            : table
        ));
      }
    }
    setCurrentOrder(null);
  };


  // --- MENU CRUD ---
  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    try {
      // Clear any previous error messages
      setErrorMessage(null);
      
      // Validate price (max 99,999,999.99 for database precision 10,2)
      if (item.price >= 100000000) {
        const errorMsg = 'Price too large! Maximum allowed: ₹99,999,999.99';
        setErrorMessage(errorMsg);
        throw new Error(errorMsg);
      }

    // Normalize category name - use existing category format if similar one exists
    const existingCategories = menuItems.map(item => item.category);
    const newCategoryUpper = item.category.toUpperCase().trim();
    
    // Find if a similar category already exists (case-insensitive)
    const existingCategory = existingCategories.find(existing => 
      existing.toUpperCase().trim() === newCategoryUpper
    );
    
    // Use the existing category format to maintain consistency
    const finalCategory = existingCategory || item.category.trim();
    
    const newItem: MenuItem = {
      ...item,
      id: Date.now().toString(),
      category: finalCategory, // Use normalized category name
      price: Math.round(item.price * 100) / 100, // Round to 2 decimal places
    };
      
      // Save to Supabase
      const supabaseItem = {
        ...newItem,
        restaurant_id: 'default-restaurant'
      };
      await safeWrite('menu_items', supabaseItem);
      
      // Update local state
      setMenuItems((prev) => [...prev, newItem]);
      
      // Show success message with category info if normalized
      if (existingCategory && existingCategory !== item.category) {
        setSuccessMessage(`✅ "${newItem.name}" added to "${existingCategory}" category successfully!`);
      } else {
        setSuccessMessage(`✅ "${newItem.name}" added to menu successfully!`);
      }
      console.log('🍽️ Menu item saved to Supabase:', newItem.name);
      
    } catch (error) {
      console.error('❌ Failed to add menu item:', error);
      
      // If error message wasn't set during validation, set a generic one
      if (!errorMessage) {
        setErrorMessage('Failed to add menu item. Please try again.');
      }
      
      // Re-throw the error so the UI can handle it
      throw error;
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    // Update in Supabase
    try {
      const supabaseUpdates = {
        ...updates,
        restaurant_id: 'default-restaurant'
      };
      await safeUpdate('menu_items', id, supabaseUpdates);
      console.log('🔄 Menu item updated in Supabase:', id);
    } catch (error) {
      console.error('Failed to update menu item in Supabase:', error);
    }
    
    setMenuItems((prev) => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteMenuItem = async (id: string) => {
    // Delete from Supabase
    try {
      await safeDelete('menu_items', id);
      console.log('🗑️ Menu item deleted from Supabase:', id);
    } catch (error) {
      console.error('Failed to delete menu item from Supabase:', error);
    }
    
    setMenuItems((prev) => prev.filter(item => item.id !== id));
  };

  return {
    tables,
    menuItems,
    orders,
    currentOrder,
    selectTable,
    addItemToOrder,
    updateItemQuantity,
    toggleItemParcel,
    updateItemParcelCharge,
    removeItem,
    updateServiceCharge,
    saveOrder,
    completeOrder,
    successMessage,
    setSuccessMessage,
    errorMessage,
    setErrorMessage,
    reprintOrder,
    handlePrint,
    backToTables,
    // Menu CRUD
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    // Migration (temporary)
    migrateFromOldTable,
    // Clear functionality
    clearAllOrders,
  };
}