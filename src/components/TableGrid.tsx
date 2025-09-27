// ...existing code...
import { Table } from '../types';
import { Users, Clock } from 'lucide-react';


import { Order } from '../types';

interface TableGridProps {
  tables: Table[];
  orders: Order[];
  onTableSelect: (tableNumber: number) => void;
}


export function TableGrid({ tables, orders, onTableSelect }: TableGridProps) {
  // Helper to check if a table has an active order
  const isTableOccupied = (tableNumber: number) =>
    orders.some(order => order.tableNumber === tableNumber && order.status === 'active');

  const getTableStatusColor = (table: Table) => {
    if (isTableOccupied(table.number)) {
      return 'bg-red-500 hover:bg-red-600 border-red-600';
    }
    if (table.status === 'reserved') {
      return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-600';
    }
    return 'bg-green-500 hover:bg-green-600 border-green-600';
  };

  const getStatusText = (table: Table) => {
    if (isTableOccupied(table.number)) {
      return 'Occupied';
    }
    if (table.status === 'reserved') {
      return 'Reserved';
    }
    return 'Available';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6">
      {tables.map((table) => (
        <button
          key={table.number}
          onClick={() => onTableSelect(table.number)}
          className={`
            ${getTableStatusColor(table)}
            text-white rounded-2xl p-6 shadow-lg transition-all duration-200 
            transform hover:scale-105 border-2 min-h-[140px] flex flex-col items-center justify-center
          `}
        >
          <div className="flex items-center justify-center mb-2">
            <Users className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">T{table.number}</span>
          </div>
          <div className="text-sm font-medium mb-1">
            {getStatusText(table)}
          </div>
          {table.lastActivity && isTableOccupied(table.number) && (
            <div className="flex items-center text-xs opacity-90">
              <Clock className="w-3 h-3 mr-1" />
              {table.lastActivity.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}