import { useState, useEffect } from 'react';
import { ArrowLeft, Home, Menu, Clock, LogOut } from 'lucide-react';
import { TableGrid } from './components/TableGrid';
import { MenuManager } from './components/MenuManager';
import { OrderSummary } from './components/OrderSummary';
import { Login } from './components/Login';

import { usePOSData } from './hooks/usePOSData';
import { useAuth } from './hooks/useAuth';

type Screen = 'tables' | 'billing' | 'menu-manager' | 'reports';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('tables');
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [billNumberSearch, setBillNumberSearch] = useState('');
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
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
    updateItemParcelCharge,
    removeItem,
    updateServiceCharge,
    completeOrder,
    handlePrint,
    backToTables,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    successMessage,
    setSuccessMessage,
    errorMessage,
    setErrorMessage,
    reprintOrder,
    clearAllOrders,
  } = usePOSData();

  // Helper function to check if there's a recent completed order available for printing
  const hasRecentCompletedOrder = () => {
    if (!currentOrder) return false;
    const recentOrder = orders
      .filter(order => 
        order.tableNumber === currentOrder.tableNumber && 
        order.status === 'completed' && 
        order.billNumber
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return !!recentOrder;
  };

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

    // Auto-refresh every 3 minutes when on reports screen
    const refreshInterval = setInterval(() => {
      if (currentScreen === 'reports') {
        loadRecentOrders();
      }
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(refreshInterval);
  }, [currentScreen]);

  // Filter orders based on bill number search
  useEffect(() => {
    if (!billNumberSearch.trim()) {
      setFilteredOrders(recentOrders);
    } else {
      const filtered = recentOrders.filter(order => 
        order.bill_number?.toLowerCase().includes(billNumberSearch.toLowerCase()) ||
        order.id.toLowerCase().includes(billNumberSearch.toLowerCase())
      );
      setFilteredOrders(filtered);
    }
  }, [recentOrders, billNumberSearch]);

  const handleReprint = (order: any, type: 'kot' | 'customer') => {
    reprintOrder(order, type);
  };

  // Calculate daily stats
  const calculateDayStats = () => {
    const totalBills = recentOrders.length;
    const totalSales = recentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    return { totalBills, totalSales };
  };

  const dayStats = calculateDayStats();

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
          {currentScreen === 'billing' && currentOrder && (currentOrder.items.length > 0 || hasRecentCompletedOrder()) && (
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
            successMessage={successMessage}
            errorMessage={errorMessage}
            setSuccessMessage={setSuccessMessage}
            setErrorMessage={setErrorMessage}
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
              onUpdateParcelCharge={updateItemParcelCharge}
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
            successMessage={successMessage}
            errorMessage={errorMessage}
            setSuccessMessage={setSuccessMessage}
            setErrorMessage={setErrorMessage}
          />
        </div>
      </div>
    </div>
  );

  const renderReportsScreen = () => (
    <div className="flex-1 bg-gray-100 p-6">
      <div className="bg-white rounded-lg shadow-md h-full">
        {/* Simplified Stats Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b px-6 py-3">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📄</span>
              <span className="text-lg font-semibold text-gray-800">{dayStats.totalBills} Bills Today</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-b">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Order History</h2>
              <p className="text-gray-600">All orders from last 24 hours • Auto-refreshes every 3 minutes</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by Bill No. or Order ID..."
                  value={billNumberSearch}
                  onChange={(e) => setBillNumberSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              {billNumberSearch && (
                <button
                  onClick={() => setBillNumberSearch('')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear Search
                </button>
              )}
              <button
                onClick={async () => {
                  if (window.confirm('🧹 Are you sure you want to clear all orders? This action cannot be undone.\n\n⚠️ This will:\n- Delete all orders from the system\n- Reset bill counter\n- Clear local storage\n\n🌙 Note: Orders are automatically cleared at midnight (00:00).')) {
                    // Clear all orders
                    await clearAllOrders();
                    
                    // Immediately refresh the reports data to show cleared state
                    if (currentScreen === 'reports') {
                      console.log('🔄 Refreshing reports data after clear...');
                      setReportsLoading(true);
                      try {
                        const { fetchRecentOrders } = await import('./services/supabase');
                        const orders = await fetchRecentOrders();
                        setRecentOrders(orders);
                        console.log('✅ Reports data refreshed, found:', orders.length, 'orders');
                      } catch (error) {
                        console.error('Failed to refresh reports data:', error);
                        setRecentOrders([]);
                      } finally {
                        setReportsLoading(false);
                      }
                    }
                  }
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear All Orders</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          {reportsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading all orders from last 24 hours...</p>
              <p className="text-xs text-gray-400 mt-2">This may take a moment for busy days</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">
                {billNumberSearch ? `No orders found for "${billNumberSearch}"` : 'No orders in the last 24 hours'}
              </p>
              {!billNumberSearch && (
                <p className="text-sm text-gray-400 mt-2">
                  Orders will appear here as they are completed
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="mb-3 text-sm text-gray-600 sticky top-0 bg-white py-2 border-b">
                Showing {filteredOrders.length} orders
                {billNumberSearch && ` matching "${billNumberSearch}"`}
                {filteredOrders.length > 50 && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Virtual scrolling active
                  </span>
                )}
              </div>
              {filteredOrders.map((order, index) => (
                <div 
                  key={order.id} 
                  className="bg-gray-50 rounded-lg border hover:border-blue-300 transition-all duration-200 hover:shadow-md order-card"
                  style={{ 
                    animationDelay: index < 20 ? `${index * 50}ms` : '0ms' // Only animate first 20 for performance
                  }}
                >
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
                          {order.bill_number && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">
                              Bill #{order.bill_number}
                            </span>
                          )}
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