import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Order, Item, Customer } from '../types';
import { pdfService } from '../services/pdf';
import { formatCurrency } from '../utils/currency';

import { InvoicePreview } from './InvoicePreview';

type ReportView = 'overview' | 'revenue' | 'category' | 'customer' | 'stock' | 'invoice';

export const Reports: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [view, setView] = useState<ReportView>('overview');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [stockFilter, setStockFilter] = useState<'all' | 'out' | 'in'>('all');
    const [dateRange, setDateRange] = useState({ 
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
    });

    const settings = db.getSettings();

    useEffect(() => {
        setOrders(db.getOrders());
        setItems(db.getItems());
        setCustomers(db.getCustomers());
    }, []);

    // Filtered data
    const filteredOrders = orders.filter(o => o.order_date >= dateRange.start && o.order_date <= dateRange.end);
    
    // Aggregations
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.net_total, 0);
    const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

    // Sales by Category
    const categorySales: Record<string, { total: number, qty: number }> = {};
    filteredOrders.forEach(o => {
        o.lines.forEach(l => {
            const item = items.find(i => i.item_id === l.item_id);
            const cat = item?.category || 'Uncategorized';
            if (!categorySales[cat]) categorySales[cat] = { total: 0, qty: 0 };
            categorySales[cat].total += l.line_total;
            categorySales[cat].qty += l.quantity;
        });
    });

    const maxCatSales = Math.max(...Object.values(categorySales).map(c => c.total), 1);

    // Top Customers
    const customerStats: Record<string, number> = {};
    filteredOrders.forEach(o => {
        customerStats[o.customer_id] = (customerStats[o.customer_id] || 0) + o.net_total;
    });

    const topCustomers = Object.entries(customerStats)
        .sort((a, b) => b[1] - a[1])
        .map(([id, total]) => {
            const customer = customers.find(c => c.customer_id === id);
            const customerOrders = filteredOrders.filter(o => o.customer_id === id);
            return {
                id,
                name: customer?.shop_name || 'Unknown',
                totalGross: customerOrders.reduce((sum, o) => sum + o.gross_total, 0),
                totalDisc1: customerOrders.reduce((sum, o) => sum + o.discount_value, 0),
                totalDisc2: customerOrders.reduce((sum, o) => sum + (o.secondary_discount_value || 0), 0),
                totalPaid: customerOrders.reduce((sum, o) => sum + (o.paid_amount || 0), 0),
                totalBalance: customerOrders.reduce((sum, o) => sum + (o.balance_due || 0), 0),
                invoiceCount: customerOrders.length,
                total
            };
        });

    const handleDrillDown = (newView: ReportView, id: string | null = null) => {
        setView(newView);
        setSelectedId(id);
    };

    const renderOverview = () => (
        <>
            {/* Performance Overviews */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                    onClick={() => handleDrillDown('revenue')}
                    className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
                >
                    <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-widest mb-1">Period Revenue</p>
                    <p className="text-3xl font-black">{formatCurrency(totalRevenue)}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-100">
                        <span className="bg-white/20 px-2 py-1 rounded-lg">{filteredOrders.length} Invoices</span>
                        <span className="underline text-[10px]">View All →</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => handleDrillDown('stock')}>
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform"></div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 relative z-10">Inventory Health</p>
                    <p className="text-3xl font-black text-slate-800 relative z-10">{items.length} SKUs</p>
                    <p className="text-[10px] font-bold text-indigo-600 mt-2 relative z-10">View Stock Reports →</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Customer Reach</p>
                    <p className="text-3xl font-black text-slate-800">{Object.keys(customerStats).length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Sales by Category Chart */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-black text-slate-800 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
                            Revenue by Category
                        </div>
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(categorySales).length === 0 && <p className="text-slate-400 text-sm italic">No data for this period.</p>}
                        {Object.entries(categorySales).map(([cat, data]) => (
                            <div 
                                key={cat} 
                                className="space-y-1 cursor-pointer group"
                                onClick={() => handleDrillDown('category', cat)}
                            >
                                <div className="flex justify-between text-xs font-bold text-slate-600 px-1 group-hover:text-indigo-600 transition-colors">
                                    <span>{cat} ({data.qty} items)</span>
                                    <span>{formatCurrency(data.total)}</span>
                                </div>
                                <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${(data.total / maxCatSales) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Customers Table */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2">
                    <h3 className="font-black text-slate-800 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                            Customer Sales Performance
                        </div>
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                            <thead>
                                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                    <th className="pb-4 px-2">Shop Name</th>
                                    <th className="pb-4 px-2 text-right">Inv Count</th>
                                    <th className="pb-4 px-2 text-right">Gross Total</th>
                                    <th className="pb-4 px-2 text-right text-rose-500">Disc Total</th>
                                    <th className="pb-4 px-2 text-right">Net Total</th>
                                    <th className="pb-4 px-2 text-right text-emerald-600">Recovery</th>
                                    <th className="pb-4 px-2 text-right text-rose-600">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {topCustomers.length === 0 && (
                                    <tr><td colSpan={7} className="py-4 text-slate-400 text-sm italic">No sales found.</td></tr>
                                )}
                                {topCustomers.map((c, i) => (
                                    <tr 
                                        key={i} 
                                        className="group cursor-pointer hover:bg-slate-50"
                                        onClick={() => handleDrillDown('customer', c.id)}
                                    >
                                        <td className="py-3 px-2 font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{c.name}</td>
                                        <td className="py-3 px-2 text-right font-medium text-slate-500 text-xs">{c.invoiceCount}</td>
                                        <td className="py-3 px-2 text-right font-medium text-slate-500 text-xs">{formatCurrency(c.totalGross, false)}</td>
                                        <td className="py-3 px-2 text-right font-medium text-rose-500 text-xs">-{formatCurrency(c.totalDisc1 + c.totalDisc2, false)}</td>
                                        <td className="py-3 px-2 text-right font-bold text-slate-900 text-xs">{formatCurrency(c.total, false)}</td>
                                        <td className="py-3 px-2 text-right font-bold text-emerald-600 text-xs">{formatCurrency(c.totalPaid, false)}</td>
                                        <td className="py-3 px-2 text-right font-black text-rose-600 text-sm">{formatCurrency(c.totalBalance, false)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );

    const renderRevenueDetails = () => (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center no-print">
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Sales Transaction Journal</h3>
                <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">{filteredOrders.length} records</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50/50">
                        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Invoice #</th>
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4 text-right">Gross</th>
                            <th className="px-6 py-4 text-right">Net</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredOrders.sort((a, b) => b.order_date.localeCompare(a.order_date)).map(o => (
                            <tr key={o.order_id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-600">{o.order_date}</td>
                                <td className="px-6 py-4 font-mono font-bold text-indigo-600">{settings.invoice_prefix}{o.order_id.substring(0, 6).toUpperCase()}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">
                                    {customers.find(c => c.customer_id === o.customer_id)?.shop_name || 'Deleted Customer'}
                                </td>
                                <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(o.gross_total)}</td>
                                <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(o.net_total)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-900 text-white font-black">
                        <tr>
                            <td colSpan={4} className="px-6 py-4 text-right uppercase tracking-widest text-[10px]">Total Period Revenue</td>
                            <td className="px-6 py-4 text-right">{formatCurrency(totalRevenue)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );

    const renderStockReport = () => {
        let filteredItems = items;
        if (stockFilter === 'out') {
            filteredItems = items.filter(i => settings.stock_tracking_enabled ? i.current_stock_qty <= 0 : i.is_out_of_stock);
        } else if (stockFilter === 'in') {
            filteredItems = items.filter(i => settings.stock_tracking_enabled ? i.current_stock_qty > 0 : !i.is_out_of_stock);
        }

        return (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Inventory Status Report</h3>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                        {(['all', 'out', 'in'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setStockFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${stockFilter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                <th className="px-6 py-4">Item Name / SKU</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Origin</th>
                                <th className="px-6 py-4 text-right">Price</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredItems.map(item => (
                                <tr key={item.item_id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{item.item_display_name}</div>
                                        <div className="text-[10px] font-mono text-slate-400">{item.item_number}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{item.category}</td>
                                    <td className="px-6 py-4 text-slate-500">{item.source_brand}</td>
                                    <td className="px-6 py-4 text-right font-bold">{formatCurrency(item.unit_value)}</td>
                                    <td className="px-6 py-4 text-center">
                                        {settings.stock_tracking_enabled ? (
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase border ${item.current_stock_qty > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                {item.current_stock_qty} Qty
                                            </span>
                                        ) : (
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase border ${!item.is_out_of_stock ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                {!item.is_out_of_stock ? 'In Stock' : 'Out Stock'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderCategoryDetails = () => {
        const catLines: any[] = [];
        filteredOrders.forEach(o => {
            o.lines.forEach(l => {
                const item = items.find(i => i.item_id === l.item_id);
                if (item?.category === selectedId) {
                    catLines.push({ ...l, date: o.order_date, customerId: o.customer_id });
                }
            });
        });

        return (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center no-print">
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Category Report: {selectedId}</h3>
                    <span className="text-xs font-bold text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-100">
                        {categorySales[selectedId || ''].qty} items sold
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Product Name</th>
                                <th className="px-6 py-4 text-center">Qty</th>
                                <th className="px-6 py-4 text-right">Unit Price</th>
                                <th className="px-6 py-4 text-right">Line Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {catLines.sort((a,b) => b.date.localeCompare(a.date)).map((l, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500">{l.date}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{l.item_name}</td>
                                    <td className="px-6 py-4 text-center font-bold text-indigo-600">{l.quantity}</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(l.unit_value)}</td>
                                    <td className="px-6 py-4 text-right font-black">{formatCurrency(l.line_total)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white font-black">
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-right uppercase tracking-widest text-[10px]">Category Contribution</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(categorySales[selectedId || ''].total)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        );
    };

    const renderCustomerDetails = () => {
        const customer = customers.find(c => c.customer_id === selectedId);
        const custOrders = filteredOrders.filter(o => o.customer_id === selectedId);
        const totalPurchased = custOrders.reduce((sum, o) => sum + o.net_total, 0);
        const totalPaid = custOrders.reduce((sum, o) => sum + (o.paid_amount || 0), 0);
        const totalBalance = custOrders.reduce((sum, o) => sum + (o.balance_due || 0), 0);

        return (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <div className="p-6 bg-slate-50 border-b border-slate-100 no-print flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">{customer?.shop_name}</h3>
                        <p className="text-xs text-slate-500 font-bold">{customer?.city_ref} • {customer?.phone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handlePrint}
                            className="bg-white p-2 text-slate-600 rounded-full border shadow-sm active:scale-90 transition-all"
                            title="Print Shop Ledger"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </button>
                        <button 
                            onClick={() => setView('overview')}
                            className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
                        >
                            ← Back
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Inv #</th>
                                <th className="px-6 py-4">Delivery</th>
                                <th className="px-6 py-4 text-center">Recovery</th>
                                <th className="px-6 py-4 text-right">Items</th>
                                <th className="px-6 py-4 text-right">Net Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {custOrders.sort((a,b) => b.order_date.localeCompare(a.order_date)).map(o => (
                                <tr 
                                    key={o.order_id} 
                                    className="hover:bg-slate-50 cursor-pointer group"
                                    onClick={() => {
                                        setSelectedOrder(o);
                                        setView('invoice');
                                    }}
                                >
                                    <td className="px-6 py-4 text-slate-500">{o.order_date}</td>
                                    <td className="px-6 py-4 font-mono font-bold text-indigo-600 group-hover:underline">
                                        {settings.invoice_prefix}{o.order_id.substring(0, 6).toUpperCase()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                            o.delivery_status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                            o.delivery_status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500'
                                        }`}>
                                            {o.delivery_status || 'pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                            o.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                            o.payment_status === 'partial' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                        }`}>
                                            {o.payment_status || 'unpaid'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-500">{o.lines.length}</td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(o.net_total, false)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white font-black border-t-4 border-slate-800">
                            <tr>
                                <td colSpan={5} className="px-6 py-3 text-right uppercase tracking-widest text-[9px] text-slate-400">Total Bill Volume</td>
                                <td className="px-6 py-3 text-right text-sm">{formatCurrency(totalPurchased, false)}</td>
                            </tr>
                            <tr className="bg-slate-800">
                                <td colSpan={5} className="px-6 py-3 text-right uppercase tracking-widest text-[9px] text-emerald-400">Total Recovered</td>
                                <td className="px-6 py-3 text-right text-sm text-emerald-400">-{formatCurrency(totalPaid, false)}</td>
                            </tr>
                            <tr className="bg-slate-900 border-t border-slate-700">
                                <td colSpan={5} className="px-6 py-4 text-right uppercase tracking-widest text-[10px]">Net Outstanding Balance</td>
                                <td className="px-6 py-4 text-right text-lg text-rose-500 underline decoration-double underline-offset-4">{formatCurrency(totalBalance)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        );
    };

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const fileName = `Report_${view}_${dateRange.start}_to_${dateRange.end}.pdf`;
            await pdfService.generatePdfFromElement('#report-content', fileName);
        } catch (error) {
            alert("Failed to generate PDF report.");
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="space-y-6 pb-20 md:pb-0 px-2 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
                <div className="flex items-center gap-3">
                    {view !== 'overview' && (
                        <button 
                            onClick={() => setView('overview')}
                            className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                    )}
                    <h2 className="text-2xl font-black text-slate-800">
                        {view === 'overview' ? 'Business Intelligence' : 
                         view === 'revenue' ? 'Revenue Analytics' :
                         view === 'category' ? 'Category Drill-down' : 
                         view === 'stock' ? 'Inventory Status' : 'Shop History'}
                    </h2>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                    <input 
                        type="date" 
                        className="text-xs font-bold text-slate-600 bg-transparent outline-none"
                        value={dateRange.start}
                        onChange={e => setDateRange({...dateRange, start: e.target.value})}
                    />
                    <span className="text-slate-300">→</span>
                    <input 
                        type="date" 
                        className="text-xs font-bold text-slate-600 bg-transparent outline-none"
                        value={dateRange.end}
                        onChange={e => setDateRange({...dateRange, end: e.target.value})}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div id="report-content" className="bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-sm text-slate-900">
                {/* PDF Header (Visible only during print capture) */}
                <div id="pdf-header" className="hidden text-center border-b-2 border-slate-900 pb-6 mb-10">
                    <h1 className="text-[32px] font-black uppercase text-black m-0 tracking-tighter">{settings.company_name}</h1>
                    <p className="text-[12px] font-bold text-slate-600 mt-1">{settings.address}</p>
                    <div className="mt-6 inline-block bg-slate-900 text-white px-6 py-2 rounded-lg font-black text-sm tracking-widest uppercase">
                        {view === 'overview' ? 'Business Summary' : 
                         view === 'revenue' ? 'Transaction Journal' :
                         view === 'customer' ? 'Shop Performance Ledger' : 
                         view === 'stock' ? 'Inventory Status' : 'System Report'}
                    </div>
                    <div className="flex justify-between mt-8 text-[10px] font-black text-slate-500 uppercase">
                        <span>Period: {dateRange.start} to {dateRange.end}</span>
                        <span>Generated: {new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                {view === 'overview' && renderOverview()}
                {view === 'revenue' && renderRevenueDetails()}
                {view === 'category' && renderCategoryDetails()}
                {view === 'customer' && renderCustomerDetails()}
                {view === 'stock' && renderStockReport()}
                {view === 'invoice' && selectedOrder && (
                    <InvoicePreview 
                        order={selectedOrder} 
                        customer={customers.find(c => c.customer_id === selectedOrder.customer_id)!} 
                        settings={settings} 
                        onClose={() => setView('customer')} 
                    />
                )}
            </div>

            {/* Global Actions */}
            <div className="flex justify-center pt-4 no-print">
                <button 
                    onClick={handlePrint} 
                    disabled={isPrinting}
                    className={`flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 ${isPrinting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'}`}
                >
                    {isPrinting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    )}
                    {isPrinting ? 'Generating PDF...' : 'Download PDF Report'}
                </button>
            </div>
        </div>
    );
};
