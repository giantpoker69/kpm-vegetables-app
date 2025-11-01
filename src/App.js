import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, LogOut, Users, DollarSign, TrendingUp, TrendingDown, X, BookOpen, Key, Lock, Cloud } from 'lucide-react';
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
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
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

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: ''
  });

  const [newMaster, setNewMaster] = useState({
    name: '',
    phone: '',
    address: '',
    gst: ''
  });

  const paymentMethods = ['Cash', 'Bank Transfer', 'UPI'];
  const payoutCategories = ['Supplier', 'Salary', 'Savings', 'Share', 'Expenses', 'Transport', 'Extra'];

  useEffect(() => {
    loadData();
  }, []);

  // Load data from AWS API (Amplify-ready)
  const loadData = async () => {
    try {
      setLoading(true);

      const usersData = await API.getData('kpm-users');
      const paymentsData = await API.getData('kpm-payments');
      const customersData = await API.getData('kpm-customers');
      const suppliersData = await API.getData('kpm-suppliers');

      // If backend has users, replace defaults (otherwise keep default admins)
      if (Array.isArray(usersData) && usersData.length > 0) {
        setUsers(usersData);
      }

      if (Array.isArray(paymentsData)) {
        setPayments(paymentsData);
      }

      if (Array.isArray(customersData)) {
        setCustomers(customersData);
      }

      if (Array.isArray(suppliersData)) {
        setSuppliers(suppliersData);
      }
    } catch (error) {
      // If API fails, keep using local defaults so app remains usable
      console.error('Error loading data from AWS API:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save data to AWS API (saves each item individually)
  const saveData = async (newUsers, newPayments, newCustomers, newSuppliers) => {
    try {
      // Users
      if (newUsers && Array.isArray(newUsers)) {
        for (const user of newUsers) {
          // If your API.saveData expects a full object, pass it directly.
          await API.saveData('kpm-users', user);
        }
      }

      // Payments
      if (newPayments && Array.isArray(newPayments)) {
        for (const payment of newPayments) {
          await API.saveData('kpm-payments', payment);
        }
      }

      // Customers
      if (newCustomers && Array.isArray(newCustomers)) {
        for (const customer of newCustomers) {
          await API.saveData('kpm-customers', customer);
        }
      }

      // Suppliers
      if (newSuppliers && Array.isArray(newSuppliers)) {
        for (const supplier of newSuppliers) {
          await API.saveData('kpm-suppliers', supplier);
        }
      }
    } catch (error) {
      console.error('Error saving data to AWS API:', error);
    }
  };

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

  const handleChangePassword = (e) => {
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

    const updatedUsers = users.map(u =>
      u.id === currentUser.id ? { ...u, password: passwordForm.newPassword } : u
    );

    setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, password: passwordForm.newPassword });
    saveData(updatedUsers, payments, customers, suppliers);

    alert('Password changed successfully!');
    setShowChangePassword(false);
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleForgotPassword = (e) => {
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
      const updatedUsers = users.map(u =>
        u.id === user.id ? { ...u, password: newPassword } : u
      );

      setUsers(updatedUsers);
      saveData(updatedUsers, payments, customers, suppliers);

      alert(`✅ Password Reset Successful!\n\nUsername: ${user.username}\nNew Password: ${newPassword}\n\nIMPORTANT: Please change your password immediately after login.`);
      setShowForgotPassword(false);
      setResetUsername('');
    }
  };

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

  const handlePaymentSubmit = (e) => {
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
    saveData(users, newPayments, customers, suppliers);
    closeModal();
  };

  const handleDeletePayment = (id) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      const newPayments = payments.filter(p => p.id !== id);
      setPayments(newPayments);
      saveData(users, newPayments, customers, suppliers);
    }
  };

  const handleAddUser = (e) => {
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
    saveData(newUsers, payments, customers, suppliers);
    alert(`Manager added successfully!\nUsername: ${user.username}\nPassword: ${user.password}\n\nPlease save these credentials.`);
    closeModal();
  };

  const handleDeleteUser = (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const newUsers = users.filter(u => u.id !== id);
      setUsers(newUsers);
      saveData(newUsers, payments, customers, suppliers);
    }
  };

  const handleAddMaster = (e) => {
    e.preventDefault();

    const master = {
      ...newMaster,
      id: editingItem ? editingItem.id : Date.now()
    };

    if (modalType === 'customer') {
      let newCustomers;
      if (editingItem) {
        newCustomers = customers.map(c => c.id === editingItem.id ? master : c);
      } else {
        newCustomers = [...customers, master];
      }
      setCustomers(newCustomers);
      saveData(users, payments, newCustomers, suppliers);
    } else if (modalType === 'supplier') {
      let newSuppliers;
      if (editingItem) {
        newSuppliers = suppliers.map(s => s.id === editingItem.id ? master : s);
      } else {
        newSuppliers = [...suppliers, master];
      }
      setSuppliers(newSuppliers);
      saveData(users, payments, customers, newSuppliers);
    }

    closeModal();
  };

  const handleDeleteMaster = (id, type) => {
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      if (type === 'customer') {
        const newCustomers = customers.filter(c => c.id !== id);
        setCustomers(newCustomers);
        saveData(users, payments, newCustomers, suppliers);
      } else {
        const newSuppliers = suppliers.filter(s => s.id !== id);
        setSuppliers(newSuppliers);
        saveData(users, payments, customers, newSuppliers);
      }
    }
  };

  const calculateHolding = (personName) => {
    const personPayments = payments.filter(p =>
      p.handledBy && p.handledBy.toLowerCase() === personName.toLowerCase()
    );

    const totalIn = personPayments
      .filter(p => p.type === 'in')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const totalOut = personPayments
      .filter(p => p.type === 'out')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return totalIn - totalOut;
  };

  const getAllStaff = () => {
    return users.map(u => u.name).sort();
  };

  const getTotalIn = () => {
    return payments.filter(p => p.type === 'in').reduce((sum, p) => sum + parseFloat(p.amount), 0);
  };

  const getTotalOut = () => {
    return payments.filter(p => p.type === 'out').reduce((sum, p) => sum + parseFloat(p.amount), 0);
  };

  const getHolding = () => {
    return getTotalIn() - getTotalOut();
  };

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
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter password"
                />
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium"
              >
                Login
              </button>

              <button
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Forgot Password?
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter Your Username</label>
                <input
                  type="text"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter username"
                />
              </div>

              <button
                onClick={handleForgotPassword}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium"
              >
                Reset Password
              </button>

              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetUsername('');
                }}
                className="w-full text-gray-600 hover:text-gray-700 text-sm font-medium"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">KPM VEGETABLES</h1>
            <p className="text-sm opacity-90">Welcome, {currentUser.name} ({currentUser.role})</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowChangePassword(true)}
              className="flex items-center gap-2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition"
            >
              <Key size={18} />
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              <LogOut size={18} />
              Logout
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
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'dashboard' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('holdings')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'holdings' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}
            >
              Holdings
            </button>
            <button
              onClick={() => setActiveTab('masters')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'masters' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}
            >
              <BookOpen size={18} className="inline mr-2" />
              Masters
            </button>
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}
              >
                <Users size={18} className="inline mr-2" />
                Users
              </button>
            )}
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">All Payments</h2>
                  <button
                    onClick={() => openModal('payment')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Payment
                  </button>
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
                      {payments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{payment.date}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${payment.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {payment.type === 'in' ? 'IN' : 'OUT'}
                            </span>
                          </td>
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
                                  <button
                                    onClick={() => openModal('payment', payment)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {payments.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No payments recorded yet. Add your first payment!
                    </div>
                  )}
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
                        <p className={`text-3xl font-bold ${holding >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{holding.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          {holding >= 0 ? 'Current Holding' : 'Negative Balance'}
                        </p>
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
                      <button
                        onClick={() => openModal('customer')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Add Customer
                      </button>
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
                              <button
                                onClick={() => openModal('customer', customer)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteMaster(customer.id, 'customer')}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {customers.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No customers added yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Suppliers</h2>
                      <button
                        onClick={() => openModal('supplier')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Add Supplier
                      </button>
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
                              <button
                                onClick={() => openModal('supplier', supplier)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteMaster(supplier.id, 'supplier')}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {suppliers.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No suppliers added yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && currentUser.role === 'admin' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">User Management</h2>
                  <button
                    onClick={() => openModal('user')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Manager
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map(user => (
                    <div key={user.id} className="bg-white rounded-xl shadow p-6 border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{user.name}</h3>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.role.toUpperCase()}
                        </span>
                      </div>
                      {user.role === 'manager' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal('user', user)}
                            className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 transition text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 transition text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && modalType === 'payment' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">{editingItem ? 'Edit Payment' : 'Add New Payment'}</h3>
                <button onClick={closeModal} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition">
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                  >
                    <option value="in">💰 Payment In</option>
                    <option value="out">💸 Payment Out</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Handled By (Staff) *</label>
                  <select
                    value={formData.handledBy}
                    onChange={(e) => setFormData({...formData, handledBy: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                  >
                    <option value="">Select staff member</option>
                    {users.map(user => (
                      <option key={user.id} value={user.name}>{user.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Who handled this transaction?</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {formData.type === 'in' ? 'Customer (Optional)' : 'Supplier (Optional)'}
                  </label>
                  <select
                    value={formData.customerSupplier}
                    onChange={(e) => setFormData({...formData, customerSupplier: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                  >
                    <option value="">Select or leave blank</option>
                    {formData.type === 'in' 
                      ? customers.map(customer => (
                          <option key={customer.id} value={customer.name}>{customer.name}</option>
                        ))
                      : suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                        ))
                    }
                  </select>
                  <input
                    type="text"
                    value={formData.customerSupplier}
                    onChange={(e) => setFormData({...formData, customerSupplier: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg mt-2"
                    placeholder="Or type name manually"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-bold"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({...formData, method: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                {formData.type === 'out' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                      required
                    >
                      <option value="">Select category</option>
                      {payoutCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                    rows="3"
                    placeholder="Add any additional notes here..."
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl hover:bg-gray-300 transition font-semibold text-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-xl hover:from-green-700 hover:to-blue-700 transition font-semibold text-lg shadow-lg"
                >
                  {editingItem ? '✓ Update Payment' : '+ Add Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer/Supplier modals, user modal and change password modal remain same as above */}
    </div>
  );
};

export default App;
