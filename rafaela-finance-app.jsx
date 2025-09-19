import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, deleteDoc, updateDoc, onSnapshot, collection, query, where, orderBy, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Konstanta Firebase yang disediakan
const firebaseConfig = {
    apiKey: "AIzaSyC57gZNXlJoGvTKnTCgCfspMC_qPgkLvtU",
    authDomain: "rafaela-finance.firebaseapp.com",
    projectId: "rafaela-finance",
    storageBucket: "rafaela-finance.firebasestorage.app",
    messagingSenderId: "45081143872",
    appId: "1:45081143872:web:91d15b2732c24178ee0da5",
    measurementId: "G-XM0GEZY4PK"
};

const __app_id = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const __firebase_config = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;
const __initial_auth_token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// URL logo placeholder
const logoRafaela = "https://placehold.co/100x100/A3E635/000?text=Rafaela";

const backendUrl = "https://script.google.com/macros/s/AKfycbypE91GI7Bdtn-KOGUVaygzZN7QnQyz9rvSOlYL5mRNDWYlWUpdQIB5gRKgiMjquW6tgQ/exec";

// Inisialisasi Firebase
const app = initializeApp(__firebase_config);
const db = getFirestore(app);
const auth = getAuth(app);

// Data owner
const ownerEmail = "arialmedia.official@gmail.com";
const ownerPassword = "Daniarku19";
const ownerUid = "GAfTnHxYwgSoZL4YXvpw889B0Hj2";

// Fungsi untuk mengonversi data ke CSV
const convertToCSV = (arr) => {
    const array = [Object.keys(arr[0])].concat(arr);
    return array.map(it => {
        return Object.values(it).toString();
    }).join('\n');
};

