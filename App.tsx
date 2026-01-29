import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { CustomerList } from './components/CustomerList';
import { InventoryList } from './components/InventoryList';
import { OrderBuilder } from './components/OrderBuilder';
import { SyncDashboard } from './components/SyncDashboard';
import { InvoicePreview } from './components/InvoicePreview';
import { OrderHistory } from './components/OrderHistory';
import { Settings } from './components/Settings';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Reports } from './components/Reports';
import { Customer, Order } from './types';
import { db } from './services/db';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveTab('orders');
  };

  const handleOrderCreated = (order: Order) => {
    setActiveOrder(order);
  };

  const handleInvoiceClose = () => {
    setActiveOrder(null);
    setSelectedCustomer(null);
    setActiveTab('history');
  };

  const handleViewInvoice = (order: Order) => {
      const customers = db.getCustomers();
      const customer = customers.find(c => c.customer_id === order.customer_id);
      if (customer) {
          setSelectedCustomer(customer);
          setActiveOrder(order);
      }
  };

  if (!isAuthenticated) {
      return authView === 'login' 
        ? <Login onToggleRegister={() => setAuthView('register')} /> 
        : <Register onToggleLogin={() => setAuthView('login')} />;
  }

  const renderContent = () => {
    if (activeOrder && selectedCustomer) {
        return <InvoicePreview 
            order={activeOrder} 
            customer={selectedCustomer} 
            settings={db.getSettings()} 
            onClose={handleInvoiceClose} 
        />;
    }

    switch (activeTab) {
      case 'home':
        return <Dashboard onAction={(tab) => setActiveTab(tab)} />;
      case 'customers':
        return <CustomerList onSelectCustomer={handleSelectCustomer} />;
      case 'inventory':
        return <InventoryList />;
      case 'orders':
        if (!selectedCustomer) {
            return (
                <div className="space-y-4">
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-center">
                        <p className="text-indigo-700 font-bold">Select a shop to start a new order</p>
                    </div>
                    <CustomerList onSelectCustomer={handleSelectCustomer} />
                </div>
            );
        }
        return <OrderBuilder 
            onCancel={() => {
                setSelectedCustomer(null);
                setActiveTab('home');
            }} 
            onOrderCreated={handleOrderCreated}
            existingCustomer={selectedCustomer || undefined} 
        />;
      case 'history':
        return <OrderHistory onViewInvoice={handleViewInvoice} />;
      case 'reports':
        return <Reports />;
      case 'sync':
        return <SyncDashboard onSyncComplete={() => setIsSyncing(!isSyncing)} />;
      case 'settings':
        return <Settings onLogout={logout} />;
      default:
        return <div className="text-center p-10">Select a tab</div>;
    }
  };

  return (
    <Layout 
        activeTab={activeTab} 
        onTabChange={(tab) => {
            if (activeTab === 'orders' && selectedCustomer && tab !== 'orders') {
                if(!window.confirm("Abandon current order?")) return;
                setSelectedCustomer(null);
            }
            setActiveTab(tab);
        }}
        onSync={() => setActiveTab('sync')}
        isSyncing={isSyncing}
    >
      {renderContent()}
    </Layout>
  );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
