import React, { useState, useEffect } from 'react';
import { Customer, Item, Order, OrderLine } from '../types';
import { db } from '../services/db';
import { generateUUID } from '../utils/uuid';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';

interface OrderBuilderProps {
    onCancel: () => void;
    onOrderCreated: (order: Order) => void;
    existingCustomer?: Customer;
}

export const OrderBuilder: React.FC<OrderBuilderProps> = ({ onCancel, onOrderCreated, existingCustomer }) => {
    const { user } = useAuth();
    const [customer] = useState<Customer | undefined>(existingCustomer);
    const [items, setItems] = useState<Item[]>([]);
    const [lines, setLines] = useState<OrderLine[]>([]);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [discountRate, setDiscountRate] = useState<number>(existingCustomer?.discount_rate || 0);
    
    // UI State
    const [itemFilter, setItemFilter] = useState('');
    const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog'); // Mobile Toggle
    const [showScanner, setShowScanner] = useState(false);
    
    // Add Item Modal/State
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [qtyInput, setQtyInput] = useState<string>('1');

    useEffect(() => {
        const allItems = db.getItems();
        // Deduplicate by SKU (item_number) to ensure same SKU doesn't show multiple lines
        const uniqueItems: Item[] = [];
        const skus = new Set();
        allItems.forEach(item => {
            if (!skus.has(item.item_number)) {
                skus.add(item.item_number);
                uniqueItems.push(item);
            }
        });
        setItems(uniqueItems);
    }, []);

    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;
        if (showScanner) {
            scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
            scanner.render((decodedText) => {
                setItemFilter(decodedText);
                setShowScanner(false);
                if (scanner) scanner.clear();
            }, () => {});
        }
        return () => {
            if (scanner) scanner.clear().catch(e => console.error("Scanner Cleanup Error", e));
        };
    }, [showScanner]);

    const grossTotal = lines.reduce((sum, line) => sum + line.line_total, 0);
    const discountValue = grossTotal * discountRate;
    const netTotal = grossTotal - discountValue;

    const addItem = () => {
        if (!selectedItem) return;
        const qty = parseInt(qtyInput);
        
        if (isNaN(qty) || qty <= 0) return;
        if (qty > selectedItem.current_stock_qty) {
            alert(`Insufficient stock. Only ${selectedItem.current_stock_qty} available.`);
            return;
        }

        const existingLineIndex = lines.findIndex(l => l.item_id === selectedItem.item_id);
        if (existingLineIndex >= 0) {
             const newLines = [...lines];
             const newQty = newLines[existingLineIndex].quantity + qty;
             if (newQty > selectedItem.current_stock_qty) {
                 alert("Total quantity exceeds stock.");
                 return;
             }
             newLines[existingLineIndex].quantity = newQty;
             newLines[existingLineIndex].line_total = newQty * selectedItem.unit_value;
             setLines(newLines);
        } else {
            const newLine: OrderLine = {
                line_id: generateUUID(),
                order_id: '',
                item_id: selectedItem.item_id,
                item_name: `${selectedItem.item_name} - ${selectedItem.vehicle_model} - ${selectedItem.source_brand}`, // Format for invoice
                quantity: qty,
                unit_value: selectedItem.unit_value,
                line_total: qty * selectedItem.unit_value
            };
            setLines([...lines, newLine]);
        }
        setSelectedItem(null);
        setQtyInput('1');
        // On mobile, show a small feedback or stay on catalog? Stay on catalog.
    };

    const removeLine = (lineId: string) => {
        setLines(lines.filter(l => l.line_id !== lineId));
    };

    const handleConfirmOrder = () => {
        if (!customer) return;
        if (lines.length === 0) return;
        if (!window.confirm("Confirming this order will deduce stock. Continue?")) return;

        const orderId = generateUUID();
        const finalLines = lines.map(l => ({...l, order_id: orderId}));

        const newOrder: Order = {
            order_id: orderId,
            customer_id: customer.customer_id,
            rep_id: user?.id.toString(),
            order_date: orderDate,
            discount_rate: discountRate,
            gross_total: grossTotal,
            discount_value: discountValue,
            net_total: netTotal,
            order_status: 'confirmed',
            lines: finalLines,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'pending'
        };

        finalLines.forEach(line => {
            db.updateStock(line.item_id, -line.quantity);
        });

        db.saveOrder(newOrder);
        onOrderCreated(newOrder);
    };

    const filteredItems = items.filter(i => 
        (i.item_display_name.toLowerCase().includes(itemFilter.toLowerCase()) ||
        i.item_number.toLowerCase().includes(itemFilter.toLowerCase()) ||
        (i.source_brand && i.source_brand.toLowerCase().includes(itemFilter.toLowerCase()))) &&
        i.status === 'active'
    );

    if (!customer) return <div className="p-4 text-center">Please select a customer first.</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]">
            
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center rounded-t-xl shadow-sm shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">{customer.shop_name}</h2>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Invoice Date:</span>
                        <input 
                            type="date" 
                            value={orderDate} 
                            onChange={e => setOrderDate(e.target.value)} 
                            className="bg-slate-50 border-none p-0 text-xs focus:ring-0 text-indigo-600 font-medium" 
                        />
                    </div>
                </div>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            {/* Mobile Tabs */}
            <div className="md:hidden flex border-b border-slate-200 bg-white">
                <button 
                    onClick={() => setMobileTab('catalog')} 
                    className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${mobileTab === 'catalog' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
                >
                    Catalog
                </button>
                <button 
                    onClick={() => setMobileTab('cart')} 
                    className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${mobileTab === 'cart' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
                >
                    Cart ({lines.length})
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50 relative">
                
                {/* Catalog Pane (Left on Desktop, Tab 1 on Mobile) */}
                <div className={`w-full md:w-3/5 flex flex-col h-full ${mobileTab === 'catalog' ? 'block' : 'hidden md:flex'}`}>
                    {/* Search & Scan */}
                    <div className="p-3 bg-white border-b border-slate-100 flex items-center gap-2">
                        <input 
                            placeholder="Search parts or SKU..." 
                            className="flex-1 p-2.5 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            value={itemFilter}
                            onChange={e => setItemFilter(e.target.value)}
                        />
                        <button 
                            onClick={() => setShowScanner(!showScanner)}
                            className={`p-2 rounded-lg transition-colors ${showScanner ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v-3m0 4h3m-3 4h3m-6 0h3m0-4h.01M9 16h.01" /></svg>
                        </button>
                    </div>

                    {showScanner && (
                        <div className="px-3 pb-3 bg-white border-b">
                            <div className="rounded-xl overflow-hidden border-2 border-indigo-500">
                                <div id="reader"></div>
                            </div>
                        </div>
                    )}
                    
                    {/* Item List */}
                    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2">
                        {filteredItems.map(item => (
                            <div 
                                key={item.item_id} 
                                onClick={() => setSelectedItem(item)}
                                className={`bg-white p-3 rounded-xl border shadow-sm cursor-pointer transition-all active:scale-[0.98] ${selectedItem?.item_id === item.item_id ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-800 text-sm truncate">{item.item_display_name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase font-medium tracking-tight">
                                            {item.item_number} • {item.vehicle_model}
                                        </div>
                                        <div className="text-[10px] text-indigo-500 font-bold">{item.source_brand}</div>
                                    </div>
                                    <div className="text-right pl-2">
                                        <div className="font-bold text-indigo-700 text-sm">Rs.{item.unit_value.toLocaleString()}</div>
                                        <div className={`text-[10px] font-bold ${item.current_stock_qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            Qty: {item.current_stock_qty}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cart Pane (Right on Desktop, Tab 2 on Mobile) */}
                <div className={`w-full md:w-2/5 flex flex-col h-full border-l border-slate-200 bg-white ${mobileTab === 'cart' ? 'block' : 'hidden md:flex'}`}>
                     <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Order Summary</h3>
                     </div>
                     
                     {/* Cart Lines */}
                     <div className="flex-1 overflow-y-auto p-0">
                        {lines.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                <p className="text-sm">No items added yet</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {lines.map(line => (
                                    <li key={line.line_id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-900 line-clamp-1">{line.item_name}</div>
                                            <div className="text-xs text-slate-500">
                                                {line.quantity} x ${line.unit_value.toFixed(2)}
                                            </div>
                                        </div>
                                         <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-800">Rs.{line.line_total.toLocaleString()}</span>
                                            <button onClick={() => removeLine(line.line_id)} className="text-slate-300 hover:text-rose-500 p-1">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>

                                    </li>
                                ))}
                            </ul>
                        )}
                     </div>

                     {/* Footer Totals */}
                     <div className="p-4 border-t border-slate-200 bg-slate-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                        <div className="space-y-2 mb-4">
                             <div className="flex justify-between text-sm text-slate-600">
                                 <span>Subtotal</span>
                                 <span>Rs.{grossTotal.toLocaleString()}</span>
                             </div>

                            <div className="flex justify-between items-center text-sm text-slate-600">
                                <span>Discount</span>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" step="0.01" 
                                        className="w-16 p-1 text-right text-xs border rounded focus:ring-indigo-500"
                                        value={discountRate}
                                        onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                                    />
                                    <span className="text-rose-600">-${discountValue.toFixed(2)}</span>
                                </div>
                            </div>
                             <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                                 <span>Total</span>
                                 <span>Rs.{netTotal.toLocaleString()}</span>
                             </div>

                        </div>
                        <button 
                            onClick={handleConfirmOrder}
                            disabled={lines.length === 0}
                            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-[0.98] transition-all"
                        >
                            Confirm Order
                        </button>
                     </div>
                </div>

                {/* Mobile Floating Action Button (Cart) */}
                {mobileTab === 'catalog' && lines.length > 0 && (
                    <button 
                        onClick={() => setMobileTab('cart')}
                        className="md:hidden absolute bottom-4 right-4 bg-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5"
                    >
                        <span>View Cart</span>
                        <span className="bg-white text-indigo-600 text-xs px-2 py-0.5 rounded-full">{lines.length}</span>
                    </button>
                )}
            </div>

            {/* Quantity Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 pb-safe">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">{selectedItem.item_display_name}</h3>
                            <p className="text-sm text-slate-500">Available: {selectedItem.current_stock_qty}</p>
                        </div>
                        
                        <div className="flex items-center justify-center gap-4 mb-8">
                             <button onClick={() => setQtyInput(Math.max(1, parseInt(qtyInput)-1).toString())} className="w-12 h-12 rounded-full bg-slate-100 text-2xl font-bold text-slate-600 hover:bg-slate-200">-</button>
                             <input 
                                type="number" 
                                className="w-24 text-center text-3xl font-bold border-b-2 border-indigo-500 focus:outline-none" 
                                value={qtyInput}
                                onChange={e => setQtyInput(e.target.value)}
                             />
                             <button onClick={() => setQtyInput((parseInt(qtyInput)+1).toString())} className="w-12 h-12 rounded-full bg-slate-100 text-2xl font-bold text-slate-600 hover:bg-slate-200">+</button>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setSelectedItem(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Cancel</button>
                            <button onClick={addItem} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">Add Item</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};