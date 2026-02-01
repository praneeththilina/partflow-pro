import React from 'react';
import { Order, Customer, CompanySettings, OrderLine } from '../types';
import { pdfService } from '../services/pdf';
import { formatCurrency } from '../utils/currency';

interface InvoicePreviewProps {
    order: Order;
    customer: Customer;
    settings: CompanySettings;
    onClose: () => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ order, customer, settings, onClose }) => {
    
    // Pagination Logic
    const ITEMS_PER_PAGE_1 = 20; // Maximum items on first page
    const ITEMS_PER_PAGE_REST = 20; // Maximum items on subsequent pages

    const paginateLines = (lines: OrderLine[]) => {
        const pages: OrderLine[][] = [];
        if (lines.length <= 20) {
            pages.push(lines);
            return pages;
        }

        // First page
        pages.push(lines.slice(0, ITEMS_PER_PAGE_1));
        
        // Remaining pages
        let remaining = lines.slice(ITEMS_PER_PAGE_1);
        while (remaining.length > 0) {
            pages.push(remaining.slice(0, ITEMS_PER_PAGE_REST));
            remaining = remaining.slice(ITEMS_PER_PAGE_REST);
        }
        return pages;
    };

    const linePages = paginateLines(order.lines);

    const handleDownload = async () => {
        try {
            await pdfService.generateInvoice(order, customer, settings, '.invoice-page');
        } catch (error) {
            console.error(error);
            alert("Failed to generate PDF. Check console for details.");
        }
    };

    const handleShare = async () => {
        try {
            await pdfService.shareInvoice(order, customer, settings, '.invoice-page');
        } catch (error) {
            console.error(error);
            alert("Failed to share PDF.");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 z-50 overflow-y-auto flex justify-center p-0 md:p-4">
            <div className="w-full max-w-5xl bg-white shadow-2xl flex flex-col relative min-h-screen md:min-h-0 md:rounded-lg overflow-hidden">
                
                {/* Controls Bar */}
                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-slate-50 z-50 md:rounded-t-lg">
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleShare} 
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm active:scale-95 text-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            Share
                        </button>
                        <button 
                            onClick={handleDownload} 
                            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-slate-200 active:scale-95 text-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download
                        </button>
                    </div>
                </div>

                {/* Actual Invoice Content */}
                <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-200 flex flex-col items-center gap-8 text-black">
                    {linePages.map((pageLines, pageIndex) => {
                        const isFirstPage = pageIndex === 0;
                        const isLastPage = pageIndex === linePages.length - 1;
                        const isMultiPage = linePages.length > 1;

                        const previousLines = linePages.slice(0, pageIndex).flat();
                        const previousTotal = previousLines.reduce((sum, l) => sum + l.line_total, 0);
                        const currentPageTotal = pageLines.reduce((sum, l) => sum + l.line_total, 0);
                        const cumulativeTotal = previousTotal + currentPageTotal;

                        return (
                            <div 
                                key={pageIndex}
                                className="invoice-page bg-white text-black p-[15mm] w-[210mm] min-h-[297mm] shadow-lg font-sans text-[12px] leading-tight relative flex flex-col shrink-0"
                            >
                                {/* Header */}
                                {isFirstPage ? (
                                    <div className="text-center border-b-2 border-black pb-2 mb-5">
                                        <h1 className="text-[28px] font-black text-black m-0 leading-none uppercase">{settings.company_name}</h1>
                                        <p className="mt-1 font-medium">{settings.address}</p>
                                        <p className="m-0 font-medium">Tel: {settings.phone}</p>
                                        <p className="m-0 font-medium">Email: vidushan.motors@gmail.com</p>
                                        <div className="text-[22px] font-bold underline mt-4 uppercase">INVOICE</div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between border-b border-black pb-2 mb-5">
                                        <span className="font-bold uppercase text-black">{settings.company_name} - Page {pageIndex + 1}</span>
                                        <span className="font-bold">Inv: {settings.invoice_prefix}{order.order_id.substring(0, 6).toUpperCase()}</span>
                                    </div>
                                )}

                                {/* Info Grid - Only on First Page */}
                                {isFirstPage && (
                                    <div className="flex justify-between mb-5">
                                        <div className="w-1/2 text-black">
                                            <p className="font-bold mb-1">Bill To:</p>
                                            <div className="font-bold text-[14px] uppercase">{customer.shop_name}</div>
                                            <p>{customer.address}</p>
                                            <p>{customer.city_ref}</p>
                                            <p className="mt-1">Tel: {customer.phone}</p>
                                        </div>
                                        <div className="w-[40%] text-black">
                                            <div className="flex mb-1">
                                                <span className="w-24 font-bold">Date:</span>
                                                <span>{order.order_date}</span>
                                            </div>
                                            <div className="flex mb-1">
                                                <span className="w-24 font-bold">Invoice No:</span>
                                                <span>{settings.invoice_prefix}{order.order_id.substring(0, 6).toUpperCase()}</span>
                                            </div>
                                            <div className="flex mb-1">
                                                <span className="w-24 font-bold">Rep Name:</span>
                                                <span>{settings.rep_name || 'A'}</span>
                                            </div>
                                            <div className="flex mb-1">
                                                <span className="w-24 font-bold">Terms:</span>
                                                <span>CREDIT 90 DAYS</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Items Table */}
                                <table className="w-full border-collapse mb-5 text-black border border-slate-300">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="border border-slate-300 p-2 w-[5%] text-center">No</th>
                                            <th className="border border-slate-300 p-2 w-[55%] text-center">Description</th>
                                            <th className="border border-slate-300 p-2 w-[10%] text-center">Qty</th>
                                            <th className="border border-slate-300 p-2 w-[15%] text-center">Price Each</th>
                                            <th className="border border-slate-300 p-2 w-[15%] text-center">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageLines.map((line, idx) => {
                                            const globalIdx = linePages.slice(0, pageIndex).flat().length + idx;
                                            return (
                                                <tr key={line.line_id}>
                                                    <td className="border border-slate-300 p-1.5 text-center">{globalIdx + 1}</td>
                                                    <td className="border border-slate-300 p-1.5">{line.item_name}</td>
                                                    <td className="border border-slate-300 p-1.5 text-center">{line.quantity}</td>
                                                    <td className="border border-slate-300 p-1.5 text-right">{formatCurrency(line.unit_value)}</td>
                                                    <td className="border border-slate-300 p-1.5 text-right">{formatCurrency(line.line_total)}</td>
                                                </tr>
                                            );
                                        })}
                                        {/* Page Subtotal for split tables */}
                                        {isMultiPage && !isLastPage && (
                                            <tr className="font-bold bg-slate-50">
                                                <td colSpan={4} className="border border-slate-300 p-2 text-right uppercase italic text-[10px]">Sub Total (Carried Forward)</td>
                                                <td className="border border-slate-300 p-2 text-right underline decoration-double">
                                                    {formatCurrency(cumulativeTotal)}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Last Page Summary & Footer */}
                                {isLastPage && (
                                    <div className="no-break text-black mt-auto">
                                        <div className="flex justify-end">
                                            <table className="w-[45%] border-collapse border border-black">
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-black px-2 py-2 text-left align-middle font-medium">Gross Total</td>
                                                        <td className="border border-black px-2 py-2 text-right align-middle font-bold">
                                                            {formatCurrency(order.gross_total)}
                                                        </td>
                                                    </tr>
                                                    {order.discount_value > 0 && (
                                                        <tr>
                                                            <td className="border border-black px-2 py-2 text-left align-middle text-rose-600 font-medium">
                                                                Discount ({(order.discount_rate * 100).toFixed(0)}%)
                                                            </td>
                                                            <td className="border border-black px-2 py-2 text-right align-middle text-rose-600 font-bold">
                                                                -{formatCurrency(order.discount_value)}
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <tr className="bg-slate-50">
                                                        <td className="border border-black px-2 py-2 text-left align-middle font-bold text-[14px]">Net Total</td>
                                                        <td className="border border-black px-2 py-2 text-right align-middle font-bold text-[14px]">
                                                            {formatCurrency(order.net_total)}
                                                        </td>
                                                    </tr>
                                                    {order.paid_amount > 0 && (
                                                        <tr>
                                                            <td className="border border-black px-2 py-2 text-left align-middle font-medium text-emerald-700">
                                                                Paid Amount
                                                            </td>
                                                            <td className="border border-black px-2 py-2 text-right align-middle font-bold text-emerald-700">
                                                                - {formatCurrency(order.paid_amount)}
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {order.balance_due > 0.5 && (
                                                        <tr className="bg-rose-50">
                                                            <td className="border border-black px-2 py-3 text-left align-middle font-black text-[16px] text-rose-700">Balance Due</td>
                                                            <td className="border border-black px-2 py-3 text-right align-middle font-black text-[16px] text-rose-700">
                                                                {formatCurrency(order.balance_due)}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {order.balance_due <= 0.5 && (
                                            <div className="absolute bottom-40 right-10 transform -rotate-12 border-4 border-emerald-600 text-emerald-600 font-black text-4xl px-4 py-2 rounded-lg opacity-50 pointer-events-none">
                                                PAID IN FULL
                                            </div>
                                        )}

                                        <div className="flex justify-between mt-12 mb-10">
                                            <div className="w-[30%] border-t border-dashed border-slate-400 pt-1.5 text-center text-[11px] font-bold">Customer Signature</div>
                                            <div className="w-[30%] border-t border-dashed border-slate-400 pt-1.5 text-center text-[11px] font-bold">Signature of Sales Rep</div>
                                            <div className="w-[30%] border-t border-dashed border-slate-400 pt-1.5 text-center text-[11px] font-bold">Checked by</div>
                                        </div>
                                    </div>
                                )}

                                {/* Page Number Footer */}
                                <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-slate-400">
                                    Page {pageIndex + 1} of {linePages.length}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
