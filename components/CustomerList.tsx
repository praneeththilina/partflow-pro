import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { db } from '../services/db';
import { generateUUID } from '../utils/uuid';

interface CustomerListProps {
  onSelectCustomer: (customer: Customer) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({ onSelectCustomer }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({});

  useEffect(() => {
    setCustomers(db.getCustomers());
  }, []);

  const handleSaveCustomer = () => {
    if (!newCustomer.shop_name || !newCustomer.city_ref) {
        alert("Shop Name and City are required");
        return;
    }

    const customer: Customer = editingCustomer ? {
        ...editingCustomer,
        shop_name: newCustomer.shop_name || editingCustomer.shop_name,
        address: newCustomer.address || editingCustomer.address,
        phone: newCustomer.phone || editingCustomer.phone,
        city_ref: newCustomer.city_ref || editingCustomer.city_ref,
        discount_rate: newCustomer.discount_rate ?? editingCustomer.discount_rate,
        updated_at: new Date().toISOString(),
        sync_status: 'pending'
    } : {
      customer_id: generateUUID(),
      shop_name: newCustomer.shop_name || '',
      address: newCustomer.address || '',
      phone: newCustomer.phone || '',
      city_ref: newCustomer.city_ref || '',
      discount_rate: (newCustomer.discount_rate || 0),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    };

    db.saveCustomer(customer);
    setCustomers(db.getCustomers());
    setShowAddForm(false);
    setEditingCustomer(null);
    setNewCustomer({});
  };

  const startEdit = (e: React.MouseEvent, customer: Customer) => {
      e.stopPropagation();
      setEditingCustomer(customer);
      setNewCustomer(customer);
      setShowAddForm(true);
  };

  const filteredCustomers = customers.filter(c => 
    c.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.city_ref.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper for avatars
  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      
      {/* Search & Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center sticky top-0 bg-slate-50 pt-2 pb-2 z-10">
        <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
            </div>
            <input 
                type="text"
                placeholder="Search shops or cities..."
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <button 
            onClick={() => setShowAddForm(true)}
            className="hidden md:flex bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-semibold shadow-md transition-transform active:scale-95 items-center space-x-2"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            <span>New Customer</span>
        </button>
      </div>

      {/* Mobile FAB */}
      <button 
        onClick={() => setShowAddForm(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 rounded-full text-white shadow-lg flex items-center justify-center z-40 active:bg-indigo-700"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
      </button>

      {/* Add Form Modal/Card */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h3>
                    <button onClick={() => { setShowAddForm(false); setEditingCustomer(null); }} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name *</label>
                        <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newCustomer.shop_name || ''} onChange={e => setNewCustomer({...newCustomer, shop_name: e.target.value})} placeholder="e.g. City Auto Parts" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newCustomer.city_ref || ''} onChange={e => setNewCustomer({...newCustomer, city_ref: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newCustomer.phone || ''} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} type="tel" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                        <textarea className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" rows={2} value={newCustomer.address || ''} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Discount Rate (0.1 = 10%)</label>
                        <input type="number" step="0.01" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newCustomer.discount_rate || ''} onChange={e => setNewCustomer({...newCustomer, discount_rate: parseFloat(e.target.value)})} placeholder="0.00" />
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                    <button onClick={handleSaveCustomer} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 shadow-sm">{editingCustomer ? 'Update' : 'Save Customer'}</button>
                    <button onClick={() => { setShowAddForm(false); setEditingCustomer(null); }} className="flex-1 bg-white text-slate-700 border border-slate-300 py-3 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {/* Customer Grid/List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => (
            <button 
                key={customer.customer_id} 
                onClick={() => onSelectCustomer(customer)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left flex items-start space-x-4 group"
            >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {getInitials(customer.shop_name)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="text-base font-bold text-slate-900 truncate pr-2">{customer.shop_name}</h3>
                        <div className="flex items-center gap-2">
                            {customer.outstanding_balance > 0 && (
                                <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200">
                                    Due: Rs.{customer.outstanding_balance.toLocaleString()}
                                </span>
                            )}
                            <button 
                                onClick={(e) => startEdit(e, customer)}
                                className="text-slate-400 hover:text-indigo-600 p-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            {customer.sync_status === 'pending' && (
                                <span className="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full" title="Pending Sync"></span>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{customer.city_ref}</p>
                    <div className="mt-2 flex items-center text-xs text-slate-400 space-x-2">
                        <span>{customer.phone || 'No Phone'}</span>
                        <span>•</span>
                        <span className="text-indigo-600 font-medium">{(customer.discount_rate * 100).toFixed(0)}% Deal</span>
                    </div>
                </div>
            </button>
        ))}
      </div>
      
      {filteredCustomers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900">No customers found</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-1">Start by adding a new customer or try a different search.</p>
        </div>
      )}
    </div>
  );
};