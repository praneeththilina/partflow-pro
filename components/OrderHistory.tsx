import React, { useState, useEffect } from 'react';
import { Order, Customer, DeliveryStatus } from '../types';
import { db } from '../services/db';
import { pdfService } from '../services/pdf';
import { formatCurrency } from '../utils/currency';

interface OrderHistoryProps {
    onViewInvoice: (order: Order) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ onViewInvoice }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filter, setFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);

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

    const handleUpdateDelivery = async (status: DeliveryStatus) => {
        if (!selectedOrder) return;
        await db.updateDeliveryStatus(selectedOrder.order_id, status);
        setOrders(db.getOrders().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
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
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] text-slate-400 font-mono">{order.order_id.substring(0, 8).toUpperCase()}</p>
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border ${getDeliveryColor(order.delivery_status || 'pending')}`}>
                                        {order.delivery_status || 'pending'}
                                    </span>
                                </div>
                            </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-900 text-sm">{formatCurrency(order.net_total)}</p>
                                    <p className={`text-[10px] font-bold uppercase ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {order.payment_status}
                                    </p>
                                </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                            <div>
                                <p className="text-xs text-slate-500">{order.lines.length} items</p>
                                <p className="text-lg font-black text-indigo-700">{formatCurrency(order.net_total)}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        setSelectedOrder(order);
                                        setShowDeliveryModal(true);
                                    }}
                                    className="bg-slate-50 text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                    title="Update Delivery Status"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                </button>
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

            {/* Delivery Status Modal */}
            {showDeliveryModal && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-black text-slate-800 mb-1">Update Delivery</h3>
                        <p className="text-sm text-slate-500 mb-6">Order #{selectedOrder.order_id.substring(0,8).toUpperCase()}</p>
                        
                        <div className="grid grid-cols-1 gap-2 mb-8">
                            {(['pending', 'shipped', 'out_for_delivery', 'delivered', 'failed', 'cancelled'] as DeliveryStatus[]).map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleUpdateDelivery(status)}
                                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-left border-2 transition-all flex items-center justify-between ${
                                        selectedOrder.delivery_status === status 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                    }`}
                                >
                                    <span className="uppercase tracking-wide">{status.replace(/_/g, ' ')}</span>
                                    {selectedOrder.delivery_status === status && (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => { setShowDeliveryModal(false); setSelectedOrder(null); }}
                            className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
