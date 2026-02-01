import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Preferences } from '@capacitor/preferences';
import { formatCurrency } from '../utils/currency';

interface DashboardProps {
    onAction: (tab: string) => void;
    onViewOrder: (order: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onAction, onViewOrder }) => {
    const [stats, setStats] = useState(db.getDashboardStats());
    const [recentOrders, setRecentOrders] = useState(db.getOrders().slice(0, 5));
    const settings = db.getSettings();

    useEffect(() => {
        const updateWidget = async () => {
            const currentStats = db.getDashboardStats();
            setStats(currentStats);
            setRecentOrders(db.getOrders().slice(0, 5));

            // Sync Data to Widget Storage
            await Preferences.set({
                key: 'widget_daily_sales',
                value: formatCurrency(currentStats.dailySales)
            });
            await Preferences.set({
                key: 'widget_last_update',
                value: `Updated: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
            });
        };

        // Initial update
        updateWidget();

        const interval = setInterval(updateWidget, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6 pb-20 md:pb-0 px-2">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Rep</span>
                    </h2>
                    <p className="text-slate-500 font-medium text-sm">Let's crush today's targets.</p>
                </div>
                <div className="text-right hidden md:block">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today</span>
                     <p className="text-slate-800 font-bold">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 rounded-3xl shadow-lg shadow-indigo-200 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                    </div>
                    <p className="text-xs uppercase font-bold text-indigo-200 tracking-wider mb-2">Today's Sales</p>
                    <p className="text-3xl font-black tracking-tight">{formatCurrency(stats.dailySales)}</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                    <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2 relative z-10">This Month</p>
                    <p className="text-3xl font-black text-slate-800 relative z-10">{formatCurrency(stats.monthlySales)}</p>
                </div>

                {settings.stock_tracking_enabled ? (
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all group" onClick={() => onAction('inventory')}>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs uppercase font-bold text-rose-400 tracking-wider">Critical Stock</p>
                            {stats.criticalItems > 0 && <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>}
                        </div>
                        <p className="text-3xl font-black text-rose-600 group-hover:scale-110 origin-left transition-transform">{stats.criticalItems}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Items below threshold</p>
                    </div>
                ) : (
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                         <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">Platform Status</p>
                         <p className="text-3xl font-black text-emerald-600">Online</p>
                         <p className="text-[10px] text-slate-400 font-medium mt-1">Stock tracking disabled</p>
                    </div>
                )}

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all group" onClick={() => onAction('history')}>
                    <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">Total Orders</p>
                    <p className="text-3xl font-black text-slate-800 group-hover:scale-110 origin-left transition-transform">{stats.totalOrders}</p>
                    <p className="text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-50 inline-block px-1.5 rounded">All Time</p>
                </div>
            </div>

            {/* Quick Actions Section */}
            <div>
                <h3 className="text-lg font-black text-slate-800 mb-4 px-1">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button 
                        onClick={() => onAction('customers')}
                        className="flex flex-col items-center justify-center bg-indigo-50 hover:bg-indigo-100 p-6 rounded-3xl transition-colors group"
                    >
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                        </div>
                        <span className="font-bold text-indigo-900 text-sm">New Sale</span>
                    </button>

                    <button 
                        onClick={() => onAction('inventory')}
                        className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-indigo-300 p-6 rounded-3xl transition-colors group"
                    >
                        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                        </div>
                        <span className="font-bold text-slate-700 text-sm">Inventory</span>
                    </button>

                    <button 
                        onClick={() => onAction('sync')}
                        className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-indigo-300 p-6 rounded-3xl transition-colors group"
                    >
                        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        </div>
                        <span className="font-bold text-slate-700 text-sm">Sync Data</span>
                    </button>
                    
                    <button 
                        onClick={() => onAction('reports')}
                        className="flex flex-col items-center justify-center bg-white border border-slate-200 hover:border-indigo-300 p-6 rounded-3xl transition-colors group"
                    >
                        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                        </div>
                        <span className="font-bold text-slate-700 text-sm">Reports</span>
                    </button>
                </div>
            </div>

            {/* Conditional Lists Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {settings.stock_tracking_enabled && stats.criticalItems > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-800 text-sm">Low Stock Alerts</h3>
                            <span className="text-[10px] text-rose-500 font-black uppercase bg-rose-50 px-2 py-0.5 rounded">Restock Required</span>
                        </div>
                        <div className="divide-y divide-slate-50 overflow-y-auto max-h-80">
                            {db.getItems()
                                .filter(i => i.current_stock_qty <= i.low_stock_threshold)
                                .map(item => (
                                    <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 leading-tight">{item.item_display_name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-1 rounded">{item.vehicle_model}</span>
                                                <span className="text-[10px] text-slate-400 font-mono uppercase">{item.item_number}</span>
                                            </div>
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
                            <div 
                                key={order.order_id} 
                                onClick={() => onViewOrder(order)}
                                className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer active:bg-slate-100"
                            >
                                <div>
                                    <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">
                                        {db.getCustomers().find(c => c.customer_id === order.customer_id)?.shop_name || 'Unknown Shop'}
                                    </p>
                                    <p className="text-[10px] text-slate-400">{order.order_date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-800">{formatCurrency(order.net_total)}</p>
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
