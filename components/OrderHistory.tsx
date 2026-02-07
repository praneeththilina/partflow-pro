import React, { useState, useEffect } from 'react';
import { Order, Customer, DeliveryStatus } from '../types';
import { db } from '../services/db';
import { pdfService } from '../services/pdf';
import { formatCurrency } from '../utils/currency';
import { cleanText } from '../utils/cleanText';
import { useTheme } from '../context/ThemeContext';

import { Modal } from './ui/Modal';

interface OrderHistoryProps {
    onViewInvoice: (order: Order) => void;
    onEditOrder?: (order: Order) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ onViewInvoice, onEditOrder }) => {
    const { themeClasses } = useTheme();
    const [orders, setOrders] = useState<Order[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filter, setFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [visibleCount, setVisibleCount] = useState(20);
    const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

    useEffect(() => {
        setOrders([...db.getOrders()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setCustomers([...db.getCustomers()]);
    }, []);

    useEffect(() => {
        setVisibleCount(20);
    }, [filter]);

    const getCustomerName = (id: string) => {
        const name = customers.find(c => c.customer_id === id)?.shop_name || 'Unknown';
        return cleanText(name);
    };
    const getCustomer = (id: string) => customers.find(c => c.customer_id === id);

    const filteredOrders = orders.filter(o => 
        getCustomerName(o.customer_id).toLowerCase().includes(filter.toLowerCase()) ||
        o.order_id.toLowerCase().includes(filter.toLowerCase())
    );

    const groupedOrders = filteredOrders.slice(0, visibleCount).reduce((groups, order) => {
        const date = order.order_date;
        if (!groups[date]) groups[date] = [];
        groups[date].push(order);
        return groups;
    }, {} as Record<string, Order[]>);

    const sortedDates = Object.keys(groupedOrders).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const handleShare = (order: Order) => {
        const customer = getCustomer(order.customer_id);
        if (customer) {
            pdfService.shareInvoice(order, customer, db.getSettings());
        }
    };

    const handleDelete = async (order: Order) => {
        if (order.sync_status === 'synced') {
            setConfirmConfig({
                isOpen: true,
                title: "Cannot Delete",
                message: "This order has already been synced to the server.",
                onConfirm: () => setConfirmConfig(null)
            });
            return;
        }
        
        setConfirmConfig({
            isOpen: true,
            title: "Delete Order?",
            message: "Are you sure you want to delete this order? Stock will be restored.",
            onConfirm: async () => {
                await db.deleteOrder(order.order_id);
                setOrders([...db.getOrders()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
                setConfirmConfig(null);
            }
        });
    };

    const handleUpdateDelivery = async (status: DeliveryStatus) => {
        if (!selectedOrder) return;
        await db.updateDeliveryStatus(selectedOrder.order_id, status);
        setOrders([...db.getOrders()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setShowDeliveryModal(false);
        setSelectedOrder(null);
    };

    const getDeliveryColor = (status: DeliveryStatus) => {
        switch (status) {
            case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'out_for_delivery': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'shipped': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'failed': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'cancelled': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-100';
        }
    };

    return (
        <div className="space-y-4 pb-20 md:pb-0">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 sticky top-0 z-20 mx-2 mt-2">
                <input 
                    type="text"
                    placeholder="Search by shop name or order ID..."
                    className={`w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 ${themeClasses.ring} outline-none transition-shadow`}
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
            </div>

            <div className="pb-20">
                {sortedDates.map(date => (
                    <div key={date} className="mb-6">
                        <h3 className="sticky top-[4.5rem] bg-slate-50/95 backdrop-blur-sm py-3 px-4 text-xs font-black uppercase text-slate-400 z-10 border-b border-slate-100 flex justify-between items-center">
                            <span>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{groupedOrders[date].length}</span>
                        </h3>
                        <div className="space-y-3 px-2 mt-2">
                            {groupedOrders[date].map(order => (
                                <div key={order.order_id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.99] transition-transform">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm">{getCustomerName(order.customer_id)}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                    #{order.order_id.substring(0, 6).toUpperCase()}
                                                </span>
                                                {order.delivery_status && (
                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border ${getDeliveryColor(order.delivery_status)}`}>
                                                        {order.delivery_status.replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-sm ${themeClasses.textDark}`}>{formatCurrency(order.net_total)}</p>
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                {order.payment_status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                        <p className="text-xs text-slate-400 font-medium">{order.lines.length} Items</p>
                                        
                                        <div className="flex gap-2">
                                            {/* Action Buttons */}
                                            <button 
                                                onClick={() => { setSelectedOrder(order); setShowDeliveryModal(true); }}
                                                className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                                                title="Delivery"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                            </button>
                                            
                                            {order.sync_status !== 'synced' && (order.delivery_status === 'pending' || !order.delivery_status) && onEditOrder && (
                                                <button 
                                                    onClick={() => onEditOrder(order)}
                                                    className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                                                    title="Edit"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                            )}

                                            <button 
                                                onClick={() => onViewInvoice(order)}
                                                className={`p-2 rounded-xl ${themeClasses.bgSoft} ${themeClasses.text} hover:${themeClasses.bgSoftHover} transition-colors`}
                                                title="Invoice"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredOrders.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        </div>
                        <p className="font-bold text-slate-500">No orders found.</p>
                        <p className="text-xs">Try searching for a different shop.</p>
                    </div>
                )}

                {visibleCount < filteredOrders.length && (
                    <div className="text-center py-4">
                        <button 
                            onClick={() => setVisibleCount(prev => prev + 20)}
                            className={`px-6 py-2 rounded-full font-bold text-sm bg-white border border-slate-200 shadow-sm hover:bg-slate-50 ${themeClasses.text} transition-all active:scale-95`}
                        >
                            Load More ({filteredOrders.length - visibleCount} remaining)
                        </button>
                    </div>
                )}
            </div>

            {/* Delivery Status Modal */}
            {showDeliveryModal && selectedOrder && (
                <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4">
                    <div className="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 pb-20 md:pb-6 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 mb-1">Update Delivery</h3>
                                <p className="text-xs font-mono text-slate-500">#{selectedOrder.order_id.substring(0, 6).toUpperCase()}</p>
                            </div>
                            <button onClick={() => { setShowDeliveryModal(false); setSelectedOrder(null); }} className="bg-slate-100 p-2 rounded-full text-slate-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 mb-4">
                            {(['pending', 'shipped', 'out_for_delivery', 'delivered', 'failed', 'cancelled'] as DeliveryStatus[]).map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleUpdateDelivery(status)}
                                    className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold text-left border-2 transition-all flex items-center justify-between ${
                                        selectedOrder.delivery_status === status 
                                        ? `${themeClasses.border} ${themeClasses.bgSoft} ${themeClasses.text}` 
                                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                    }`}
                                >
                                    <span className="uppercase tracking-wide text-xs">{status.replace(/_/g, ' ')}</span>
                                    {selectedOrder.delivery_status === status && (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {/* Confirmation Modal */}
            {confirmConfig && (
                <Modal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(null)}
                    confirmText="Delete"
                    type="danger"
                />
            )}
        </div>
    );
};