const NavButton = ({ icon, text, onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-3 p-3 rounded-lg w-full transition-colors duration-200 ${isActive ? 'bg-green-700 text-white shadow-lg' : 'bg-green-500 text-white hover:bg-green-600'}`}
    >
        <span className="text-xl">{icon}</span>
        <span className="font-semibold">{text}</span>
    </button>
);

const SectionTitle = ({ title, icon }) => (
    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
        <span>{icon}</span>
        <span>{title}</span>
    </h2>
);

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
};

// Main App Component
const App = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [splashScreen, setSplashScreen] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalAction, setModalAction] = useState(null);

    const [transactions, setTransactions] = useState([]);
    const [orders, setOrders] = useState([]);
    const [categories, setCategories] = useState(['listrik', 'wifi', 'gaji', 'beli kertas', 'lainnya']);
    const [newCategory, setNewCategory] = useState('');

    const [modalData, setModalData] = useState({ type: '', amount: '', description: '' });
    const [filter, setFilter] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), category: '', type: '' });
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });

    // State untuk form transaksi dan pesanan
    const [newTransaction, setNewTransaction] = useState({ type: 'pemasukan', amount: '', description: '', category: 'lainnya' });
    const [newOrder, setNewOrder] = useState({ name: '', amount: '', hpp: '' });

    // Effect untuk splash screen
    useEffect(() => {
        setTimeout(() => {
            setSplashScreen(false);
        }, 3000);
    }, []);

    // Effect untuk otentikasi Firebase
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const uid = user.uid;
                setUserId(uid);
                // Cek peran pengguna
                if (uid === ownerUid) {
                    setUserRole('owner');
                } else {
                    setUserRole('karyawan');
                }
            } else {
                setUserId(null);
                setUserRole(null);
                try {
                    if (__initial_auth_token) {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Error signing in:", error);
                }
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // Effect untuk mengambil data dari Firestore
    useEffect(() => {
        if (isAuthReady) {
            const userIdToUse = auth.currentUser?.uid || crypto.randomUUID();
            const transactionsPath = `/artifacts/${__app_id}/public/data/transactions`;
            const ordersPath = `/artifacts/${__app_id}/public/data/orders`;
            const categoriesPath = `/artifacts/${__app_id}/users/${userIdToUse}/categories`;

            const qTransactions = query(collection(db, transactionsPath), orderBy('timestamp', 'desc'));
            const qOrders = query(collection(db, ordersPath), orderBy('timestamp', 'desc'));

            const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTransactions(data);
            }, (error) => console.error("Error fetching transactions:", error));

            const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setOrders(data);
            }, (error) => console.error("Error fetching orders:", error));

            const unsubscribeCategories = onSnapshot(doc(db, categoriesPath, "user_categories"), (docSnap) => {
                if (docSnap.exists()) {
                    setCategories([...docSnap.data().list]);
                } else {
                    // Simpan kategori default jika belum ada
                    setDoc(doc(db, categoriesPath, "user_categories"), { list: ['listrik', 'wifi', 'gaji', 'beli kertas', 'lainnya'] });
                }
            }, (error) => console.error("Error fetching categories:", error));

            return () => {
                unsubscribeTransactions();
                unsubscribeOrders();
                unsubscribeCategories();
            };
        }
    }, [isAuthReady, db, auth]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            if (loginForm.email === ownerEmail && loginForm.password === ownerPassword) {
                await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
                setUserRole('owner');
            } else {
                setModalMessage('Email atau password salah.');
                setIsModalOpen(true);
            }
        } catch (error) {
            console.error("Login failed:", error);
            setModalMessage('Login gagal. Silakan coba lagi.');
            setIsModalOpen(true);
        }
    };

    const handleLogout = () => {
        auth.signOut();
        setUserRole(null);
    };

    const openModal = (message, action) => {
        setModalMessage(message);
        setModalAction(() => action);
        setIsModalOpen(true);
    };

    const handleModalConfirm = () => {
        if (modalAction) {
            modalAction();
        }
        setIsModalOpen(false);
        setModalAction(null);
    };

    const handleModalCancel = () => {
        setIsModalOpen(false);
        setModalAction(null);
    };

    // Fungsi CRUD
    const addTransaction = async () => {
        try {
            await addDoc(collection(db, `/artifacts/${__app_id}/public/data/transactions`), {
                ...newTransaction,
                amount: parseFloat(newTransaction.amount),
                timestamp: serverTimestamp(),
            });
            setNewTransaction({ type: 'pemasukan', amount: '', description: '', category: 'lainnya' });
        } catch (e) {
            console.error("Error adding document: ", e);
            setModalMessage("Gagal menambahkan transaksi.");
            setIsModalOpen(true);
        }
    };

    const addModal = async () => {
        if (userRole !== 'owner') {
            setModalMessage('Anda tidak memiliki izin untuk menambahkan modal.');
            setIsModalOpen(true);
            return;
        }
        try {
            await addDoc(collection(db, `/artifacts/${__app_id}/public/data/transactions`), {
                type: 'modal',
                amount: parseFloat(modalData.amount),
                description: modalData.description,
                timestamp: serverTimestamp(),
            });
            setModalData({ type: '', amount: '', description: '' });
            setModalMessage('Modal berhasil ditambahkan.');
            setIsModalOpen(true);
        } catch (e) {
            console.error("Error adding modal: ", e);
            setModalMessage("Gagal menambahkan modal.");
            setIsModalOpen(true);
        }
    };

    const deleteTransaction = async (id) => {
        if (userRole !== 'owner') {
            setModalMessage('Anda tidak memiliki izin untuk menghapus transaksi.');
            setIsModalOpen(true);
            return;
        }
        openModal('Apakah Anda yakin ingin menghapus transaksi ini?', async () => {
            try {
                await deleteDoc(doc(db, `/artifacts/${__app_id}/public/data/transactions`, id));
            } catch (e) {
                console.error("Error deleting document: ", e);
                setModalMessage("Gagal menghapus transaksi.");
                setIsModalOpen(true);
            }
        });
    };

    const addOrder = async () => {
        try {
            await addDoc(collection(db, `/artifacts/${__app_id}/public/data/orders`), {
                ...newOrder,
                amount: parseFloat(newOrder.amount),
                hpp: parseFloat(newOrder.hpp),
                timestamp: serverTimestamp(),
            });
            setNewOrder({ name: '', amount: '', hpp: '' });
        } catch (e) {
            console.error("Error adding order: ", e);
            setModalMessage("Gagal menambahkan pesanan.");
            setIsModalOpen(true);
        }
    };

    const addCategory = async () => {
        const userIdToUse = auth.currentUser?.uid || crypto.randomUUID();
        try {
            await setDoc(doc(db, `/artifacts/${__app_id}/users/${userIdToUse}/categories/user_categories`), {
                list: [...categories, newCategory]
            });
            setNewCategory('');
        } catch (e) {
            console.error("Error adding category: ", e);
            setModalMessage("Gagal menambahkan kategori.");
            setIsModalOpen(true);
        }
    };

    const exportToCSV = () => {
        if (userRole !== 'owner') {
            setModalMessage('Anda tidak memiliki izin untuk mengekspor laporan.');
            setIsModalOpen(true);
            return;
        }

        const filteredTransactions = transactions.filter(t => {
            const transDate = new Date(t.timestamp.toDate());
            const monthMatch = filter.month === '' || transDate.getMonth() + 1 === parseInt(filter.month);
            const yearMatch = filter.year === '' || transDate.getFullYear() === parseInt(filter.year);
            const categoryMatch = filter.category === '' || t.category === filter.category;
            const typeMatch = filter.type === '' || t.type === filter.type;
            return monthMatch && yearMatch && categoryMatch && typeMatch;
        });

        const csvData = convertToCSV(filteredTransactions);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'laporan_keuangan.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Fungsi perhitungan dashboard
    const calculateDashboard = () => {
        const totalSales = orders.reduce((sum, order) => sum + order.amount, 0);
        const totalHPP = orders.reduce((sum, order) => sum + order.hpp, 0);
        const grossProfit = totalSales - totalHPP;
        const totalIncome = transactions.filter(t => t.type === 'pemasukan' || t.type === 'modal').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'pengeluaran').reduce((sum, t) => sum + t.amount, 0);
        const netProfit = totalIncome - totalExpense + grossProfit;
        const totalOrders = orders.length;

        return { totalSales, totalHPP, grossProfit, totalIncome, totalExpense, netProfit, totalOrders };
    };

    const dashboardData = calculateDashboard();

    // Tampilan Splash Screen
    if (splashScreen) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, scale: 1.2 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 1.5 }}
                className="flex justify-center items-center h-screen bg-white"
            >
                <img src={logoRafaela} alt="Rafaela Logo" className="w-48 h-48" />
            </motion.div>
        );
    }

    // Tampilan Login
    if (!userId || !userRole) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                    <div className="flex flex-col items-center mb-6">
                        <img src={logoRafaela} alt="Rafaela Logo" className="w-24 h-24 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800">Login Rafaela Finance</h2>
                    </div>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="block text-gray-700 font-semibold mb-2" htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={loginForm.email}
                                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 font-semibold mb-2" htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition-colors"
                        >
                            Login
                        </button>
                    </form>
                </div>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                            <h3 className="text-xl font-semibold mb-4 text-center">Peringatan</h3>
                            <p className="mb-6 text-center">{modalMessage}</p>
                            <div className="flex justify-center space-x-4">
                                <button onClick={handleModalCancel} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors">OK</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Tampilan utama aplikasi setelah login
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 font-sans">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                }
                `}
            </style>
            
            {/* Sidebar */}
            <aside className="bg-green-800 text-white w-full md:w-64 p-4 md:p-6 shadow-xl flex flex-col items-center md:items-start space-y-4">
                <div className="flex items-center space-x-3 mb-6">
                    <img src={logoRafaela} alt="Logo" className="w-12 h-12 rounded-full" />
                    <h1 className="text-xl font-bold hidden md:block">Rafaela Finance</h1>
                </div>
                <NavButton icon="🏠" text="Dashboard" onClick={() => setCurrentPage('dashboard')} isActive={currentPage === 'dashboard'} />
                <NavButton icon="🛒" text="Pesanan" onClick={() => setCurrentPage('orders')} isActive={currentPage === 'orders'} />
                <NavButton icon="💸" text="Transaksi" onClick={() => setCurrentPage('transactions')} isActive={currentPage === 'transactions'} />
                <NavButton icon="📄" text="Laporan" onClick={() => setCurrentPage('reports')} isActive={currentPage === 'reports'} />
                {userRole === 'owner' && (
                    <NavButton icon="⚙️" text="Pengaturan" onClick={() => setCurrentPage('settings')} isActive={currentPage === 'settings'} />
                )}
                <button onClick={handleLogout} className="mt-auto bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors w-full">Logout</button>
                <div className="mt-4 text-center text-sm text-gray-300">
                    <p>User ID: {userId}</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-10 overflow-auto">
                {currentPage === 'dashboard' && (
                    <div>
                        <SectionTitle title="Dashboard" icon="🏠" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-xl shadow-md text-center">
                                <h3 className="text-lg font-semibold text-gray-500">Total Pesanan</h3>
                                <p className="text-3xl font-bold text-green-600">{dashboardData.totalOrders}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md text-center">
                                <h3 className="text-lg font-semibold text-gray-500">Penjualan</h3>
                                <p className="text-3xl font-bold text-blue-600">{formatRupiah(dashboardData.totalSales)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md text-center">
                                <h3 className="text-lg font-semibold text-gray-500">HPP</h3>
                                <p className="text-3xl font-bold text-red-600">{formatRupiah(dashboardData.totalHPP)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md text-center">
                                <h3 className="text-lg font-semibold text-gray-500">Laba Kotor</h3>
                                <p className="text-3xl font-bold text-purple-600">{formatRupiah(dashboardData.grossProfit)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md text-center">
                                <h3 className="text-lg font-semibold text-gray-500">Pemasukan</h3>
                                <p className="text-3xl font-bold text-green-600">{formatRupiah(dashboardData.totalIncome)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md text-center">
                                <h3 className="text-lg font-semibold text-gray-500">Pengeluaran</h3>
                                <p className="text-3xl font-bold text-red-600">{formatRupiah(dashboardData.totalExpense)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md text-center md:col-span-2 lg:col-span-3">
                                <h3 className="text-lg font-semibold text-gray-500">Laba/Rugi Bersih</h3>
                                <p className="text-3xl font-bold text-lime-600">{formatRupiah(dashboardData.netProfit)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {currentPage === 'orders' && (
                    <div>
                        <SectionTitle title="Input Pesanan" icon="🛒" />
                        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <input
                                    type="text"
                                    placeholder="Nama Pesanan"
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={newOrder.name}
                                    onChange={(e) => setNewOrder({ ...newOrder, name: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Jumlah Penjualan (Rp)"
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={newOrder.amount}
                                    onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="HPP (Rp)"
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={newOrder.hpp}
                                    onChange={(e) => setNewOrder({ ...newOrder, hpp: e.target.value })}
                                />
                            </div>
                            <button
                                onClick={addOrder}
                                className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Tambah Pesanan
                            </button>
                        </div>
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">Riwayat Pesanan</h3>
                        <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                                        <th className="py-3 px-6 text-left">Nama</th>
                                        <th className="py-3 px-6 text-left">Jumlah</th>
                                        <th className="py-3 px-6 text-left">HPP</th>
                                        <th className="py-3 px-6 text-left">Laba</th>
                                        <th className="py-3 px-6 text-left">Tanggal</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 text-sm font-light">
                                    {orders.map((order) => (
                                        <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-100">
                                            <td className="py-3 px-6 text-left whitespace-nowrap">{order.name}</td>
                                            <td className="py-3 px-6 text-left">{formatRupiah(order.amount)}</td>
                                            <td className="py-3 px-6 text-left">{formatRupiah(order.hpp)}</td>
                                            <td className="py-3 px-6 text-left">{formatRupiah(order.amount - order.hpp)}</td>
                                            <td className="py-3 px-6 text-left">{new Date(order.timestamp.toDate()).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {currentPage === 'transactions' && (
                    <div>
                        <SectionTitle title="Input Transaksi" icon="💸" />
                        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <select
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={newTransaction.type}
                                    onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                                >
                                    <option value="pemasukan">Pemasukan</option>
                                    <option value="pengeluaran">Pengeluaran</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="Jumlah (Rp)"
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={newTransaction.amount}
                                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                />
                                <select
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={newTransaction.category}
                                    onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                                >
                                    {categories.map((cat, index) => (
                                        <option key={index} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <input
                                type="text"
                                placeholder="Deskripsi"
                                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
                                value={newTransaction.description}
                                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                            />
                            <button
                                onClick={addTransaction}
                                className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Tambah Transaksi
                            </button>
                            {userRole === 'owner' && (
                                <button
                                    onClick={() => setCurrentPage('add-modal')}
                                    className="w-full mt-2 bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Tambah Modal
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {currentPage === 'add-modal' && userRole === 'owner' && (
                    <div>
                        <SectionTitle title="Tambah Modal" icon="💰" />
                        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input
                                    type="number"
                                    placeholder="Jumlah Modal (Rp)"
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={modalData.amount}
                                    onChange={(e) => setModalData({ ...modalData, amount: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Deskripsi"
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={modalData.description}
                                    onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                                />
                            </div>
                            <button
                                onClick={addModal}
                                className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Simpan Modal
                            </button>
                        </div>
                    </div>
                )}

                {currentPage === 'reports' && (
                    <div>
                        <SectionTitle title="Laporan Keuangan" icon="📄" />
                        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <select
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={filter.month}
                                    onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                                >
                                    <option value="">Semua Bulan</option>
                                    {[...Array(12).keys()].map(i => (
                                        <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString('id-ID', { month: 'long' })}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Tahun"
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={filter.year}
                                    onChange={(e) => setFilter({ ...filter, year: e.target.value })}
                                />
                                <select
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={filter.category}
                                    onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                                >
                                    <option value="">Semua Kategori</option>
                                    {categories.map((cat, index) => (
                                        <option key={index} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <select
                                    className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={filter.type}
                                    onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                                >
                                    <option value="">Semua Jenis</option>
                                    <option value="pemasukan">Pemasukan</option>
                                    <option value="pengeluaran">Pengeluaran</option>
                                    <option value="modal">Modal</option>
                                </select>
                            </div>
                            {userRole === 'owner' && (
                                <button
                                    onClick={exportToCSV}
                                    className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors mb-4"
                                >
                                    Export ke CSV
                                </button>
                            )}
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white rounded-lg shadow-md">
                                    <thead>
                                        <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                                            <th className="py-3 px-6 text-left">Tanggal</th>
                                            <th className="py-3 px-6 text-left">Jenis</th>
                                            <th className="py-3 px-6 text-left">Jumlah</th>
                                            <th className="py-3 px-6 text-left">Kategori</th>
                                            <th className="py-3 px-6 text-left">Deskripsi</th>
                                            {userRole === 'owner' && <th className="py-3 px-6 text-center">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-600 text-sm font-light">
                                        {transactions
                                            .filter(t => {
                                                const transDate = new Date(t.timestamp.toDate());
                                                const monthMatch = filter.month === '' || transDate.getMonth() + 1 === parseInt(filter.month);
                                                const yearMatch = filter.year === '' || transDate.getFullYear() === parseInt(filter.year);
                                                const categoryMatch = filter.category === '' || t.category === filter.category;
                                                const typeMatch = filter.type === '' || t.type === filter.type;
                                                return monthMatch && yearMatch && categoryMatch && typeMatch;
                                            })
                                            .map((t) => (
                                                <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-100">
                                                    <td className="py-3 px-6 text-left whitespace-nowrap">{new Date(t.timestamp.toDate()).toLocaleDateString()}</td>
                                                    <td className="py-3 px-6 text-left capitalize">{t.type}</td>
                                                    <td className="py-3 px-6 text-left">{formatRupiah(t.amount)}</td>
                                                    <td className="py-3 px-6 text-left">{t.category}</td>
                                                    <td className="py-3 px-6 text-left">{t.description}</td>
                                                    {userRole === 'owner' && (
                                                        <td className="py-3 px-6 text-center">
                                                            <button
                                                                onClick={() => deleteTransaction(t.id)}
                                                                className="bg-red-500 text-white py-1 px-3 rounded-lg hover:bg-red-600"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {currentPage === 'settings' && userRole === 'owner' && (
                    <div>
                        <SectionTitle title="Pengaturan" icon="⚙️" />
                        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Manajemen Kategori</h3>
                            <div className="flex space-x-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Tambah Kategori Baru"
                                    className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                />
                                <button onClick={addCategory} className="bg-green-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                                    Tambah
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {categories.map((cat, index) => (
                                    <span key={index} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm">{cat}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal Konfirmasi */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                        <h3 className="text-xl font-semibold mb-4 text-center">Konfirmasi</h3>
                        <p className="mb-6 text-center">{modalMessage}</p>
                        <div className="flex justify-center space-x-4">
                            {modalAction && (
                                <button onClick={handleModalConfirm} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">Yakin</button>
                            )}
                            <button onClick={handleModalCancel} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors">Batal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
