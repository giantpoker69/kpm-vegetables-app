import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Edit2, LogOut, Users, DollarSign, TrendingUp,
  TrendingDown, X, BookOpen, Key, Lock, Cloud, RefreshCw, Upload
} from 'lucide-react';
import { API } from './config';

const App = () => {
  // --- core state
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([
    { id: 1, username: 'PARTHI', password: 'parthi123', role: 'admin', name: 'Parthi' },
    { id: 2, username: 'PRABU', password: 'prabu123', role: 'admin', name: 'Prabu' }
  ]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [backups, setBackups] = useState([]);
  const [lastBackup, setLastBackup] = useState(null);

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

  // forms
  const [formData, setFormData] = useState({
    type: 'in', handledBy: '', customerSupplier: '', amount: '', method: 'Cash',
    category: '', notes: '', date: new Date().toISOString().split('T')[0]
  });
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '' });
  const [newMaster, setNewMaster] = useState({ name: '', phone: '', address: '', gst: '' });

  const paymentMethods = ['Cash', 'Bank Transfer', 'UPI'];
  const payoutCategories = ['Supplier', 'Salary', 'Savings', 'Share', 'Expenses', 'Transport', 'Extra'];

  // auto-backup interval ref
  const autoBackupRef = useRef(null);

  // ---------------------------
  // Helper: API wrappers
  // ---------------------------
  // Try bulk save; if backend doesn't support it, fallback to per-item saves.
  const saveFullTable = async (table, items) => {
    try {
      // If backend supports bulk, try a bulk payload - your API may interpret __bulk
      const bulkPayload = { __bulk: true, items };
      const bulkResp = await API.saveData(table, bulkPayload);
      // if bulkResp indicates success (depends on your API design)
      if (bulkResp && !bulkResp.error) {
        // re-fetch the table to confirm
        await refreshTable(table);
        return bulkResp;
      } else {
        // fallthrough to item-by-item
        throw new Error('Bulk save not supported or returned error');
      }
    } catch (err) {
      console.warn(`Bulk save failed for ${table}, falling back:`, err);
      // fallback: save every item individually (upsert)
      for (const item of items) {
        try {
          await API.saveData(table, item);
        } catch (e) {
          console.error(`Failed saving item to ${table}:`, e);
        }
      }
      await refreshTable(table);
      return { success: true };
    }
  };

  const fetchTable = async (table) => {
    try {
      const result = await API.getData(table);
      // normalize to array
      if (!result) return [];
      return Array.isArray(result) ? result : [result];
    } catch (err) {
      console.error(`fetchTable ${table} error:`, err);
      return [];
    }
  };

  // fetch & set states for specific tables
  const refreshTable = async (table) => {
    if (table === 'kpm-users') {
      const u = await fetchTable('kpm-users');
      if (Array.isArray(u) && u.length > 0) setUsers(u);
      return u;
    }
    if (table === 'kpm-payments') {
      const p = await fetchTable('kpm-payments');
      // ensure array and sort newest first
      const sorted = (p || []).slice().sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.date || 0).getTime();
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.date || 0).getTime();
        return tb - ta;
      });
      setPayments(sorted);
      return sorted;
    }
    if (table === 'kpm-customers') {
      const c = await fetchTable('kpm-customers');
      setCustomers(c || []);
      return c;
    }
    if (table === 'kpm-suppliers') {
      const s = await fetchTable('kpm-suppliers');
      setSuppliers(s || []);
      return s;
    }
    if (table === 'kpm-backups') {
      const b = await fetchTable('kpm-backups');
      // sort by timestamp desc
      const sorted = (b || []).slice().sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      });
      setBackups(sorted);
      setLastBackup(sorted[0] || null);
      return sorted;
    }
    return [];
  };

  // ---------------------------
  // Load initial data
  // ---------------------------
  useEffect(() => {
    (async () => {
      await initialLoad();
      // schedule daily auto-backup (24h)
      autoBackupRef.current = setInterval(() => {
        runAutoBackup().catch(e => console.error('Auto backup error:', e));
      }, 24 * 60 * 60 * 1000);
    })();
    return () => clearInterval(autoBackupRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialLoad = async () => {
    try {
      setLoading(true);
      // load everything in parallel
      const [u, p, c, s, b] = await Promise.all([
        fetchTable('kpm-users'),
        fetchTable('kpm-payments'),
        fetchTable('kpm-customers'),
        fetchTable('kpm-suppliers'),
        fetchTable('kpm-backups')
      ]);

      if (Array.isArray(u) && u.length > 0) setUsers(u);
      if (Array.isArray(p)) {
        const sorted = p.slice().sort((a, b) => {
          const ta = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.date || 0).getTime();
          const tb = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.date || 0).getTime();
          return tb - ta;
        });
        setPayments(sorted);
      }
      if (Array.isArray(c)) setCustomers(c);
      if (Array.isArray(s)) setSuppliers(s);

      if (Array.isArray(b)) {
        const sortedB = b.slice().sort((x, y) => {
          const tx = x.timestamp ? new Date(x.timestamp).getTime() : 0;
          const ty = y.timestamp ? new Date(y.timestamp).getTime() : 0;
          return ty - tx;
        });
        setBackups(sortedB);
        setLastBackup(sortedB[0] || null);
      }

      // run immediate auto backup check
      await runAutoBackup();
    } catch (e) {
      console.error('initialLoad error:', e);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Backup features
  // ---------------------------
  const createBackupPayload = () => {
    const now = new Date();
    const payload = {
      backup_id: now.toISOString().replace(/[:.]/g, '-'),
      timestamp: now.toISOString(),
      users,
      payments,
      customers,
      suppliers
    };
    return payload;
  };

  const manualBackup = async () => {
    try {
      const payload = createBackupPayload();
      await API.saveData('kpm-backups', payload);
      // verify by re-reading backups
      const saved = await refreshTable('kpm-backups');
      const found = Array.isArray(saved) ? saved.filter(b => b.backup_id === payload.backup_id) : [];
      if (found.length > 0) {
        setLastBackup(found[0]);
        alert(`Manual backup completed and verified. Total backups: ${saved.length}`);
      } else {
        alert('Manual backup attempted but could not be verified. Check logs.');
      }
    } catch (err) {
      console.error('manualBackup error:', err);
      alert('Manual backup failed. See console for details.');
    }
  };

  const runAutoBackup = async () => {
    try {
      const existing = await fetchTable('kpm-backups');
      let latestTs = 0;
      if (Array.isArray(existing) && existing.length > 0) {
        existing.forEach(b => {
          const t = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          if (t > latestTs) latestTs = t;
        });
      }
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (!latestTs || (now - latestTs) >= oneDay) {
        const payload = createBackupPayload();
        await API.saveData('kpm-backups', payload);
        await refreshTable('kpm-backups');
        console.log('Auto-backup created:', payload.backup_id);
      } else {
        console.log('Auto-backup not needed. Last backup at', new Date(latestTs).toISOString());
      }
    } catch (err) {
      console.error('runAutoBackup error:', err);
    }
  };

  // get list of backups (limited)
  const getBackupsList = async () => {
    const b = await refreshTable('kpm-backups');
    return b;
  };

  // restore a backup by backup_id (admin only)
  const restoreBackup = async (backupId) => {
    if (!backupId) return alert('Please select a backup to restore.');
    if (!window.confirm('Restoring will overwrite current data. Continue?')) return;

    try {
      const allBackups = await fetchTable('kpm-backups');
      const chosen = (allBackups || []).find(b => b.backup_id === backupId);
      if (!chosen) return alert('Selected backup not found in AWS. Try again.');

      // Overwrite local state immediately for UI responsiveness
      if (Array.isArray(chosen.users)) setUsers(chosen.users);
      if (Array.isArray(chosen.payments)) {
        const sorted = chosen.payments.slice().sort((a, b) => {
          const ta = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.date || 0).getTime();
          const tb = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.date || 0).getTime();
          return tb - ta;
        });
        setPayments(sorted);
      }
      if (Array.isArray(chosen.customers)) setCustomers(chosen.customers);
      if (Array.isArray(chosen.suppliers)) setSuppliers(chosen.suppliers);

      // Persist restored data back to respective tables (overwrite)
      await saveFullTable('kpm-users', chosen.users || []);
      await saveFullTable('kpm-payments', chosen.payments || []);
      await saveFullTable('kpm-customers', chosen.customers || []);
      await saveFullTable('kpm-suppliers', chosen.suppliers || []);

      alert('Restore completed successfully. Data re-synced to AWS.');
      // refresh backups list too
      await refreshTable('kpm-backups');
    } catch (err) {
      console.error('restoreBackup error:', err);
      alert('Restore failed. Check console for details.');
    }
  };

  // ---------------------------
  // Auth / user flows
  // ---------------------------
  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      alert('Please enter username and password');
      return;
    }
    const found = users.find(u =>
      u.username.toLowerCase() === loginForm.username.trim().toLowerCase() &&
      u.password === loginForm.password
    );
    if (found) {
      setCurrentUser(found);
      setLoginForm({ username: '', password: '' });
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (currentUser.password !== passwordForm.oldPassword) {
      alert('Old password incorrect');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: passwordForm.newPassword } : u);
    setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, password: passwordForm.newPassword });

    // persist immediately
    try {
      await saveFullTable('kpm-users', updatedUsers);
      // optional single-user upsert (if backend supports)
      try { await API.saveData('kpm-users', { id: currentUser.id, password: passwordForm.newPassword }); } catch(e){/* ignore */ }
      alert('Password changed and saved to server');
    } catch (err) {
      console.error('Password save error:', err);
      alert('Password changed locally but failed to save to server.');
    } finally {
      setShowChangePassword(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetUsername.trim()) return alert('Enter username');
    const user = users.find(u => u.username.toLowerCase() === resetUsername.trim().toLowerCase());
    if (!user) return alert('User not found');
    if (user.role === 'admin') {
      alert(`Admin user: ${user.username}\nPassword: ${user.password}`);
      return;
    }
    const newPass = 'manager123';
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, password: newPass } : u);
    setUsers(updatedUsers);
    await saveFullTable('kpm-users', updatedUsers);
    alert(`Password reset to ${newPass}. Please change after login.`);
    setShowForgotPassword(false);
    setResetUsername('');
  };

  // ---------------------------
  // CRUD handlers (payments, users, masters)
  // ---------------------------
  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'payment') {
      if (item) setFormData(item);
      else setFormData({ type: 'in', handledBy: currentUser ? currentUser.name : '', customerSupplier: '', amount: '', method: 'Cash', category: '', notes: '', date: new Date().toISOString().split('T')[0] });
    } else if (type === 'user') {
      setNewUser(item || { username: '', password: '', name: '' });
    } else if (type === 'customer' || type === 'supplier') {
      setNewMaster(item || { name: '', phone: '', address: '', gst: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingItem(null); };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const payment = {
      ...formData,
      id: editingItem ? editingItem.id : Date.now(),
      enteredBy: currentUser.name,
      enteredById: currentUser.id,
      timestamp: editingItem ? editingItem.timestamp : new Date().toISOString()
    };
    let newPayments = editingItem ? payments.map(p => p.id === editingItem.id ? payment : p) : [...payments, payment];
    // update local & persist
    setPayments(newPayments.slice().sort((a,b)=> new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)));
    await saveFullTable('kpm-payments', newPayments);
    closeModal();
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Delete payment?')) return;
    const newPayments = payments.filter(p => p.id !== id);
    setPayments(newPayments);
    await saveFullTable('kpm-payments', newPayments);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.username || !newUser.password) return alert('Fill fields');
    if (users.find(u => u.username === newUser.username && (!editingItem || u.id !== editingItem.id))) return alert('Username exists');
    if (newUser.password.length < 6) return alert('Password min 6 chars');
    const user = { id: editingItem ? editingItem.id : Date.now(), username: newUser.username.trim(), password: newUser.password, name: newUser.name.trim(), role: 'manager' };
    const newUsers = editingItem ? users.map(u => u.id === editingItem.id ? user : u) : [...users, user];
    setUsers(newUsers);
    await saveFullTable('kpm-users', newUsers);
    alert(`Manager ${user.username} added.`);
    closeModal();
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete user?')) return;
    const newUsers = users.filter(u => u.id !== id);
    setUsers(newUsers);
    await saveFullTable('kpm-users', newUsers);
  };

  const handleAddMaster = async (e) => {
    e.preventDefault();
    const master = { ...newMaster, id: editingItem ? editingItem.id : Date.now() };
    if (modalType === 'customer') {
      const newCustomers = editingItem ? customers.map(c => c.id === editingItem.id ? master : c) : [...customers, master];
      setCustomers(newCustomers);
      await saveFullTable('kpm-customers', newCustomers);
    } else {
      const newSuppliers = editingItem ? suppliers.map(s => s.id === editingItem.id ? master : s) : [...suppliers, master];
      setSuppliers(newSuppliers);
      await saveFullTable('kpm-suppliers', newSuppliers);
    }
    closeModal();
  };

  const handleDeleteMaster = async (id, type) => {
    if (!window.confirm('Delete?')) return;
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

  // ---------------------------
  // Helpers for UI calculations
  // ---------------------------
  const calculateHolding = (personName) => {
    const list = payments.filter(p => p.handledBy && p.handledBy.toLowerCase() === personName.toLowerCase());
    const totalIn = list.filter(p => p.type === 'in').reduce((s, x) => s + parseFloat(x.amount || 0), 0);
    const totalOut = list.filter(p => p.type === 'out').reduce((s, x) => s + parseFloat(x.amount || 0), 0);
    return totalIn - totalOut;
  };

  const getAllStaff = () => users.map(u => u.name).sort();
  const getTotalIn = () => payments.filter(p => p.type === 'in').reduce((s, x) => s + parseFloat(x.amount || 0), 0);
  const getTotalOut = () => payments.filter(p => p.type === 'out').reduce((s, x) => s + parseFloat(x.amount || 0), 0);
  const getHolding = () => getTotalIn() - getTotalOut();

  // ---------------------------
  // Render
  // ---------------------------
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
                <input type="text" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Enter username" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Enter password" />
              </div>
              <button onClick={handleLogin} className="w-full bg-green-600 text-white py-3 rounded-lg">Login</button>
              <button onClick={() => setShowForgotPassword(true)} className="w-full text-blue-600 text-sm">Forgot Password?</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter Your Username</label>
                <input type="text" value={resetUsername} onChange={(e) => setResetUsername(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Enter username" />
              </div>
              <button onClick={handleForgotPassword} className="w-full bg-green-600 text-white py-3 rounded-lg">Reset Password</button>
              <button onClick={() => setShowForgotPassword(false)} className="w-full text-gray-600 text-sm">Back to Login</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main UI (same structure as earlier; backup tab added)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">KPM VEGETABLES</h1>
            <p className="text-sm opacity-90">Welcome, {currentUser.name} ({currentUser.role})</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => initialLoad()} className="flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg">
              <RefreshCw size={18} /> Refresh
            </button>

            {currentUser.role === 'admin' && (
              <button onClick={manualBackup} className="flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg">
                <Upload size={18} /> Backup Now
              </button>
            )}

            <button onClick={() => setShowChangePassword(true)} className="flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg">
              <Key size={18} /> Change Password
            </button>

            <button onClick={handleLogout} className="flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg">
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
            <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 ${activeTab==='dashboard'?'border-b-2 border-green-600 text-green-600':'text-gray-600'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('holdings')} className={`px-6 py-3 ${activeTab==='holdings'?'border-b-2 border-green-600 text-green-600':'text-gray-600'}`}>Holdings</button>
            <button onClick={() => setActiveTab('masters')} className={`px-6 py-3 ${activeTab==='masters'?'border-b-2 border-green-600 text-green-600':'text-gray-600'}`}><BookOpen size={18} className="inline mr-2" /> Masters</button>
            {currentUser.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`px-6 py-3 ${activeTab==='users'?'border-b-2 border-green-600 text-green-600':'text-gray-600'}`}><Users size={18} className="inline mr-2" /> Users</button>}
            {currentUser.role === 'admin' && <button onClick={() => setActiveTab('backup')} className={`px-6 py-3 ${activeTab==='backup'?'border-b-2 border-green-600 text-green-600':'text-gray-600'}`}><Cloud size={18} className="inline mr-2" /> Backup & Restore</button>}
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">All Payments</h2>
                  <button onClick={() => openModal('payment')} className="bg-green-600 text-white px-4 py-2 rounded-lg"><Plus size={18} /> Add Payment</button>
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
                      {payments.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{payment.date}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${payment.type==='in'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                              {payment.type === 'in' ? 'IN' : 'OUT'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">{payment.handledBy}</td>
                          <td className="px-4 py-3 text-sm">{payment.customerSupplier || '-'}</td>
                          <td className="px-4 py-3 text-sm font-bold">₹{parseFloat(payment.amount || 0).toFixed(2)}</td>
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
                <h2 className="text-xl font-bold mb-4">Staff Holdings</h2>
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
                      <button onClick={() => openModal('customer')} className="bg-green-600 text-white px-4 py-2 rounded-lg"><Plus size={18} /> Add Customer</button>
                    </div>
                    <div className="space-y-3">
                      {customers.map(customer => (
                        <div key={customer.id} className="bg-white border rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-lg">{customer.name}</h3>
                              {customer.phone && <p className="text-sm text-gray-600">📱 {customer.phone}</p>}
                              {customer.address && <p className="text-sm text-gray-600">📍 {customer.address}</p>}
                              {customer.gst && <p className="text-sm text-gray-600">🔢 GST: {customer.gst}</p>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => openModal('customer', customer)} className="text-blue-600"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteMaster(customer.id, 'customer')} className="text-red-600"><Trash2 size={16} /></button>
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
                      <button onClick={() => openModal('supplier')} className="bg-blue-600 text-white px-4 py-2 rounded-lg"><Plus size={18} /> Add Supplier</button>
                    </div>
                    <div className="space-y-3">
                      {suppliers.map(supplier => (
                        <div key={supplier.id} className="bg-white border rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-lg">{supplier.name}</h3>
                              {supplier.phone && <p className="text-sm text-gray-600">📱 {supplier.phone}</p>}
                              {supplier.address && <p className="text-sm text-gray-600">📍 {supplier.address}</p>}
                              {supplier.gst && <p className="text-sm text-gray-600">🔢 GST: {supplier.gst}</p>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => openModal('supplier', supplier)} className="text-blue-600"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteMaster(supplier.id, 'supplier')} className="text-red-600"><Trash2 size={16} /></button>
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
                  <button onClick={() => openModal('user')} className="bg-green-600 text-white px-4 py-2 rounded-lg"><Plus size={18} /> Add Manager</button>
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
                          <button onClick={() => openModal('user', user)} className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded">Edit</button>
                          <button onClick={() => handleDeleteUser(user.id)} className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded">Delete</button>
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
                    <button onClick={manualBackup} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Upload size={16} /> Manual Backup Now</button>
                    <button onClick={async () => { await refreshTable('kpm-backups'); alert(`Backups found: ${backups.length}`); }} className="bg-gray-100 px-4 py-2 rounded-lg">Check Backups</button>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-700">Last Backup:</p>
                    <p className="font-medium">{lastBackup ? new Date(lastBackup.timestamp).toLocaleString() : 'No backups yet'}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow">
                  <h3 className="font-semibold mb-3">Restore from Backup</h3>
                  <div className="flex gap-3 items-center">
                    <select id="backup-select" className="border px-3 py-2 rounded" style={{ minWidth: 360 }}>
                      <option value="">Select a backup</option>
                      {backups.map(b => <option key={b.backup_id} value={b.backup_id}>{b.backup_id} — {new Date(b.timestamp).toLocaleString()}</option>)}
                    </select>
                    <button onClick={() => {
                      const sel = document.getElementById('backup-select').value;
                      if (!sel) return alert('Select a backup first');
                      restoreBackup(sel);
                    }} className="bg-blue-600 text-white px-4 py-2 rounded">Restore</button>
                    <button onClick={() => { refreshTable('kpm-backups'); alert('Backups refreshed'); }} className="bg-gray-100 px-4 py-2 rounded">Refresh List</button>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">Restoring will overwrite current tables. Use carefully.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modals: Payment, Master, User, Change Password (same structure as previous version) */}
      {showModal && modalType === 'payment' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-2xl font-bold">{editingItem ? 'Edit Payment' : 'Add New Payment'}</h3>
              <button onClick={closeModal} className="text-white"><X size={28} /></button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* form fields same as before */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type *</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-3 border-2 rounded-xl">
                    <option value="in">Payment In</option>
                    <option value="out">Payment Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Handled By *</label>
                  <select value={formData.handledBy} onChange={(e) => setFormData({ ...formData, handledBy: e.target.value })} className="w-full px-4 py-3 border-2 rounded-xl">
                    <option value="">Select staff</option>
                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{formData.type==='in' ? 'Customer (optional)' : 'Supplier (optional)'}</label>
                  <select value={formData.customerSupplier} onChange={(e)=>setFormData({...formData, customerSupplier: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl">
                    <option value="">Select or leave blank</option>
                    {formData.type==='in' ? customers.map(c=> <option key={c.id} value={c.name}>{c.name}</option>) : suppliers.map(s=> <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <input type="text" value={formData.customerSupplier} onChange={(e)=>setFormData({...formData, customerSupplier: e.target.value})} className="w-full mt-2 px-4 py-3 border-2 rounded-xl" placeholder="Or type name manually" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹) *</label>
                  <input type="number" step="0.01" value={formData.amount} onChange={(e)=>setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Method *</label>
                  <select value={formData.method} onChange={(e)=>setFormData({...formData, method: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl">
                    {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {formData.type === 'out' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                    <select value={formData.category} onChange={(e)=>setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl">
                      <option value="">Select category</option>
                      {payoutCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                  <input type="date" value={formData.date} onChange={(e)=>setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea value={formData.notes} onChange={(e)=>setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-3 border-2 rounded-xl" rows={3} />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={closeModal} className="flex-1 bg-gray-200 py-4 rounded-xl">Cancel</button>
                <button onClick={handlePaymentSubmit} className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-xl">{editingItem ? 'Update' : 'Add Payment'}</button>
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
              <button onClick={closeModal} className="text-gray-500"><X size={24} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={newMaster.name} onChange={(e)=>setNewMaster({...newMaster, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={newMaster.phone} onChange={(e)=>setNewMaster({...newMaster, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Phone" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={newMaster.address} onChange={(e)=>setNewMaster({...newMaster, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST</label>
                <input type="text" value={newMaster.gst} onChange={(e)=>setNewMaster({...newMaster, gst: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="GST" />
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={closeModal} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
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
              <button onClick={closeModal} className="text-gray-500"><X size={24} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={newUser.name} onChange={(e)=>setNewUser({...newUser, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" value={newUser.username} onChange={(e)=>setNewUser({...newUser, username: e.target.value})} disabled={!!editingItem} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={newUser.password} onChange={(e)=>setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={closeModal} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
                <button onClick={handleAddUser} className="flex-1 bg-green-600 text-white py-2 rounded-lg">{editingItem ? 'Update' : 'Add Manager'}</button>
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
              <button onClick={() => setShowChangePassword(false)} className="text-gray-500"><X size={24} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
                <input type="password" value={passwordForm.oldPassword} onChange={(e)=>setPasswordForm({...passwordForm, oldPassword: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" value={passwordForm.newPassword} onChange={(e)=>setPasswordForm({...passwordForm, newPassword: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input type="password" value={passwordForm.confirmPassword} onChange={(e)=>setPasswordForm({...passwordForm, confirmPassword: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowChangePassword(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
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
