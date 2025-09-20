import React, { useState, useEffect } from 'react';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, addDoc, deleteDoc, updateDoc, onSnapshot, collection, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC57gZNXlJoGvTKnTCgCfspMC_qPgkLvtU",
  authDomain: "rafaela-finance.firebaseapp.com",
  projectId: "rafaela-finance",
  storageBucket: "rafaela-finance.firebasestorage.app",
  messagingSenderId: "45081143872",
  appId: "1:45081143872:web:91d15b2732c24178ee0da5",
  measurementId: "G-XM0GEZY4PK"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ownerEmail = "arialmedia.official@gmail.com";
const ownerPassword = "Daniarku19";
const ownerUid = "GAfTnHxYwgSoZL4YXvpw889B0Hj2";

const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number || 0);

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentPage, setCurrentPage] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newTransaction, setNewTransaction] = useState({ type: 'pemasukan', amount: '', description: '', category: 'lainnya' });
  const [newOrder, setNewOrder] = useState({ name: '', amount: '', hpp: '' });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editType, setEditType] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Logged in as UID:", user.uid);
        setUserId(user.uid);
        setUserRole(user.uid === ownerUid ? 'owner' : 'karyawan');
        setIsAuthReady(true);
      } else {
        try {
          const cred = await signInWithEmailAndPassword(auth, ownerEmail, ownerPassword);
          console.log("Signed in with owner account, UID:", cred.user.uid);
        } catch (e) {
          console.error("Login gagal:", e);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    const unsubTx = onSnapshot(query(collection(db, "transactions"), orderBy('timestamp', 'desc')), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("onSnapshot transactions error:", err));

    const unsubOrders = onSnapshot(query(collection(db, "orders"), orderBy('timestamp', 'desc')), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("onSnapshot orders error:", err));

    return () => { unsubTx(); unsubOrders(); };
  }, [isAuthReady]);

  const addTransaction = async () => {
    try {
      if (!newTransaction.amount) return alert('Jumlah wajib diisi');
      console.log("Adding transaction:", newTransaction);
      await addDoc(collection(db, "transactions"), {
        ...newTransaction,
        amount: Number(newTransaction.amount),
        timestamp: serverTimestamp(),
      });
      setNewTransaction({ type: 'pemasukan', amount: '', description: '', category: 'lainnya' });
    } catch (err) {
      console.error("addTransaction error:", err);
      alert("Gagal tambah transaksi: " + err.message);
    }
  };

  const deleteTransaction = async (id) => {
    try {
      if (!confirm('Hapus transaksi ini?')) return;
      console.log("Deleting transaction:", id);
      await deleteDoc(doc(db, "transactions", id));
    } catch (err) {
      console.error("deleteTransaction error:", err);
      alert("Gagal hapus transaksi: " + err.message);
    }
  };

  const addOrder = async () => {
    try {
      if (!newOrder.name) return alert('Nama wajib diisi');
      console.log("Adding order:", newOrder);
      await addDoc(collection(db, "orders"), {
        ...newOrder,
        amount: Number(newOrder.amount),
        hpp: Number(newOrder.hpp),
        timestamp: serverTimestamp(),
      });
      setNewOrder({ name: '', amount: '', hpp: '' });
    } catch (err) {
      console.error("addOrder error:", err);
      alert("Gagal tambah pesanan: " + err.message);
    }
  };

  const deleteOrder = async (id) => {
    try {
      if (!confirm('Hapus pesanan ini?')) return;
      console.log("Deleting order:", id);
      await deleteDoc(doc(db, "orders", id));
    } catch (err) {
      console.error("deleteOrder error:", err);
      alert("Gagal hapus pesanan: " + err.message);
    }
  };

  const saveEdit = async () => {
    if (!editData) return;
    try {
      const payload = { ...editData };
      delete payload.id;
      if (editType === 'transaction') {
        payload.amount = Number(payload.amount);
        console.log("Updating transaction:", editData.id, payload);
        await updateDoc(doc(db, "transactions", editData.id), payload);
      } else if (editType === 'order') {
        payload.amount = Number(payload.amount);
        payload.hpp = Number(payload.hpp);
        console.log("Updating order:", editData.id, payload);
        await updateDoc(doc(db, "orders", editData.id), payload);
      }
      setIsEditOpen(false);
      setEditData(null);
    } catch (err) {
      console.error("saveEdit error:", err);
      alert("Gagal simpan perubahan: " + err.message);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Rafaela Finance</h1>
      <nav className="flex gap-4 mb-6">
        <button onClick={() => setCurrentPage('transactions')} className={currentPage==='transactions'?'font-bold':''}>Transaksi</button>
        <button onClick={() => setCurrentPage('orders')} className={currentPage==='orders'?'font-bold':''}>Pesanan</button>
      </nav>

      {currentPage==='transactions' && (
        <div>
          <h2 className="font-semibold mb-2">Tambah Transaksi</h2>
          <div className="flex gap-2 mb-4">
            <select value={newTransaction.type} onChange={e=>setNewTransaction({...newTransaction, type:e.target.value})}>
              <option value="pemasukan">Pemasukan</option>
              <option value="pengeluaran">Pengeluaran</option>
            </select>
            <input placeholder="Jumlah" type="number" value={newTransaction.amount} onChange={e=>setNewTransaction({...newTransaction, amount:e.target.value})} />
            <input placeholder="Keterangan" value={newTransaction.description} onChange={e=>setNewTransaction({...newTransaction, description:e.target.value})} />
            <button onClick={addTransaction}>Tambah</button>
          </div>
          <table className="w-full border">
            <thead><tr><th>Jenis</th><th>Keterangan</th><th>Nominal</th><th>Aksi</th></tr></thead>
            <tbody>
              {transactions.map(t=>(
                <tr key={t.id}>
                  <td>{t.type}</td>
                  <td>{t.description}</td>
                  <td>{formatRupiah(t.amount)}</td>
                  <td>
                    <button onClick={()=>deleteTransaction(t.id)}>🗑️</button>
                    <button onClick={()=>{setEditType('transaction');setEditData(t);setIsEditOpen(true);}}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {currentPage==='orders' && (
        <div>
          <h2 className="font-semibold mb-2">Tambah Pesanan</h2>
          <div className="flex gap-2 mb-4">
            <input placeholder="Nama" value={newOrder.name} onChange={e=>setNewOrder({...newOrder, name:e.target.value})} />
            <input placeholder="Jumlah" type="number" value={newOrder.amount} onChange={e=>setNewOrder({...newOrder, amount:e.target.value})} />
            <input placeholder="HPP" type="number" value={newOrder.hpp} onChange={e=>setNewOrder({...newOrder, hpp:e.target.value})} />
            <button onClick={addOrder}>Tambah</button>
          </div>
          <table className="w-full border">
            <thead><tr><th>Nama</th><th>Jumlah</th><th>HPP</th><th>Aksi</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>{formatRupiah(o.amount)}</td>
                  <td>{formatRupiah(o.hpp)}</td>
                  <td>
                    <button onClick={()=>deleteOrder(o.id)}>🗑️</button>
                    <button onClick={()=>{setEditType('order');setEditData(o);setIsEditOpen(true);}}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isEditOpen && editData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow w-80">
            <h3 className="font-bold mb-2">Edit {editType}</h3>
            {editType==='transaction' && (
              <>
                <select value={editData.type} onChange={e=>setEditData({...editData,type:e.target.value})}>
                  <option value="pemasukan">Pemasukan</option>
                  <option value="pengeluaran">Pengeluaran</option>
                </select>
                <input type="number" value={editData.amount} onChange={e=>setEditData({...editData,amount:e.target.value})} />
                <input value={editData.description} onChange={e=>setEditData({...editData,description:e.target.value})} />
              </>
            )}
            {editType==='order' && (
              <>
                <input value={editData.name} onChange={e=>setEditData({...editData,name:e.target.value})} />
                <input type="number" value={editData.amount} onChange={e=>setEditData({...editData,amount:e.target.value})} />
                <input type="number" value={editData.hpp} onChange={e=>setEditData({...editData,hpp:e.target.value})} />
              </>
            )}
            <div className="mt-2 flex gap-2 justify-end">
              <button onClick={()=>setIsEditOpen(false)}>Batal</button>
              <button onClick={saveEdit}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
