import React, { useEffect, useState } from 'react';
import { SyncStats } from '../types';
import { db } from '../services/db';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onSync, isSyncing }) => {
  const [stats, setStats] = useState<SyncStats>({ pendingCustomers: 0, pendingItems: 0, pendingOrders: 0 });

  const refreshStats = () => {
    setStats(db.getSyncStats());
  };

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 2000);
    return () => clearInterval(interval);
  }, [isSyncing]);

  const totalPending = stats.pendingCustomers + stats.pendingItems + stats.pendingOrders;

  const tabs = [
    { id: 'home', label: 'Home', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    )},
    { id: 'customers', label: 'Shops', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    )},
    { id: 'orders', label: 'Orders', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    )},
    { id: 'history', label: 'History', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
    { id: 'inventory', label: 'Inventory', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    )},
    { id: 'reports', label: 'Reports', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    )},
    { id: 'sync', label: 'Sync', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
    )},
    { id: 'settings', label: 'Settings', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
  ];

  const topBarIds = ['settings', 'sync', 'reports'];
  const topBarTabs = tabs.filter(t => topBarIds.includes(t.id));
  const bottomNavTabs = tabs.filter(t => !topBarIds.includes(t.id));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Desktop Header */}
      <header className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-200">PF</div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">PartFlow <span className="text-indigo-600">Pro</span></h1>
          </div>
          
          <nav className="flex space-x-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === 'sync' && totalPending > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">{totalPending}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-indigo-700 text-white p-2 px-4 sticky top-0 z-50 shadow-md no-print">
         <div className="flex justify-between items-center h-12">
            <h1 className="text-sm font-black tracking-wider truncate">
                PARTFLOW <span className="text-indigo-300">PRO</span>
            </h1>

            <div className="flex items-center gap-1">
                {topBarTabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`p-2 rounded-lg relative ${activeTab === tab.id ? 'bg-indigo-800 text-white' : 'text-indigo-200'}`}
                    >
                        {tab.icon}
                        {tab.id === 'sync' && totalPending > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full border border-indigo-700"></span>
                        )}
                    </button>
                ))}
                
                {totalPending > 0 && (
                    <div className="flex items-center justify-center bg-indigo-800 h-8 px-2 rounded ml-1 min-w-[24px]">
                        <span className="text-[10px] font-bold">{totalPending}</span>
                    </div>
                )}
            </div>
         </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-8 mb-20 md:mb-0 print:p-0 print:m-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 pb-safe no-print">
        <div className="flex justify-around items-center h-16">
          {bottomNavTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                {tab.icon}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
};