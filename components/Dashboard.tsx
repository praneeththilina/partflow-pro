import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Layout } from './Layout';

interface DashboardProps {
    onAction: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onAction }) => {
    const [stats, setStats] = useState(db.getDashboardStats());
    const [recentOrders, setRecentOrders] = useState(db.getOrders().slice(0, 5));

    useEffect(() => {
        const interval = setInterval(() => {
            setStats(db.getDashboardStats());
            setRecentOrders(db.getOrders().slice(0, 5));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6 pb-20 md:pb-0 px-2">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Command Center</h2>
                <span className="text-xs font-medium text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Today's Sales</p>
                    <p className="text-2xl font-black text-indigo-600">Rs.{stats.dailySales.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">This Month</p>
                    <p className="text-2xl font-black text-slate-800">Rs.{stats.monthlySales.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer active:scale-95 transition-transform" onClick={() => onAction('inventory')}>
                    <p className="text-[10px] uppercase font-bold text-rose-400 tracking-wider mb-1">Critical Stock</p>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-black text-rose-600">{stats.criticalItems}</p>
                        {stats.criticalItems > 0 && <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer active:scale-95 transition-transform" onClick={() => onAction('history')}>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Orders</p>
                    <p className="text-2xl font-black text-slate-800">{stats.totalOrders}</p>
                </div>
            </div>

            {/* Quick Actions Section */}
            <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button 
                        onClick={() => onAction('customers')}
                        className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-colors border border-white/5"
                    >
                        <span className="font-bold">New Sale</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    </button>
                    <button 
                        onClick={() => onAction('inventory')}
                        className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-colors border border-white/5"
                    >
                        <span className="font-bold">Inventory</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                    <button 
                        onClick={() => onAction('sync')}
                        className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-colors border border-white/5"
                    >
                        <span className="font-bold">Sync HQ</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    </button>
                </div>
            </div>

            {/* Low Stock Alerts Mini List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {stats.criticalItems > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-800 text-sm">Low Stock Alerts</h3>
                            <span className="text-[10px] text-rose-500 font-black uppercase bg-rose-50 px-2 py-0.5 rounded">Restock Required</span>
                        </div>
                        <div className="divide-y divide-slate-50 overflow-y-auto max-h-80">
                            {db.getItems()
                                .filter(i => i.current_stock_qty <= i.low_stock_threshold)
                                .map(item => (
                                    <div key={item.item_id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{item.item_display_name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono uppercase">{item.item_number}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-rose-600">{item.current_stock_qty}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Remaining</p>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* Recent Transactions Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-black text-slate-800 text-sm">Recent Transactions</h3>
                        <button onClick={() => onAction('history')} className="text-[10px] text-indigo-600 font-black uppercase hover:underline">View All</button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {recentOrders.length === 0 && <p className="p-8 text-center text-slate-400 text-sm italic">No recent activity.</p>}
                        {recentOrders.map(order => (
                            <div key={order.order_id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">
                                        {db.getCustomers().find(c => c.customer_id === order.customer_id)?.shop_name || 'Unknown Shop'}
                                    </p>
                                    <p className="text-[10px] text-slate-400">{order.order_date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-800">Rs.{order.net_total.toLocaleString()}</p>
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${order.sync_status === 'synced' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {order.sync_status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
