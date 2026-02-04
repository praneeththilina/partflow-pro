import React, { useState, useEffect } from 'react';
import { Item, StockAdjustment } from '../types';
import { db } from '../services/db';
import { generateUUID } from '../utils/uuid';
import { formatCurrency } from '../utils/currency';
import { generateSKU } from '../utils/skuGenerator';

import { Modal } from './ui/Modal';

export const InventoryList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'A-Z' | 'High-Low' | 'Low-High'>('A-Z');
  
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Modals
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
      isOpen: boolean, 
      title: string, 
      message: string, 
      type: 'info' | 'danger' | 'success',
      onConfirm?: () => void,
      onCancel?: () => void,
      confirmText?: string
  } | null>(null);
  
  // State
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItem, setNewItem] = useState<Partial<Item>>({});
  const [skuLocked, setSkuLocked] = useState(true);
  
  // Adjustment State
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'restock' | 'damage'>('restock');
  const [adjustReason, setAdjustReason] = useState('');

  const settings = db.getSettings();

  useEffect(() => {
    setItems(db.getItems());
  }, []);

  const categories = ['All', settings.stock_tracking_enabled ? 'Low Stock' : 'Out of Stock', ...Array.from(new Set(items.map(i => i.category || 'Uncategorized')))].filter(Boolean) as string[];

  const showAlert = (title: string, message: string, type: 'info' | 'danger' | 'success' = 'info') => {
      setAlertConfig({ isOpen: true, title, message, type });
  };

  const handleSaveItem = async () => {
    if (!newItem.item_display_name || !newItem.item_number || !newItem.unit_value) {
        showAlert("Missing Info", "Name, SKU, and Price are required", "danger");
        return;
    }

    // Duplicate Check: Same Name + Same Model + Same Country
    const isDuplicate = items.some(i => 
        i.item_id !== editingItem?.item_id && // Ignore self
        i.item_display_name.toLowerCase() === newItem.item_display_name?.toLowerCase() &&
        i.vehicle_model.toLowerCase() === newItem.vehicle_model?.toLowerCase() &&
        i.source_brand.toLowerCase() === newItem.source_brand?.toLowerCase()
    );

    if (isDuplicate) {
        showAlert("Duplicate Detected", "An item with this Name, Model, and Country already exists.", "danger");
        return;
    }

    const item: Item = editingItem ? {
        ...editingItem,
        item_display_name: newItem.item_display_name || editingItem.item_display_name,
        item_name: newItem.item_name || editingItem.item_name,
        item_number: newItem.item_number || editingItem.item_number,
        vehicle_model: newItem.vehicle_model || editingItem.vehicle_model,
        source_brand: newItem.source_brand || editingItem.source_brand,
        category: newItem.category || editingItem.category || 'Uncategorized',
        unit_value: newItem.unit_value ?? editingItem.unit_value,
        current_stock_qty: newItem.current_stock_qty ?? editingItem.current_stock_qty,
        low_stock_threshold: newItem.low_stock_threshold ?? editingItem.low_stock_threshold ?? 10,
        is_out_of_stock: newItem.is_out_of_stock ?? editingItem.is_out_of_stock,
        updated_at: new Date().toISOString(),
        sync_status: 'pending'
    } : {
      item_id: generateUUID(),
      item_display_name: newItem.item_display_name || '',
      item_name: newItem.item_name || newItem.item_display_name || '',
      item_number: newItem.item_number || '',
      vehicle_model: newItem.vehicle_model || '',
      source_brand: newItem.source_brand || '',
      category: newItem.category || 'Uncategorized',
      unit_value: newItem.unit_value || 0,
      current_stock_qty: newItem.current_stock_qty || 0,
      low_stock_threshold: newItem.low_stock_threshold || 10,
      is_out_of_stock: false,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    };

    await db.saveItem(item);
    setItems([...db.getItems()]); // Spread to force new array reference for React
    setShowAddForm(false);
    setEditingItem(null);
    setNewItem({});
  };

  const handleDescriptionBlur = () => {
      if (!settings.auto_sku_enabled) return;
      if (editingItem) return; 
      if (!newItem.item_display_name) return;

      const existingSKUs = items.map(i => i.item_number);
      const generated = generateSKU(newItem.item_display_name, existingSKUs);
      setNewItem(prev => ({ ...prev, item_number: generated }));
  };

  const startEdit = (item: Item) => {
      setEditingItem(item);
      setNewItem(item);
      setSkuLocked(true); // Always lock by default when editing
      setShowAddForm(true);
  };

  const toggleStockFlag = async (e: React.MouseEvent, item: Item) => {
      e.stopPropagation();
      
      const action = item.is_out_of_stock ? 'In Stock' : 'Out of Stock';
      
      setAlertConfig({
          isOpen: true,
          title: `Mark as ${action}?`,
          message: `Are you sure you want to mark "${item.item_display_name}" as ${action}?`,
          type: item.is_out_of_stock ? 'success' : 'danger',
          onConfirm: async () => {
              const updatedItem = { 
                  ...item, 
                  is_out_of_stock: !item.is_out_of_stock, 
                  sync_status: 'pending' as const, 
                  updated_at: new Date().toISOString() 
              };
              
              // 1. Update Database
              await db.saveItem(updatedItem);
              
              // 2. Immediate UI Update (Local State)
              setItems(prev => prev.map(i => i.item_id === item.item_id ? updatedItem : i));
              
              setAlertConfig(null);
          },
          onCancel: () => setAlertConfig(null)
      } as any);
  };

  const openAdjustModal = (e: React.MouseEvent, item: Item) => {
      e.stopPropagation();
      setAdjustItem(item);
      setAdjustQty('');
      setAdjustType('restock');
      setAdjustReason('');
      setShowAdjustModal(true);
  };

  const handleSaveAdjustment = async () => {
      if (!adjustItem || !adjustQty) return;
      const qty = parseInt(adjustQty);
      if (isNaN(qty) || qty <= 0) {
          alert("Please enter a valid quantity");
          return;
      }

      const adjustment: StockAdjustment = {
          adjustment_id: generateUUID(),
          item_id: adjustItem.item_id,
          adjustment_type: adjustType,
          quantity: qty,
          reason: adjustReason || (adjustType === 'restock' ? 'Manual Restock' : 'Damage/Loss'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: 'pending'
      };

      await db.addStockAdjustment(adjustment);
      setItems([...db.getItems()]);
      setShowAdjustModal(false);
      setAdjustItem(null);
  };

  const handleDeleteItem = () => {
    if (!editingItem) return;
    if (window.confirm("Are you sure you want to delete this item? It will be marked as inactive.")) {
        db.deleteItem(editingItem.item_id);
        setItems(db.getItems());
        setShowAddForm(false);
        setEditingItem(null);
        setNewItem({});
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_display_name.toLowerCase().includes(filter.toLowerCase()) ||
        item.item_number.toLowerCase().includes(filter.toLowerCase());
    
    const matchesModel = !modelFilter || item.vehicle_model.toLowerCase().includes(modelFilter.toLowerCase());
    const matchesCountry = !countryFilter || (item.source_brand && item.source_brand.toLowerCase().includes(countryFilter.toLowerCase()));

    let matchesCategory = true;
    if (categoryFilter === 'Low Stock') {
        matchesCategory = item.current_stock_qty <= item.low_stock_threshold;
    } else if (categoryFilter === 'Out of Stock') {
        matchesCategory = item.is_out_of_stock === true;
    } else if (categoryFilter !== 'All') {
        matchesCategory = item.category === categoryFilter;
    }
    
    return matchesSearch && matchesModel && matchesCountry && matchesCategory && item.status !== 'inactive';
  }).sort((a, b) => {
      if (sortOrder === 'A-Z') return a.item_display_name.localeCompare(b.item_display_name);
      if (sortOrder === 'High-Low') return b.current_stock_qty - a.current_stock_qty;
      if (sortOrder === 'Low-High') return a.current_stock_qty - b.current_stock_qty;
      return 0;
  });


  return (
    <div className="space-y-4 pb-20 md:pb-0">
      
      {/* Header & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-10 space-y-3">
         <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input 
                    type="text"
                    placeholder="Search by Name or SKU..."
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-colors"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                <input 
                    placeholder="Model (e.g. Corolla)" 
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={modelFilter}
                    onChange={e => setModelFilter(e.target.value)}
                />
                <input 
                    placeholder="Country (e.g. China)" 
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={countryFilter}
                    onChange={e => setCountryFilter(e.target.value)}
                />
                <select 
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value as any)}
                >
                    <option value="A-Z">A-Z</option>
                    <option value="High-Low">High Stock</option>
                    <option value="Low-High">Low Stock</option>
                </select>
            </div>

            <button 
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors shrink-0"
                title="Add New Item"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            </button>
         </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {settings.category_enabled && categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                        categoryFilter === cat 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {cat}
                </button>
            ))}
            {!settings.category_enabled && (
                <button
                    onClick={() => setCategoryFilter(categoryFilter === 'All' ? (settings.stock_tracking_enabled ? 'Low Stock' : 'Out of Stock') : 'All')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                        categoryFilter !== 'All' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {categoryFilter === 'All' ? (settings.stock_tracking_enabled ? 'View Low Stock' : 'View Out Stock') : 'View All Items'}
                </button>
            )}
          </div>
         <div className="flex justify-between items-center text-xs text-slate-500 px-1">
            <span>Showing {filteredItems.length} products</span>
            <span>Live Stock</span>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800">{editingItem ? 'Edit Item' : 'New Spare Part'}</h3>
                    <button onClick={() => { setShowAddForm(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Display Name *</label>
                        <input 
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={newItem.item_display_name || ''} 
                            onChange={e => setNewItem({...newItem, item_display_name: e.target.value})} 
                            onBlur={handleDescriptionBlur}
                            placeholder="e.g. Brake Pad (Toyota Corolla)" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SKU / Item Number *</label>
                            <div className="relative">
                                <input 
                                    className={`w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none pr-10 ${skuLocked ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}`} 
                                    value={newItem.item_number || ''} 
                                    onChange={e => setNewItem({...newItem, item_number: e.target.value})} 
                                    placeholder="e.g. BP-102"
                                    readOnly={skuLocked}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setSkuLocked(!skuLocked)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600"
                                >
                                    {skuLocked ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Internal Name</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.item_name || ''} onChange={e => setNewItem({...newItem, item_name: e.target.value})} placeholder="e.g. Brake Pad" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Model</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.vehicle_model || ''} onChange={e => setNewItem({...newItem, vehicle_model: e.target.value})} placeholder="e.g. Corolla 2018" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Source Brand / Country</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.source_brand || ''} onChange={e => setNewItem({...newItem, source_brand: e.target.value})} placeholder="e.g. China" />
                        </div>
                    </div>
                    {settings.category_enabled && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.category || ''} onChange={e => setNewItem({...newItem, category: e.target.value})} placeholder="e.g. Engine" />
                            </div>
                            {settings.stock_tracking_enabled && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Low Stock Threshold</label>
                                    <input type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.low_stock_threshold || ''} onChange={e => setNewItem({...newItem, low_stock_threshold: parseInt(e.target.value)})} placeholder="10" />
                                </div>
                            )}
                        </div>
                    )}
                    {!settings.category_enabled && settings.stock_tracking_enabled && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Low Stock Threshold</label>
                            <input type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.low_stock_threshold || ''} onChange={e => setNewItem({...newItem, low_stock_threshold: parseInt(e.target.value)})} placeholder="10" />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Unit Value (Price) *</label>
                            <input type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.unit_value || ''} onChange={e => setNewItem({...newItem, unit_value: parseFloat(e.target.value)})} placeholder="0.00" />
                        </div>
                        {settings.stock_tracking_enabled && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Opening Stock</label>
                                <input type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.current_stock_qty || ''} onChange={e => setNewItem({...newItem, current_stock_qty: parseInt(e.target.value)})} placeholder="0" />
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                    {editingItem && (
                        <button onClick={handleDeleteItem} className="bg-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold hover:bg-rose-200">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    )}
                    <button onClick={handleSaveItem} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 shadow-sm">{editingItem ? 'Update Item' : 'Add to Inventory'}</button>
                    <button onClick={() => { setShowAddForm(false); setEditingItem(null); }} className="flex-1 bg-white text-slate-700 border border-slate-300 py-3 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                </div>
            </div>
        </div>
      )}
      
      {/* Mobile Card View (default on small) / Desktop Table (default on large) */}
      <div className="hidden md:block bg-white shadow-sm rounded-xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Origin</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                        {settings.stock_tracking_enabled && (
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {filteredItems.map(item => (
                        <tr key={item.item_id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${item.is_out_of_stock ? 'bg-rose-50/50' : ''}`} onClick={() => startEdit(item)}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    {item.sync_status === 'pending' && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" title="Pending Sync"></span>}
                                    <div>
                                        <div className={`text-sm font-bold leading-tight ${item.is_out_of_stock ? 'text-rose-700' : 'text-slate-900'}`}>{item.item_display_name}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">{item.vehicle_model}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{item.item_number}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {item.source_brand}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                                {formatCurrency(item.unit_value)}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {!settings.stock_tracking_enabled && (
                                        <button 
                                            onClick={(e) => toggleStockFlag(e, item)}
                                            className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border transition-all ${
                                                item.is_out_of_stock 
                                                ? 'bg-rose-100 text-rose-700 border-rose-200' 
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            }`}
                                        >
                                            {item.is_out_of_stock ? 'Out of Stock' : 'In Stock'}
                                        </button>
                                    )}
                                    {settings.stock_tracking_enabled && (
                                        <>
                                            <button 
                                                onClick={(e) => openAdjustModal(e, item)}
                                                className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                                            >
                                                Adjust
                                            </button>
                                            {item.current_stock_qty <= item.low_stock_threshold && (
                                                <span className="text-[10px] font-black text-rose-500 uppercase">Low</span>
                                            )}
                                            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-black rounded-lg border ${
                                                item.current_stock_qty > item.low_stock_threshold ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                item.current_stock_qty > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                                            }`}>
                                                {item.current_stock_qty}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Mobile Stacked List */}
      <div className="md:hidden space-y-3">
        {filteredItems.map(item => (
            <div key={item.item_id} onClick={() => startEdit(item)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center active:bg-slate-50">
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                        {item.sync_status === 'pending' && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>}
                        <h4 className={`text-sm font-bold truncate ${item.is_out_of_stock ? 'text-rose-700' : 'text-slate-900'}`}>{item.item_display_name}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-1 rounded">{item.vehicle_model}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.item_number}</span>
                    </div>
                    <div className="mt-1 flex items-center text-[10px] text-slate-500">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">{item.source_brand}</span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end space-y-1">
                    <span className="text-sm font-black text-indigo-700 block">{formatCurrency(item.unit_value)}</span>
                    {!settings.stock_tracking_enabled && (
                        <button 
                            onClick={(e) => toggleStockFlag(e, item)}
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                item.is_out_of_stock 
                                ? 'bg-rose-100 text-rose-600 border-rose-200' 
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}
                        >
                            {item.is_out_of_stock ? 'Out of Stock' : 'In Stock'}
                        </button>
                    )}
                    {settings.stock_tracking_enabled && (
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={(e) => openAdjustModal(e, item)}
                                className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded mr-1"
                            >
                                Adj
                            </button>
                            {item.current_stock_qty <= item.low_stock_threshold && (
                                <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                            )}
                            <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${
                                item.current_stock_qty > item.low_stock_threshold ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                item.current_stock_qty > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                                {item.current_stock_qty}
                            </span>
                        </div>
                    )}
                </div>

            </div>
        ))}
      </div>
      {/* Adjustment Modal */}
      {showAdjustModal && adjustItem && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800">Adjust Stock</h3>
                      <p className="text-sm text-slate-500">{adjustItem.item_display_name}</p>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button 
                              onClick={() => setAdjustType('restock')}
                              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${adjustType === 'restock' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                          >
                              + Restock
                          </button>
                          <button 
                              onClick={() => setAdjustType('damage')}
                              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${adjustType === 'damage' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
                          >
                              - Damage/Loss
                          </button>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
                          <input 
                              type="number" 
                              className="w-full p-3 border-2 border-slate-200 rounded-xl text-2xl font-bold focus:border-indigo-500 focus:outline-none"
                              value={adjustQty}
                              onChange={e => setAdjustQty(e.target.value)}
                              autoFocus
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason (Optional)</label>
                          <input 
                              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:outline-none"
                              value={adjustReason}
                              onChange={e => setAdjustReason(e.target.value)}
                              placeholder="e.g. New shipment arrived"
                          />
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                      <button onClick={handleSaveAdjustment} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">
                          Confirm Adjustment
                      </button>
                      <button onClick={() => setShowAdjustModal(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Alert Modal */}
      {alertConfig && (
          <Modal 
            isOpen={alertConfig.isOpen}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onConfirm={alertConfig.onConfirm || (() => setAlertConfig(null))}
            onCancel={alertConfig.onCancel || (() => setAlertConfig(null))}
            confirmText={alertConfig.confirmText || "OK"}
          />
      )}
    </div>
  );
};