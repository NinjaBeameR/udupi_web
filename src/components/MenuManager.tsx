import React, { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { Search, ChevronDown } from 'lucide-react';


interface MenuManagerProps {
  menuItems: MenuItem[];
  onAddToOrder?: (item: MenuItem) => void;
  addMenuItem?: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem?: (id: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem?: (id: string) => void;
  isCRUD?: boolean;
  successMessage?: string | null;
  errorMessage?: string | null;
  setSuccessMessage?: (message: string | null) => void;
  setErrorMessage?: (message: string | null) => void;
}


// Category Selector Component
function CategorySelector({ 
  value, 
  onChange, 
  existingCategories 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  existingCategories: string[] 
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const normalizeCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  };

  const filteredCategories = existingCategories.filter(cat => 
    cat.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setShowDropdown(true);
  };

  const handleCategorySelect = (category: string) => {
    const normalizedCategory = normalizeCategory(category);
    setInputValue(normalizedCategory);
    onChange(normalizedCategory);
    setShowDropdown(false);
  };

  const handleCreateNew = () => {
    const normalizedCategory = normalizeCategory(inputValue);
    setInputValue(normalizedCategory);
    onChange(normalizedCategory);
    setShowDropdown(false);
  };

  const showCreateOption = inputValue.trim() && 
    !existingCategories.some(cat => cat.toLowerCase() === inputValue.toLowerCase());

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Select or create category"
          required
          className="w-full p-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <ChevronDown 
          className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" 
        />
      </div>
      
      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredCategories.length > 0 && (
            <>
              {filteredCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                >
                  {category}
                </button>
              ))}
              {showCreateOption && <div className="border-t border-gray-200"></div>}
            </>
          )}
          
          {showCreateOption && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm text-green-700 font-medium"
            >
              ✨ Create "{normalizeCategory(inputValue)}"
            </button>
          )}
          
          {filteredCategories.length === 0 && !showCreateOption && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No categories found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MenuManager({ 
  menuItems, 
  onAddToOrder, 
  addMenuItem, 
  updateMenuItem, 
  deleteMenuItem, 
  isCRUD,
  successMessage,
  errorMessage,
  setSuccessMessage,
  setErrorMessage
}: MenuManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage?.(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, setSuccessMessage]);
  const [form, setForm] = useState<Omit<MenuItem, 'id'>>({
    name: '',
    price: 0,
    category: '',
    description: '',
    available: true,
  });

  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];
  const existingCategories = Array.from(new Set(menuItems.map(item => item.category))).filter(Boolean);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let fieldValue: string | number | boolean = value;
    if (type === 'checkbox' && 'checked' in e.target) {
      fieldValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'price') {
      fieldValue = Number(value);
    }
    setForm(prev => ({
      ...prev,
      [name]: fieldValue,
    }));
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Clear any existing messages
      setErrorMessage?.(null);
      setSuccessMessage?.(null);
      
      if (editItem && updateMenuItem) {
        await updateMenuItem(editItem.id, form);
      } else if (addMenuItem) {
        await addMenuItem(form);
      }
      
      // Close form and reset only on success
      setShowForm(false);
      setEditItem(null);
      setForm({ name: '', price: 0, category: '', description: '', available: true });
      
    } catch (error) {
      // Keep form open on error so user can fix the issue
      console.error('Form submission error:', error);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      price: item.price,
      category: item.category,
      description: item.description || '',
      available: item.available,
    });
    setShowForm(true);
  };

  

  return (
    <div className="h-full flex flex-col">
      {/* Minimal Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        {/* Simple Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-sm bg-white"
          />
        </div>
        
        {/* Simple Category Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        {isCRUD && (
          <button
            onClick={() => { setShowForm(true); setEditItem(null); setForm({ name: '', price: 0, category: '', description: '', available: true }); }}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + ADD ITEM
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <span className="mr-2">✅</span>
            {successMessage}
          </span>
          <button 
            onClick={() => setSuccessMessage?.(null)}
            className="text-green-500 hover:text-green-700 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <span className="mr-2">❌</span>
            {errorMessage}
          </span>
          <button 
            onClick={() => setErrorMessage?.(null)}
            className="text-red-500 hover:text-red-700 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {isCRUD && showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              value={form.name}
              onChange={handleFormChange}
              placeholder="Name"
              required
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              name="price"
              type="number"
              value={form.price}
              onChange={handleFormChange}
              placeholder="Price"
              min={0}
              max={99999999.99}
              step="0.01"
              required
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <CategorySelector
              value={form.category}
              onChange={(value) => setForm(prev => ({ ...prev, category: value }))}
              existingCategories={existingCategories}
            />
            <input
              name="description"
              value={form.description}
              onChange={handleFormChange}
              placeholder="Description"
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <label className="flex items-center space-x-2">
              <input
                name="available"
                type="checkbox"
                checked={form.available}
                onChange={handleFormChange}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span>Available</span>
            </label>
            <div className="flex space-x-2 mt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                {editItem ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditItem(null); }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Simple Menu List */}
      <div className="flex-1 overflow-y-auto bg-white">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-300 mb-4 text-4xl">🍽️</div>
            <p className="text-gray-600 font-medium">No items found</p>
            <p className="text-gray-400 text-sm mt-1">Try different search terms</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => (
              <div 
                key={item.id}
                className={`
                  flex items-center justify-between px-6 py-4 cursor-pointer transition-colors
                  ${item.available 
                    ? 'hover:bg-gray-50' 
                    : 'opacity-50 cursor-not-allowed'
                  }
                `}
                onClick={() => {
                  if (!isCRUD && onAddToOrder && item.available) {
                    onAddToOrder(item);
                    setSearchTerm(''); // Clear search after adding item
                  }
                }}
              >
                {/* Item Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price & Status */}
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">
                    ₹{item.price}
                  </span>
                  
                  <div className={`w-2 h-2 rounded-full ${
                    item.available ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  
                  {!isCRUD && item.available && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToOrder!(item);
                        setSearchTerm(''); // Clear search after adding item
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium px-2"
                    >
                      →
                    </button>
                  )}
                  
                  {isCRUD && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this item?')) deleteMenuItem!(item.id);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                
                {!item.available && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 rounded-lg">
                    <span className="text-red-600 font-medium text-sm bg-white px-3 py-1 rounded-full border border-red-200">OUT OF STOCK</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}