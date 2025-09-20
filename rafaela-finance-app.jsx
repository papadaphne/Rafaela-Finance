import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, deleteDoc, updateDoc, onSnapshot, collection, query, orderBy, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Konfigurasi Firebase
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

const logoRafaela = "https://placehold.co/100x100/A3E635/000?text=Rafaela";

// Init Firebase
const app = initializeApp(__firebase_config);
const db = getFirestore(app);
const auth = getAuth(app);

// Data owner
const ownerEmail = "arialmedia.official@gmail.com";
const ownerPassword = "Daniarku19";
const ownerUid = "GAfTnHxYwgSoZL4YXvpw889B0Hj2";

const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);

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

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [splashScreen, setSplashScreen] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newTransaction, setNewTransaction] = useState({ type: 'pemasukan', amount: '', description: '', category: 'lainnya' });
  const [newOrder, setNewOrder] = useState({ name: '', amount: '', hpp: '' });

  // Modal Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editType, setEditType] = useState(''); // "transaction" | "order"

  useEffect(() => {
    setTimeout(() => setSplashScreen(false), 2000);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        setUserId(uid);
        setUserRole(uid === ownerUid ? 'owner' : 'karyawan');
      } else {
        try {
          if (__initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthReady) {
      const transactionsPath = `/artifacts/${__app_id}/public/data/transactions`;
      const ordersPath = `/artifacts/${__app_id}/public/data/orders`;

      const unsubscribeTransactions = onSnapshot(query(collection(db, transactionsPath), orderBy('timestamp', 'desc')), (snap) => {
        setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      const unsubscribeOrders = onSnapshot(query(collection(db, ordersPath), orderBy('timestamp', 'desc')), (snap) => {
        setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => { unsubscribeTransactions(); unsubscribeOrders(); };
    }
  }, [isAuthReady]);

  // CRUD
  const addTransaction = async () => {
    await addDoc(collection(db, `/artifacts/${__app_id}/public/data/transactions`), {
      ...newTransaction,
      amount: parseFloat(newTransaction.amount),
      timestamp: serverTimestamp(),
    });
    setNewTransaction({ type: 'pemasukan', amount: '', description: '', category: 'lainnya' });
  };

  const deleteTransaction = async (id) => {
    await deleteDoc(doc(db, `/artifacts/${__app_id}/public/data/transactions`, id));
  };

  const addOrder = async () => {
    await addDoc(collection(db, `/artifacts/${__app_id}/public/data/orders`), {
      ...newOrder,
      amount: parseFloat(newOrder.amount),
      hpp: parseFloat(newOrder.hpp),
      timestamp: serverTimestamp(),
    });
    setNewOrder({ name: '', amount: '', hpp: '' });
  };

  const deleteOrder = async (id) => {
    await deleteDoc(doc(db, `/artifacts/${__app_id}/public/data/orders`, id));
  };

  const saveEdit = async () => {
    if (!editData) return;
    if (editType === 'transaction') {
      await updateDoc(doc(db, `/artifacts/${__app_id}/public/data/transactions`, editData.id), editData);
    } else if (editType === 'order') {
      await updateDoc(doc(db, `/artifacts/${__app_id}/public/data/orders`, editData.id), editData);
    }
    setIsEditOpen(false);
    setEditData(null);
  };

  // UI
  if (splashScreen) {
    return <div className="flex justify-center items-center h-screen"><img src={logoRafaela} alt="logo" /></div>;
  }

  if (!userId || !userRole) return <div>Login dulu...</div>;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-green-700 text-white p-4">
        <h1 className="font-bold text-lg mb-6">Rafaela Finance</h1>
        <NavButton icon="🏠" text="Dashboard" onClick={() => setCurrentPage('dashboard')} isActive={currentPage==='dashboard'} />
        <NavButton icon="🛒" text="Pesanan" onClick={() => setCurrentPage('orders')} isActive={currentPage==='orders'} />
        <NavButton icon="💸" text="Transaksi" onClick={() => setCurrentPage('transactions')} isActive={currentPage==='transactions'} />
      </aside>

      {/* Content */}
      <main className="flex-1 p-6">
        {currentPage==='orders' && (
          <div>
            <SectionTitle title="Pesanan" icon="🛒" />
            <div className="mb-4">
              <input placeholder="Nama" value={newOrder.name} onChange={e=>setNewOrder({...newOrder,name:e.target.value})} />
              <input placeholder="Jumlah" type="number" value={newOrder.amount} onChange={e=>setNewOrder({...newOrder,amount:e.target.value})} />
              <input placeholder="HPP" type="number" value={newOrder.hpp} onChange={e=>setNewOrder({...newOrder,hpp:e.target.value})} />
              <button onClick={addOrder}>Tambah Pesanan</button>
            </div>
            <table>
              <thead><tr><th>Nama</th><th>Jumlah</th><th>HPP</th><th>Aksi</th></tr></thead>
              <tbody>
                {orders.map(o=>(
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td>{formatRupiah(o.amount)}</td>
                    <td>{formatRupiah(o.hpp)}</td>
                    <td>
                      <button onClick={()=>deleteOrder(o.id)}>Hapus</button>
                      <button onClick={()=>{setEditData(o);setEditType('order');setIsEditOpen(true);}}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentPage==='transactions' && (
          <div>
            <SectionTitle title="Transaksi" icon="💸" />
            <div className="mb-4">
              <select value={newTransaction.type} onChange={e=>setNewTransaction({...newTransaction,type:e.target.value})}>
                <option value="pemasukan">Pemasukan</option>
                <option value="pengeluaran">Pengeluaran</option>
              </select>
              <input placeholder="Jumlah" type="number" value={newTransaction.amount} onChange={e=>setNewTransaction({...newTransaction,amount:e.target.value})} />
              <input placeholder="Catatan" value={newTransaction.description} onChange={e=>setNewTransaction({...newTransaction,description:e.target.value})} />
              <button onClick={addTransaction}>Tambah Transaksi</button>
            </div>
            <table>
              <thead><tr><th>Jenis</th><th>Kategori</th><th>Nominal</th><th>Aksi</th></tr></thead>
              <tbody>
                {transactions.map(t=>(
                  <tr key={t.id}>
                    <td>{t.type}</td>
                    <td>{t.category}</td>
                    <td>{formatRupiah(t.amount)}</td>
                    <td>
                      <button onClick={()=>deleteTransaction(t.id)}>Hapus</button>
                      <button onClick={()=>{setEditData(t);setEditType('transaction');setIsEditOpen(true);}}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal Edit */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded">
            <h2>Edit {editType}</h2>
            {editType==='transaction' && (
              <>
                <input value={editData.type} onChange={e=>setEditData({...editData,type:e.target.value})} />
                <input value={editData.amount} onChange={e=>setEditData({...editData,amount:parseFloat(e.target.value)})} />
                <input value={editData.description} onChange={e=>setEditData({...editData,description:e.target.value})} />
              </>
            )}
            {editType==='order' && (
              <>
                <input value={editData.name} onChange={e=>setEditData({...editData,name:e.target.value})} />
                <input value={editData.amount} onChange={e=>setEditData({...editData,amount:parseFloat(e.target.value)})} />
                <input value={editData.hpp} onChange={e=>setEditData({...editData,hpp:parseFloat(e.target.value)})} />
              </>
            )}
            <button onClick={saveEdit}>Simpan</button>
            <button onClick={()=>setIsEditOpen(false)}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
