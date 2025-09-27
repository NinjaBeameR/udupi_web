import { useState, useEffect } from 'react';
import { ArrowLeft, Home, Menu, Clock, LogOut } from 'lucide-react';
import { TableGrid } from './components/TableGrid';
import { MenuManager } from './components/MenuManager';
import { OrderSummary } from './components/OrderSummary';
import { Login } from './components/Login';

import { usePOSData } from './hooks/usePOSData';
import { useAuth } from './hooks/useAuth';
import { testConnection } from './services/supabase';

type Screen = 'tables' | 'billing' | 'menu-manager' | 'reports';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('tables');
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const { isAuthenticated, isLoading, login, logout } = useAuth();

  const {
    tables,
    menuItems,
    orders,
    currentOrder,
    selectTable,
    addItemToOrder,
    updateItemQuantity,
    toggleItemParcel,
    removeItem,
    updateServiceCharge,
    completeOrder,
    handlePrint,
    backToTables,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    successMessage,
    reprintOrder,
  } = usePOSData();

  const handleTableSelect = (tableNumber: number) => {
    selectTable(tableNumber);
    setCurrentScreen('billing');
  };

  const handleBackToTables = () => {
    backToTables();
    setCurrentScreen('tables');
  };

  // Load recent orders when reports screen is accessed
  useEffect(() => {
    const loadRecentOrders = async () => {
      if (currentScreen !== 'reports') return;
      
      setReportsLoading(true);
      try {
        const { fetchRecentOrders } = await import('./services/supabase');
        const orders = await fetchRecentOrders();
        setRecentOrders(orders);
      } catch (error) {
        console.error('Failed to load recent orders:', error);
        setRecentOrders([]);
      } finally {
        setReportsLoading(false);
      }
    };

    loadRecentOrders();
  }, [currentScreen]);

  const handleReprint = (order: any, type: 'kot' | 'customer') => {
    reprintOrder(order, type);
  };

  const renderHeader = () => (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-6">
          {currentScreen !== 'tables' && (
            <button
              onClick={handleBackToTables}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Tables
            </button>
          )}
          
          <h1 className="text-2xl font-bold text-gray-800">
            {currentScreen === 'tables' && 'Table Management'}
            {currentScreen === 'billing' && currentOrder && `Table ${currentOrder.tableNumber} - Billing`}
            {currentScreen === 'menu-manager' && 'Menu Management'}
            {currentScreen === 'reports' && 'Reports & History'}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Print Buttons in Header - Option 1 */}
          {currentScreen === 'billing' && currentOrder && currentOrder.items.length > 0 && (
            <>
              <button
                onClick={() => handlePrint('kot')}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                🍳 KOT
              </button>
              <button
                onClick={() => handlePrint('customer')}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                📄 BILL
              </button>
              <button
                onClick={() => handlePrint('both')}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                📋 Both
              </button>
              <div className="w-px h-6 bg-gray-300 mx-2"></div>
            </>
          )}
          
          <button
            onClick={() => setCurrentScreen('tables')}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
              currentScreen === 'tables' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Home className="w-5 h-5 mr-2" />
            Tables
          </button>
          
          <button
            onClick={() => setCurrentScreen('menu-manager')}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
              currentScreen === 'menu-manager' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Menu className="w-5 h-5 mr-2" />
            Menu
          </button>
          
          <button
            onClick={() => setCurrentScreen('reports')}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
              currentScreen === 'reports' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-5 h-5 mr-2" />
            Reports
          </button>
          
          <div className="border-l border-gray-300 h-6 mx-3"></div>
          
          <button
            onClick={logout}
            className="flex items-center px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  const renderTableScreen = () => (
    <div className="flex-1 bg-gray-100">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Select a Table</h2>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span>Occupied</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                <span>Reserved</span>
              </div>
            </div>
          </div>
        </div>
        
  <TableGrid tables={tables} orders={orders} onTableSelect={handleTableSelect} />
      </div>
    </div>
  );

  const renderBillingScreen = () => {
    if (!currentOrder) return null;

    // Minimal 60/40 Split Layout
    return (
      <div className="flex h-[calc(100vh-80px)] bg-white">
        {/* LEFT: Clean Menu List (60% width) */}
        <div className="w-[60%] flex flex-col bg-white">
          <MenuManager
            menuItems={menuItems}
            onAddToOrder={addItemToOrder}
          />
        </div>

        {/* RIGHT: Minimal Order Summary (40% width) */}
        <div className="w-[40%] flex flex-col bg-gray-50 border-l border-gray-200">
          {/* Simple Order Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Current Order</h2>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">₹{currentOrder.total.toFixed(0)}</div>
                <div className="text-xs text-gray-500">Table {currentOrder.tableNumber}</div>
              </div>
            </div>
          </div>

          {/* Scrollable Order Items */}
          <div className="flex-1 overflow-y-auto">
            <OrderSummary
              items={currentOrder.items}
              serviceCharge={currentOrder.serviceCharge}
              onUpdateQuantity={updateItemQuantity}
              onToggleParcel={toggleItemParcel}
              onRemoveItem={removeItem}
              onServiceChargeChange={updateServiceCharge}
            />
          </div>

          {/* Clean Action Bar */}
          <div className="bg-white p-4 border-t border-gray-200">
            {currentOrder.items.length > 0 ? (
              <div className="space-y-4">
                {/* Smaller Complete Order Button */}
                <button
                  onClick={completeOrder}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Complete Order - ₹{currentOrder.total.toFixed(0)}
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Select items to start order</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMenuManagerScreen = () => (
    <div className="flex-1 bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-md h-full">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Menu Management</h2>
          <p className="text-gray-600">Manage your restaurant menu items</p>
        </div>
        <div className="p-4">
          <MenuManager
            menuItems={menuItems}
            addMenuItem={addMenuItem}
            updateMenuItem={updateMenuItem}
            deleteMenuItem={deleteMenuItem}
            isCRUD
          />
        </div>
      </div>
    </div>
  );

  const renderReportsScreen = () => (
    <div className="flex-1 bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-md h-full">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Reports & Order History</h2>
          <p className="text-gray-600">Recent orders (last 20 or 24 hours)</p>
        </div>
        
        <div className="p-4">
          {reportsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading orders...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No recent orders</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentOrders.map((order) => (
                <div key={order.id} className="bg-gray-50 rounded-lg border hover:border-blue-300 transition-colors">
                  {/* Order Header - Clickable */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold">Table {order.table_number}</p>
                          <span className="text-xs text-gray-500">#{order.id.slice(-4)}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at || order.timestamp).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">{order.items?.length || 0} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{order.total?.toFixed(0) || '0'}</p>
                        <p className="text-sm text-gray-600 capitalize">{order.status}</p>
                      </div>
                    </div>
                      
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex space-x-2 text-xs">
                        {order.kot_printed && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">KOT Printed</span>
                        )}
                        {order.customer_bill_printed && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Bill Printed</span>
                        )}
                      </div>
                      <span className="text-xs text-blue-600 font-medium">
                        {expandedOrder === order.id ? '▲ Hide Details' : '▼ Show Details'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Order Details */}
                  {expandedOrder === order.id && order.items && (
                    <div className="border-t bg-white p-4">
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-800 mb-2">Order Items:</h4>
                        <div className="space-y-1">
                          {order.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              {item.isParcel && <span className="text-orange-600 text-xs">[PARCEL]</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReprint(order, 'kot');
                          }}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded transition-colors"
                        >
                          🍳 Reprint KOT
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReprint(order, 'customer');
                          }}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors"
                        >
                          📄 Reprint Bill
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SwiftBill POS...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  // Show main POS application if authenticated
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {renderHeader()}
      
      {currentScreen === 'tables' && renderTableScreen()}
      {currentScreen === 'billing' && renderBillingScreen()}
      {currentScreen === 'menu-manager' && renderMenuManagerScreen()}
      {currentScreen === 'reports' && renderReportsScreen()}
      
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse transform transition-all duration-300">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✅</span>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;