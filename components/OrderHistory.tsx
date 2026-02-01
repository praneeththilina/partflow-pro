import React, { useState, useEffect } from 'react';
import { Order, Customer } from '../types';
import { db } from '../services/db';
import { pdfService } from '../services/pdf';

interface OrderHistoryProps {
    onViewInvoice: (order: Order) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ onViewInvoice }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        setOrders(db.getOrders().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setCustomers(db.getCustomers());
    }, []);

    const getCustomerName = (id: string) => customers.find(c => c.customer_id === id)?.shop_name || 'Unknown';
    const getCustomer = (id: string) => customers.find(c => c.customer_id === id);

    const filteredOrders = orders.filter(o => 
        getCustomerName(o.customer_id).toLowerCase().includes(filter.toLowerCase()) ||
        o.order_id.toLowerCase().includes(filter.toLowerCase())
    );

    const handleShare = (order: Order) => {
        const customer = getCustomer(order.customer_id);
        if (customer) {
            pdfService.shareInvoice(order, customer, db.getSettings());
        }
    };

    const handleDelete = (order: Order) => {
        if (order.sync_status === 'synced') {
            alert("Cannot delete orders that have already been synced to the server.");
            return;
        }
        if (window.confirm("Are you sure you want to delete this order? Stock will be restored.")) {
            db.deleteOrder(order.order_id);
            setOrders(db.getOrders().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
    };

    return (
        <div className="space-y-4 pb-20 md:pb-0">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-10">
                <input 
                    type="text"
                    placeholder="Search by shop name or order ID..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
            </div>

            <div className="space-y-3">
                {filteredOrders.map(order => (
                    <div key={order.order_id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-slate-900">{getCustomerName(order.customer_id)}</h3>
                                <p className="text-[10px] text-slate-400 font-mono">{order.order_id.substring(0, 8).toUpperCase()}</p>
                            </div>
                            <div className="text-right">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    order.sync_status === 'synced' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                    {order.sync_status === 'synced' ? 'SYNCED' : 'PENDING'}
                                </span>
                                <p className="text-xs text-slate-500 mt-1">{order.order_date}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                            <div>
                                <p className="text-xs text-slate-500">{order.lines.length} items</p>
                                <p className="text-lg font-black text-indigo-700">Rs.{order.net_total.toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onViewInvoice(order)}
                                    className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 transition-colors"
                                    title="View/Print Invoice"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </button>
                                <button 
                                    onClick={() => handleShare(order)}
                                    className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                    title="Share PDF"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                </button>
                                {order.sync_status !== 'synced' && (
                                    <button 
                                        onClick={() => handleDelete(order)}
                                        className="bg-rose-50 text-rose-600 p-2 rounded-lg hover:bg-rose-100 transition-colors"
                                        title="Delete Order (Restore Stock)"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredOrders.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <p>No orders found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
