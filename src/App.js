import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, LogOut, Users, DollarSign, TrendingUp, TrendingDown, X, BookOpen, Key, Lock, Cloud, RefreshCw, Download, Upload } from 'lucide-react';
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
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [resetUsername, setResetUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    type: 'in',
    handledBy: '',
    customerSupplier: '',
    amount: '',
    method: 'Cash',
    category: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newUser, setNewUser] = useState({ username: '', password: '', name: '' });
  const [newMaster, setNewMaster] = useState({ name: '', phone: '', address: '', gst: '' });

  const paymentMethods = ['Cash', 'Bank Transfer', 'UPI'];
  const payoutCategories = ['Supplier', 'Salary', 'Savings', 'Share', 'Expenses', 'Transport', 'Extra'];

  // backup info
  const [lastBackup, setLastBackup] = useState(null);
  const autoBackupRef = useRef(null);

  useEffect(() => {
    loadData();
    // set auto backup interval (every 24 hours)
    autoBackupRef.current = setInterval(() => {
      try {
        runAutoBackup();
      } catch (e) {
        console.error('Auto backup error:', e);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    return () => {
      clearInterval(autoBackupRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------
  // Helper API wrappers
  // ----------------------
  // save full array robustly: try bulk mode first, else fallback to per-item
  const saveFullTable = async (table, items) => {
    try {
      // try bulk-save hint (your backend may support it)
      const bulkPayload = { __bulk: true, items };
      const resp = await API.saveData(table, bulkPayload);
      // if backend signals failure, fallback
      if (resp && resp.error) throw new Error(resp.error);
      // If backend returned success for bulk, good.
      return resp;
    } catch (err) {
      console.warn(`Bulk save failed for ${table}, falling back to item-by-item.`, err);
      // fallback: delete-and-recreate or upsert each item via individual saves
      const results = [];
      for (const item of items) {
        try {
          // save each item individually
          const r = await API.saveData(table, item);
          results.push(r);
        } catch (e) {
          console.error(`Failed to save item to ${table}:`, e);
        }
      }
      return results;
    }
  };

  const fetchTable = async (table) => {
    try {
      const data = await API.getData(table);
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${table}:`, error);
      return [];
    }
  };

  // ----------------------
  // Loading & Saving
  // ----------------------
  const loadData = async () => {
    try {
      setLoading(true);
      // Load all tables
      const [usersData, paymentsData, customersData, suppliersData, backupsData] = await Promise.all([
        fetchTable('kpm-users'),
        fetchTable('kpm-payments'),
        fetchTable('kpm-customers'),
        fetchTable('kpm-suppliers'),
        fetchTable('kpm-backups')
      ]);

      // Keep default admins if no users on backend
      if (Array.isArray(usersData) && usersData.length > 0) {
        setUsers(usersData);
      } // else keep default admins already in state

      if (Array.isArray(paymentsData)) setPayments(paymentsData);
      if (Array.isArray(customersData)) setCustomers(customersData);
      if (Array.isArray(suppliersData)) setSuppliers(suppliersData);

      // determine last backup
      if (Array.isArray(backupsData) && backupsData.length > 0) {
        // assume backupsData entries have timestamp or backup_id
        const sorted = backupsData
          .map(b => ({ ...b, _ts: b.timestamp ? new Date(b.timestamp).getTime() : 0 }))
          .sort((a, b) => b._ts - a._ts);
        setLastBackup(sorted[0]);
      }
      // run immediate auto-backup check (if needed)
      await runAutoBackup(); // non-blocking safety, will check internally
    } catch (error) {
      console.error('Error loading data from AWS API:', error);
    } finally {
      setLoading(false);
    }
  };

  // core saveData: will try to upsert arrays to backend
  const saveData = async (newUsers, newPayments, newCustomers, newSuppliers) => {
    try {
      // Users
      if (newUsers && Array.isArray(newUsers)) {
        await saveFullTable('kpm-users', newUsers);
      }
      // Payments
      if (newPayments && Array.isArray(newPayments)) {
        await saveFullTable('kpm-payments', newPayments);
      }
      // Customers
      if (newCustomers && Array.isArray(newCustomers)) {
        await saveFullTable('kpm-customers', newCustomers);
      }
      // Suppliers
      if (newSuppliers && Array.isArray(newSuppliers)) {
        await saveFullTable('kpm-suppliers', newSuppliers);
      }
    } catch (error) {
      console.error('Error saving data to AWS API:', error);
    }
  };

  // ----------------------
  // Backup functions
  // ----------------------
  const createBackupPayload = () => {
    const now = new Date();
    const iso = now.toISOString();
    const id = now.toISOString().split('T')[0] + '-' + now.getTime();
    return {
      backup_id: id,
      timestamp: iso,
      users,
      payments,
      customers,
      suppliers
    };
  };

  const manualBackup = async () => {
    try {
      const payload = createBackupPayload();
      const resp = await API.saveData('kpm-backups', payload);
      setLastBackup(payload);
      alert('Manual backup completed successfully.');
      return resp;
    } catch (error) {
      console.error('Manual backup failed:', error);
      alert('Manual backup failed. Check console for details.');
    }
  };

  const runAutoBackup = async () => {
    try {
      // fetch latest backups meta
      const backups = await fetchTable('kpm-backups');
      let latestTs = 0;
      if (Array.isArray(backups) && backups.length > 0) {
        backups.forEach(b => {
          if (b.timestamp) {
            const t = new Date(b.timestamp).getTime();
            if (t > latestTs) latestTs = t;
          }
        });
      }
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      // if none or older than 24h, create backup
      if (!latestTs || (now - latestTs) >= oneDay) {
        const payload = createBackupPayload();
        await API.saveData('kpm-backups', payload);
        setLastBackup(payload);
        console.log('Auto-backup created at', payload.timestamp);
      } else {
        // no need to backup now
        console.log('Auto-backup not needed. Last backup at', new Date(latestTs).toISOString());
      }
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  };

  // ----------------------
  // Auth and user management
  // ----------------------
  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      alert('Please enter both username and password!');
      return;
    }
    const user = users.find(u =>
      u.username.toLowerCase() === loginForm.username.trim().toLowerCase() &&
      u.password === loginForm.password
    );
    if (user) {
      setCurrentUser(user);
      setLoginForm({ username: '', password: '' });
    } else {
      alert('❌ Invalid credentials!\n\nPlease check your username and password.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (currentUser.password !== passwordForm.oldPassword) {
      alert('Old password is incorrect!');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    // Update locally
    const updatedUsers = users.map(u =>
      u.id === currentUser.id ? { ...u, password: passwordForm.newPassword } : u
    );
    setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, password: passwordForm.newPassword });

    // Save users to backend (full table), and also try to update single user record
    try {
      await saveFullTable('kpm-users', updatedUsers);
      // Try single-user upsert to ensure backend reflects immediate change (if supported)
      try {
        await API.saveData('kpm-users', { ...currentUser, password: passwordForm.newPassword });
      } catch (e) {
        // ignore secondary failure
      }
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Failed to save updated password to backend:', error);
      alert('Password changed locally but failed to save to server. Check logs.');
    } finally {
      setShowChangePassword(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetUsername.trim()) {
      alert('Please enter a username!');
      return;
    }
    const user = users.find(u => u.username.toLowerCase() === resetUsername.trim().toLowerCase());
    if (!user) {
      alert('❌ Username not found!\n\nPlease check the spelling or contact an admin.');
      return;
    }
    if (user.role === 'admin') {
      alert(`🔐 Admin Password Recovery\n\nUsername: ${user.username}\nCurrent Password: ${user.password}\n\nNote: Contact other admin to change password if needed.`);
    } else {
      const newPassword = 'manager123';
      const updatedUsers = users.map(u => u.id === user.id ? { ...u, password: newPassword } : u);
      setUsers(updatedUsers);
      await saveFullTable('kpm-users', updatedUsers);
      alert(`✅ Password Reset Successful!\n\nUsername: ${user.username}\nNew Password: ${newPassword}\n\nIMPORTANT: Please change your password immediately after login.`);
      setShowForgotPassword(false);
      setResetUsername('');
    }
  };

  // ----------------------
  // Modals / CRUD operations
  // ----------------------
  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'payment' && item) {
      setFormData(item);
    } else if (type === 'payment') {
      setFormData({
        type: 'in',
        handledBy: currentUser ? currentUser.name : '',
        customerSupplier: '',
        amount: '',
        method: 'Cash',
        category: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
    } else if (type === 'user' && item) {
      setNewUser(item);
    } else if (type === 'user') {
      setNewUser({ username: '', password: '', name: '' });
    } else if ((type === 'customer' || type === 'supplier') && item) {
      setNewMaster(item);
    } else if (type === 'customer' || type === 'supplier') {
      setNewMaster({ name: '', phone: '', address: '', gst: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const payment = {
      ...formData,
      id: editingItem ? editingItem.id : Date.now(),
      enteredBy: currentUser.name,
      enteredById: currentUser.id,
      timestamp: editingItem ? editingItem.timestamp : new Date().toISOString()
    };
    let newPayments;
    if (editingItem) {
      newPayments = payments.map(p => p.id === editingItem.id ? payment : p);
    } else {
      newPayments = [...payments, payment];
    }
    setPayments(newPayments);
    await saveFullTable('kpm-payments', newPayments);
    closeModal();
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    const newPayments = payments.filter(p => p.id !== id);
    setPayments(newPayments);
    await saveFullTable('kpm-payments', newPayments);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.username || !newUser.password) {
      alert('Please fill all fields!');
      return;
    }
    if (users.find(u => u.username === newUser.username && (!editingItem || u.id !== editingItem.id))) {
      alert('Username already exists!');
      return;
    }
    if (newUser.password.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    const user = {
      id: editingItem ? editingItem.id : Date.now(),
      username: newUser.username.trim(),
      password: newUser.password,
      name: newUser.name.trim(),
      role: 'manager'
    };
    let newUsers;
    if (editingItem) {
      newUsers = users.map(u => u.id === editingItem.id ? user : u);
    } else {
      newUsers = [...users, user];
    }
    setUsers(newUsers);
    await saveFullTable('kpm-users', newUsers);
    alert(`Manager added successfully!\nUsername: ${user.username}\nPassword: ${user.password}\n\nPlease save these credentials.`);
    closeModal();
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    const newUsers = users.filter(u => u.id !== id);
    setUsers(newUsers);
    await saveFullTable('kpm-users', newUsers);
  };

  const handleAddMaster = async (e) => {
    e.preventDefault();
    const master = { ...newMaster, id: editingItem ? editingItem.id : Date.now() };
    if (modalType === 'customer') {
      let newCustomers;
      if (editingItem) newCustomers = customers.map(c => c.id === editingItem.id ? master : c);
      else newCustomers = [...customers, master];
      setCustomers(newCustomers);
      await saveFullTable('kpm-customers', newCustomers);
    } else if (modalType === 'supplier') {
      let newSuppliers;
      if (editingItem) newSuppliers = suppliers.map(s => s.id === editingItem.id ? master : s);
      else newSuppliers = [...suppliers, master];
      setSuppliers(newSuppliers);
      await saveFullTable('kpm-suppliers', newSuppliers);
    }
    closeModal();
  };

  const handleDeleteMaster = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    if (type === 'customer') {
      const newCustomers = customers.filter(c => c.id !== id);
      setCustomers(newCustomers);
      await saveFullTable('kpm-customers', newCustomers);
    } else {
      const newSuppliers = suppliers.filter(s => s.id !== id);
      setSuppliers(newSuppliers);
      await saveFullTable('kpm-suppliers', newSuppliers);
    }
  };

  // ----------------------
  // Calculations / UI helpers
  // ----------------------
  const calculateHolding = (personName) => {
    const personPayments = payments.filter(p => p.handledBy && p.handledBy.toLowerCase() === personName.toLowerCase());
    const totalIn = personPayments.filter(p => p.type === 'in').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalOut = personPayments.filter(p => p.type === 'out').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    return totalIn - totalOut;
  };

  const getAllStaff = () => users.map(u => u.name).sort();
  const getTotalIn = () => payments.filter(p => p.type === 'in').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const getTotalOut = () => payments.filter(p => p.type === 'out').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const getHolding = () => getTotalIn() - getTotalOut();

  // ----------------------
  // UI Render
  // ----------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-600 mx-auto"></div>
            <Cloud className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-600" size={32} />
          </div>
          <p className="mt-6 text-2xl font-bold text-gray-700">Loading from AWS Cloud...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-700">KPM VEGETABLES</h1>
            <p className="text-gray-600 mt-2">Payment Management System</p>
          </div>

          {!showForgotPassword ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input type="text" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Enter username"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Enter password"/>
              </div>

              <button onClick={handleLogin} className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium">Login</button>

              <button onClick={() => setShowForgotPassword(true)} className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium">Forgot Password?</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter Your Username</label>
                <input type="text" value={resetUsername} onChange={(e) => setResetUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Enter username"/>
              </div>

              <button onClick={handleForgotPassword} className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium">Reset Password</button>

              <button onClick={() => { setShowForgotPassword(false); setResetUsername(''); }} className="w-full text-gray-600 hover:text-gray-700 text-sm font-medium">Back to Login</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">KPM VEGETABLES</h1>
            <p className="text-sm opacity-90">Welcome, {currentUser.name} ({currentUser.role})</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { loadData(); }} className="flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition" title="Refresh data from AWS">
              <RefreshCw size={18} /> Refresh
            </button>

            {currentUser.role === 'admin' && (
              <button onClick={manualBackup} className="flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition" title="Manual Backup to AWS">
                <Upload size={18} /> Backup Now
              </button>
            )}

            <button onClick={() => setShowChangePassword(true)} className="flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition">
              <Key size={18} /> Change Password
            </button>

            <button onClick={handleLogout} className="flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Payment In</p>
                <p className="text-2xl font-bold text-green-600">₹{getTotalIn().toFixed(2)}</p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Payment Out</p>
                <p className="text-2xl font-bold text-red-600">₹{getTotalOut().toFixed(2)}</p>
              </div>
              <TrendingDown className="text-red-500" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Holding</p>
                <p className="text-2xl font-bold text-blue-600">₹{getHolding().toFixed(2)}</p>
              </div>
              <DollarSign className="text-blue-500" size={32} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow mb-6">
          <div className="flex border-b overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'dashboard' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('holdings')} className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'holdings' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}>Holdings</button>
            <button onClick={() => setActiveTab('masters')} className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'masters' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}><BookOpen size={18} className="inline mr-2" /> Masters</button>
            {currentUser.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}><Users size={18} className="inline mr-2" /> Users</button>}
            {currentUser.role === 'admin' && <button onClick={() => setActiveTab('backup')} className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'backup' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}><Cloud size={18} className="inline mr-2" /> Backup & Restore</button>}
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">All Payments</h2>
                  <button onClick={() => openModal('payment')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"><Plus size={18} /> Add Payment</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Handled By</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer/Supplier</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Method</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Entered By</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payments.sort((a,b)=> new Date(b.timestamp)-new Date(a.timestamp)).map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{payment.date}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${payment.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{payment.type === 'in' ? 'IN' : 'OUT'}</span></td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">{payment.handledBy}</td>
                          <td className="px-4 py-3 text-sm font-medium">{payment.customerSupplier || '-'}</td>
                          <td className="px-4 py-3 text-sm font-bold">₹{parseFloat(payment.amount).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">{payment.method}</td>
                          <td className="px-4 py-3 text-sm">{payment.category || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{payment.enteredBy}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {(currentUser.role === 'admin' || currentUser.id === payment.enteredById) && (
                                <>
                                  <button onClick={() => openModal('payment', payment)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                                  <button onClick={() => handleDeletePayment(payment.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {payments.length === 0 && <div className="text-center py-12 text-gray-500">No payments recorded yet. Add your first payment!</div>}
                </div>
              </div>
            )}

            {activeTab === 'holdings' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Staff Holdings (Parthi, Prabu, Managers)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getAllStaff().map(person => {
                    const holding = calculateHolding(person);
                    return (
                      <div key={person} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow p-6 border">
                        <h3 className="font-bold text-lg mb-2">{person}</h3>
                        <p className={`text-3xl font-bold ${holding >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{holding.toFixed(2)}</p>
                        <p className="text-sm text-gray-600 mt-2">{holding >= 0 ? 'Current Holding' : 'Negative Balance'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'masters' && (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Customers</h2>
                      <button onClick={() => openModal('customer')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"><Plus size={18} /> Add Customer</button>
                    </div>
                    <div className="space-y-3">
                      {customers.map(customer => (
                        <div key={customer.id} className="bg-white border rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg">{customer.name}</h3>
                              {customer.phone && <p className="text-sm text-gray-600">📱 {customer.phone}</p>}
                              {customer.address && <p className="text-sm text-gray-600">📍 {customer.address}</p>}
                              {customer.gst && <p className="text-sm text-gray-600">🔢 GST: {customer.gst}</p>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => openModal('customer', customer)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteMaster(customer.id, 'customer')} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {customers.length === 0 && <div className="text-center py-8 text-gray-500">No customers added yet.</div>}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Suppliers</h2>
                      <button onClick={() => openModal('supplier')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"><Plus size={18} /> Add Supplier</button>
                    </div>
                    <div className="space-y-3">
                      {suppliers.map(supplier => (
                        <div key={supplier.id} className="bg-white border rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg">{supplier.name}</h3>
                              {supplier.phone && <p className="text-sm text-gray-600">📱 {supplier.phone}</p>}
                              {supplier.address && <p className="text-sm text-gray-600">📍 {supplier.address}</p>}
                              {supplier.gst && <p className="text-sm text-gray-600">🔢 GST: {supplier.gst}</p>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => openModal('supplier', supplier)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteMaster(supplier.id, 'supplier')} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {suppliers.length === 0 && <div className="text-center py-8 text-gray-500">No suppliers added yet.</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && currentUser.role === 'admin' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">User Management</h2>
                  <button onClick={() => openModal('user')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"><Plus size={18} /> Add Manager</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map(user => (
                    <div key={user.id} className="bg-white rounded-xl shadow p-6 border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{user.name}</h3>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                        </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role.toUpperCase()}</span>
                      </div>
                      {user.role === 'manager' && (
                        <div className="flex gap-2">
                          <button onClick={() => openModal('user', user)} className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 transition text-sm">Edit</button>
                          <button onClick={() => handleDeleteUser(user.id)} className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 transition text-sm">Delete</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'backup' && currentUser.role === 'admin' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Backup & Restore</h2>
                <div className="bg-white rounded-xl p-6 shadow mb-4">
                  <p className="text-sm text-gray-600">Backups are stored daily to the <code>kpm-backups</code> table in AWS.</p>
                  <div className="mt-4 flex gap-3">
                    <button onClick={manualBackup} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"><Upload size={16} /> Manual Backup Now</button>
                    <button onClick={async () => { const b = await fetchTable('kpm-backups'); alert(`Backups found: ${Array.isArray(b) ? b.length : 0}`); }} className="bg-gray-100 px-4 py-2 rounded-lg">Check Backups</button>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-700">Last Backup:</p>
                    <p className="font-medium">{lastBackup ? new Date(lastBackup.timestamp).toLocaleString() : 'No backups yet'}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Restore feature coming soon — backups are ready and safe in AWS.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals (payment/customer/supplier/user/change password) */}
      {showModal && modalType === 'payment' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">{editingItem ? 'Edit Payment' : 'Add New Payment'}</h3>
                <button onClick={closeModal} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"><X size={28} /></button>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type *</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg">
                    <option value="in">💰 Payment In</option>
                    <option value="out">💸 Payment Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Handled By (Staff) *</label>
                  <select value={formData.handledBy} onChange={(e) => setFormData({...formData, handledBy: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg">
                    <option value="">Select staff member</option>
                    {users.map(user => <option key={user.id} value={user.name}>{user.name}</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Who handled this transaction?</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{formData.type === 'in' ? 'Customer (Optional)' : 'Supplier (Optional)'}</label>
                  <select value={formData.customerSupplier} onChange={(e) => setFormData({...formData, customerSupplier: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg">
                    <option value="">Select or leave blank</option>
                    {formData.type === 'in' ? customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <input type="text" value={formData.customerSupplier} onChange={(e) => setFormData({...formData, customerSupplier: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mt-2" placeholder="Or type name manually"/>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                  <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg font-bold"/>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                  <select value={formData.method} onChange={(e) => setFormData({...formData, method: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg">
                    {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {formData.type === 'out' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg" required>
                      <option value="">Select category</option>
                      {payoutCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg" rows="3" />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={closeModal} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl">Cancel</button>
                <button onClick={handlePaymentSubmit} className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-xl">{editingItem ? '✓ Update Payment' : '+ Add Payment'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer/Supplier modal */}
      {showModal && (modalType === 'customer' || modalType === 'supplier') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingItem ? 'Edit' : 'Add'} {modalType === 'customer' ? 'Customer' : 'Supplier'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={newMaster.name} onChange={(e) => setNewMaster({...newMaster, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="text" value={newMaster.phone} onChange={(e) => setNewMaster({...newMaster, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter phone number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={newMaster.address} onChange={(e) => setNewMaster({...newMaster, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="2" placeholder="Enter address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                <input type="text" value={newMaster.gst} onChange={(e) => setNewMaster({...newMaster, gst: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter GST number" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={closeModal} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg">Cancel</button>
                <button onClick={handleAddMaster} className="flex-1 bg-green-600 text-white py-2 rounded-lg">{editingItem ? 'Update' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User modal */}
      {showModal && modalType === 'user' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingItem ? 'Edit Manager' : 'Add Manager'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} disabled={!!editingItem} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter username" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter password" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={closeModal} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg">Cancel</button>
                <button onClick={handleAddUser} className="flex-1 bg-green-600 text-white py-2 rounded-lg">{editingItem ? 'Update' : 'Add'} Manager</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change password modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2"><Lock size={24} className="text-green-600" /> Change Password</h3>
              <button onClick={() => setShowChangePassword(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Old Password *</label>
                <input type="password" value={passwordForm.oldPassword} onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter old password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Enter new password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password *</label>
                <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Confirm new password" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowChangePassword(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg">Cancel</button>
                <button onClick={handleChangePassword} className="flex-1 bg-green-600 text-white py-2 rounded-lg">Change Password</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
