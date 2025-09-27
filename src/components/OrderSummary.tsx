import { OrderItem } from '../types';

interface OrderSummaryProps {
  items: OrderItem[];
  serviceCharge: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onToggleParcel: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onServiceChargeChange: (charge: number) => void;
}

export function OrderSummary({ 
  items, 
  serviceCharge, 
  onUpdateQuantity, 
  onToggleParcel, 
  onRemoveItem,
  onServiceChargeChange 
}: OrderSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const serviceChargeAmount = (subtotal * serviceCharge) / 100;
  const parcelCharges = items.reduce((sum, item) => sum + (item.isParcel ? item.quantity * 10 : 0), 0);
  const total = subtotal + serviceChargeAmount + parcelCharges;

  return (
    <div className="h-full flex flex-col">
      {/* Minimal Service Charge */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Service Charge</span>
          <select
            value={serviceCharge}
            onChange={(e) => onServiceChargeChange(Number(e.target.value))}
            className="px-2 py-1 border-0 bg-transparent text-xs text-gray-700 focus:ring-0"
          >
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={10}>10%</option>
            <option value={15}>15%</option>
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-center flex-1 bg-gray-50">
          <div className="text-center">
            <div className="text-8xl text-gray-300 mb-6">🛒</div>
            <p className="text-gray-600 font-semibold text-xl">No items in order</p>
            <p className="text-gray-400 mt-2">Start adding items from menu</p>
          </div>
        </div>
      ) : (
        <>
          {/* Ultra-Minimal Receipt Style Order List */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="group">
                  {/* Main Item Line */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-gray-900">
                        {item.name} × {item.quantity}
                      </span>
                      {item.isParcel && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          Pack
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      ₹{(item.price * item.quantity).toFixed(0)}
                    </span>
                  </div>
                  
                  {/* Always Visible Staff-Friendly Controls */}
                  <div className="flex items-center justify-between mt-1 pl-2">
                    <div className="flex items-center gap-3">
                      {/* Bigger Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                          className="w-7 h-7 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded font-bold text-sm"
                        >
                          −
                        </button>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                      
                      {/* Parcel Toggle */}
                      <button
                        onClick={() => onToggleParcel(item.id)}
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          item.isParcel 
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                            : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        {item.isParcel ? '📦 Parcel' : '+ Add parcel'}
                      </button>
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Receipt Style Totals */}
          <div className="bg-white border-t border-gray-200 px-4 py-3">
            <div className="space-y-1">
              {serviceCharge > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Service ({serviceCharge}%)</span>
                  <span>₹{serviceChargeAmount.toFixed(0)}</span>
                </div>
              )}
              
              {parcelCharges > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Packing</span>
                  <span>₹{parcelCharges.toFixed(0)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-semibold text-base text-gray-900 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>₹{total.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}