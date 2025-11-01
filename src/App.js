import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, LogOut, Users, DollarSign, TrendingUp, TrendingDown, X, BookOpen, Key, Lock, Download, Upload, Cloud, RefreshCw } from 'lucide-react';
import { API } from './config';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([
    { id: 1, username: 'PARTHI', password: 'parthi123', role: 'admin', name: 'Parthi' },
    { id: 2, username: 'PRABU', password: 'prabu123', role: 'admin', name: 'Prabu' }
  ]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersData = await API.getData('kpm-users');
      const paymentsData = await API.getData('kpm-payments');
      const customersData = await API.getData('kpm-customers');
      const suppliersData = await API.getData('kpm-suppliers');
      
      if (usersData) setUsers(usersData);
      if (paymentsData) setPayments(paymentsData);
      if (customersData) setCustomers(customersData);
      if (suppliersData) setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newUsers, newPayments, newCustomers, newSuppliers) => {
    try {
      if (newUsers) {
        for (const user of newUsers) {
          await API.saveData('kpm-users', user);
        }
      }
      if (newPayments) {
        for (const payment of newPayments) {
          await API.saveData('kpm-payments', payment);
        }
      }
      if (newCustomers) {
        for (const customer of newCustomers) {
          await API.saveData('kpm-customers', customer);
        }
      }
      if (newSuppliers) {
        for (const supplier of newSuppliers) {
          await API.saveData('kpm-suppliers', supplier);
        }
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='relative'>
            <div className='animate-spin rounded-full h-20 w-20 border-b-4 border-green-600 mx-auto'></div>
            <Cloud className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-600' size={32} />
          </div>
          <p className='mt-6 text-2xl font-bold text-gray-700'>Loading from AWS Cloud...</p>
          <p className='mt-2 text-sm text-gray-500'>Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 shadow-lg'>
        <div className='max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4'>
          <div>
            <h1 className='text-2xl font-bold flex items-center gap-2'>
              KPM VEGETABLES <Cloud size={24} />
            </h1>
            <p className='text-sm opacity-90'>☁️ AWS Cloud Payment System</p>
          </div>
          <div className='flex gap-3 flex-wrap'>
            <button
              onClick={loadData}
              className='flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition'
              title='Refresh data from AWS'
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <button
              onClick={() => saveData(users, payments, customers, suppliers)}
              className='flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition'
              title='Save data to AWS'
            >
              <Upload size={18} />
              Save
            </button>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto p-4'>
        <h2 className='text-xl font-bold mb-4 text-gray-700'>Dashboard Placeholder</h2>
        <p className='text-gray-600'>All your AWS-connected data (users, payments, customers, suppliers) will load automatically here.</p>
      </div>
    </div>
  );
};

export default App;
