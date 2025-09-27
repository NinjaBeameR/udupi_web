// ...existing code...
import { Receipt, FileText } from 'lucide-react';
import { Order } from '../types';

interface PrintButtonsProps {
  order: Order;
  onPrint: (type: 'customer' | 'kot' | 'both') => void;
  disabled?: boolean;
}

export function PrintButtons({ order, onPrint, disabled = false }: PrintButtonsProps) {
  const printDocument = (content: string, title: string) => {
    // Create a unique iframe for each print job
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    printFrame.id = `print-frame-${Date.now()}-${Math.random()}`;
    document.body.appendChild(printFrame);
    
    const printDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (printDoc) {
      printDoc.open();
      printDoc.write(`
        <html>
          <head>
            <title>${title}</title>
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
              .header { 
                text-align: center; 
                border-bottom: 1px solid #000; 
                padding-bottom: 5px; 
                margin-bottom: 10px; 
              }
              .item-row { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 2px; 
              }
              .total-row { 
                border-top: 1px solid #000; 
                padding-top: 5px; 
                margin-top: 10px; 
                font-weight: bold; 
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
      printDoc.close();
      
      // Trigger print after content is fully loaded
      setTimeout(() => {
        const win = printFrame.contentWindow;
        if (win) {
          win.focus();
          win.print();
          
          // Clean up the iframe after printing
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 1000); // Increased cleanup delay
        }
      }, 200); // Increased initial delay
    }
  };

  const handlePrint = (type: 'customer' | 'kot' | 'both') => {
    if (type === 'both') {
      // Print KOT first
      const kotContent = generatePrintContent(order, 'kot');
      console.log('Printing KOT...');
      printDocument(kotContent, 'Kitchen Order Ticket');
      
      // Print customer bill after 3 seconds
      setTimeout(() => {
        const customerContent = generatePrintContent(order, 'customer');
        console.log('Printing Customer Bill...');
        printDocument(customerContent, 'Customer Bill');
      }, 3000);
    } else {
      // Single print job
      const content = generatePrintContent(order, type);
      printDocument(content, `Print ${type.toUpperCase()}`);
    }
    onPrint(type);
  };

  const generatePrintContent = (order: Order, type: 'customer' | 'kot'): string => {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB');
    const time = now.toLocaleTimeString('en-GB', { hour12: true });
    const billNo = Math.floor(Math.random() * 90000) + 10000; // Generate random bill number
    
    let content = `
      <div class="header">
        <h2 style="font-size: 18px; font-weight: bold; margin: 0; text-align: center;">Udupi Krishnam Veg</h2>
        <p style="font-size: 10px; margin: 5px 0; text-align: center; line-height: 1.2;">
          Bengaluru - Chennai Hwy, Konappana Agrahara, Electronic City,<br>
          Bengaluru, Karnataka, India Bangalore, Karnataka Bengaluru<br>
          560100<br>
          Contact No: 9535089567
        </p>
        <p style="font-size: 12px; margin: 10px 0 5px 0; font-weight: bold;">Tax Invoice</p>
        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin: 5px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 10px;">
            <span>Bill No: ${billNo}</span>
            <span>PAX: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px;">
            <span>Table: ${order.tableNumber}</span>
            <span>Date: ${date}</span>
          </div>
          <div style="font-size: 10px;">Print Time: ${date} ${time}</div>
        </div>
      </div>
    `;

    if (type === 'kot') {
      content += `
        <div>
          <div style="text-align: center; font-size: 18px; font-weight: bold; margin: 10px 0; border: 3px solid #000; padding: 10px; background: #f5f5f5;">
            KITCHEN ORDER TICKET
          </div>
          <div style="font-size: 12px; font-weight: bold; margin: 5px 0;">
            Table: ${order.tableNumber} | Time: ${time}
          </div>
          <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin: 5px 0;">
            ${order.items.map(item => `
              <div style="font-size: 14px; font-weight: bold; margin: 5px 0; ${item.isParcel ? 'background: #ffe6cc; padding: 3px;' : ''}">
                ${item.quantity}x ${item.name.toUpperCase()}
                ${item.isParcel ? '<span style="float: right; color: #ff6600; font-weight: bold;">[PARCEL]</span>' : ''}
              </div>
            `).join('')}
          </div>
          <div style="text-align: center; font-size: 10px; margin-top: 10px;">
            Total Items: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}
          </div>
        </div>
      `;
    }

    if (type === 'customer') {
      const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const serviceChargeAmount = (subtotal * order.serviceCharge) / 100;
      const parcelItems = order.items.filter(item => item.isParcel);
      const parcelCharge = order.items.reduce((sum, item) => sum + (item.isParcel ? item.quantity * 10 : 0), 0); // ₹10 per parcel item
      
      content += `
        <div>
          <div style="text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; border: 2px solid #000; padding: 8px; background: #f0f8ff;">
            CUSTOMER BILL
          </div>
          <div style="border-bottom: 1px dashed #000; margin: 10px 0;">
            <pre style="font-size: 10px; font-weight: bold; margin: 0; font-family: 'Courier New', monospace;">
Sl Item           Qty   Rate  Amount
            </pre>
          </div>
          ${order.items.map((item, index) => {
            // Pad and align columns for perfect alignment
            const slItem = (index + 1 + ' ' + item.name).padEnd(18, ' ');
            const qty = String(item.quantity).padStart(3, ' ');
            const rate = String(item.price).padStart(6, ' ');
            const amt = String((item.price * item.quantity).toFixed(0)).padStart(7, ' ');
            return `<pre style="font-size: 10px; margin: 0; font-family: 'Courier New', monospace; border-bottom: 1px dashed #000; padding: 3px 0;">
${slItem}${qty}${rate}${amt}
</pre>`;
          }).join('')}
          
          <div style="margin: 10px 0; padding: 5px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0;">
              <span>Subtotal</span>
              <span>₹${subtotal.toFixed(2)}</span>
            </div>
            ${parcelCharge > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0;">
              <span>Parcel Charges</span>
              <span>₹${parcelCharge.toFixed(2)}</span>
            </div>` : ''}
            ${serviceChargeAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0;">
              <span>Service Charge (${order.serviceCharge}%)</span>
              <span>₹${serviceChargeAmount.toFixed(2)}</span>
            </div>` : ''}
            <div style="border-top: 1px dashed #000; margin: 5px 0; padding-top: 5px;">
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
                <span>TOTAL AMOUNT</span>
                <span>₹${(subtotal + serviceChargeAmount + parcelCharge).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; font-size: 10px; margin: 10px 0; border-top: 1px dashed #000; padding-top: 5px;">
            <span>Total Items: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            <span>Parcel Items: ${parcelItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
          
          <div style="text-align: center; font-size: 10px; margin: 5px 0;">
            <div>Powered by: NMD</div>
            <div style="margin-top: 5px;">*** Thank you, Visit again ***</div>
          </div>
        </div>
      `;
    }

    return content;
  };



  return (
    <div className="grid grid-cols-3 gap-4">
      <button
        onClick={() => handlePrint('kot')}
        disabled={disabled}
        className="flex items-center justify-center px-6 py-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
      >
        <FileText className="w-5 h-5 mr-2" />
        KOT
      </button>
      
      <button
        onClick={() => handlePrint('customer')}
        disabled={disabled}
        className="flex items-center justify-center px-6 py-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
      >
        <Receipt className="w-5 h-5 mr-2" />
        BILL
      </button>
      
      <button
        onClick={() => handlePrint('both')}
        disabled={disabled}
        className="flex flex-col items-center justify-center px-6 py-4 bg-purple-100 hover:bg-purple-200 disabled:bg-gray-50 disabled:text-gray-400 text-purple-700 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
      >
        <div className="flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Print Both
        </div>
        <span className="text-xs text-purple-600 mt-1">KOT + Bill</span>
      </button>
    </div>
  );
}