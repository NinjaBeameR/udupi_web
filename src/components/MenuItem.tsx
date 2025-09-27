import React from 'react';
import { MenuItem as MenuItemType } from '../types';
import { Plus } from 'lucide-react';

interface MenuItemProps {
  item: MenuItemType;
  onAdd: (item: MenuItemType) => void;
}

export function MenuItem({ item, onAdd }: MenuItemProps) {
  return (
    <div 
      className={`
        bg-white rounded-lg shadow-md border transition-all duration-200 hover:shadow-lg
        ${item.available ? 'hover:border-blue-300 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
      `}
      onClick={() => item.available && onAdd(item)}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800 leading-tight">
            {item.name}
          </h3>
          <div className="flex items-center">
            <span className="text-xl font-bold text-green-600">
              ₹{item.price.toFixed(2)}
            </span>
            {item.available && (
              <button 
                className="ml-2 bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(item);
                }}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {item.description && (
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
            {item.description}
          </p>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {item.category}
          </span>
          {!item.available && (
            <span className="text-xs font-medium text-red-500 bg-red-100 px-2 py-1 rounded">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}