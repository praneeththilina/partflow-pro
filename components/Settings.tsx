import React, { useState } from 'react';
import { CompanySettings } from '../types';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface SettingsProps {
    onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onLogout }) => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<CompanySettings>(db.getSettings());
    const [message, setMessage] = useState('');

    const handleLogout = () => {
        onLogout();
    };

    const handleSave = () => {
        db.saveSettings(settings);
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="max-w-xl mx-auto space-y-6 pb-20 md:pb-0">
            <h2 className="text-2xl font-bold text-slate-800 px-2">Bill Head Settings</h2>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black">
                            {user?.username[0].toUpperCase() || '?'}
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-800">{user?.full_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.role}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
                <hr className="border-slate-50" />
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <input 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={settings.company_name}
                        onChange={e => setSettings({...settings, company_name: e.target.value})}
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address (on Bill)</label>
                    <textarea 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        rows={3}
                        value={settings.address}
                        onChange={e => setSettings({...settings, address: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                        <input 
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={settings.phone}
                            onChange={e => setSettings({...settings, phone: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sales Rep Name</label>
                        <input 
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={settings.rep_name}
                            onChange={e => setSettings({...settings, rep_name: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Prefix</label>
                    <input 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={settings.invoice_prefix}
                        onChange={e => setSettings({...settings, invoice_prefix: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency Symbol</label>
                    <input 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={settings.currency_symbol || 'Rs.'}
                        onChange={e => setSettings({...settings, currency_symbol: e.target.value})}
                        placeholder="e.g. Rs., $, ₹"
                    />
                </div>

                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                    <div>
                        <label className="block text-sm font-bold text-slate-800">Auto-Generate SKU</label>
                        <p className="text-xs text-slate-500">Automatically create SKU based on item description (e.g. "Brake Pad" -{'>'} BP01)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={settings.auto_sku_enabled || false}
                            onChange={e => setSettings({...settings, auto_sku_enabled: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bill Footer Note</label>
                    <textarea 
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        rows={2}
                        value={settings.footer_note}
                        onChange={e => setSettings({...settings, footer_note: e.target.value})}
                    />
                </div>

                <div className="pt-4 flex flex-col items-center gap-3">
                    <button 
                        onClick={handleSave}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Save Bill Head
                    </button>
                    {message && <p className="text-emerald-600 font-medium text-sm animate-bounce">{message}</p>}
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Pro Tip:</strong> These settings are stored locally on this device. Make sure to set these up before sharing invoices.
                </p>
            </div>
        </div>
    );
};
