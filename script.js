// Konfigurasi Firebase Anda (Telah diperbarui dengan kredensial Anda)
const firebaseConfig = {
    apiKey: "AIzaSyC57gZNXlJoGvTKnTCgCfspMC_qPgkLvtU",
    authDomain: "rafaela-finance.firebaseapp.com",
    projectId: "rafaela-finance",
    storageBucket: "rafaela-finance.firebasestorage.app",
    messagingSenderId: "45081143872",
    appId: "1:45081143872:web:91d15b2732c24178ee0da5",
    measurementId: "G-XM0GEZY4PK"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let userTransactionsCollection;
let userId;

// Kategori Transaksi
const categories = {
    income: [
        "Laba dari Order",
        "Tambahan Modal / Modal Masuk",
        "Lainnya"
    ],
    expense: [
        "HPP",
        "Biaya Listrik",
        "Wifi",
        "Sewa",
        "Gaji Karyawan",
        "Beli Kertas",
        "Pemasaran",
        "Transportasi",
        "Peralatan",
        "Lainnya"
    ]
};

// Target Omset Tahunan (Anda dapat mengubahnya)
const TARGET_OMSET = 50000000; 

// State Aplikasi
let transactions = [];
let chartInstance = null;

// Fungsi Navigasi & Tampilan
function showView(viewId) {
    const views = document.querySelectorAll('main > div');
    views.forEach(view => view.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    document.getElementById('page-title').textContent = viewId.charAt(0).toUpperCase() + viewId.slice(1).replace('-', ' ');
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

// Fungsi Modal
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    if (modalId === 'addTransactionModal') {
        populateCategories();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.querySelector('.modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Fungsi Autentikasi
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert(error.message);
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        const role = email === 'arialmedia.official@gmail.com' ? 'Owner' : 'Pengguna';

        await db.collection("users").doc(user.uid).set({
            name: name,
            email: email,
            role: role
        });
        alert("Pendaftaran berhasil! Silakan masuk.");
        document.getElementById('register-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
    } catch (error) {
        alert(error.message);
    }
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        userId = user.uid;
        userTransactionsCollection = db.collection("users").doc(userId).collection("transactions");

        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('register-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('user-name-display').textContent = userData.name || user.email;
            document.getElementById('user-email-display').textContent = userData.email || user.email;
            document.getElementById('user-role-display').textContent = userData.role || 'Pengguna';
            document.getElementById('user-avatar').textContent = (userData.name || user.email).charAt(0).toUpperCase();

            if (userData.role !== 'Owner') {
                document.getElementById('karyawan-view').classList.add('hidden');
                document.querySelector('a[onclick="showView(\'karyawan\')"]').style.display = 'none';
            }
        }

        loadTransactions();

        const localTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        if (localTransactions.length > 0) {
            alert('Mendeteksi data lokal. Memigrasikan data ke database Anda...');
            await migrateLocalStorageToFirebase(localTransactions);
            localStorage.removeItem('transactions');
            alert('Migrasi data berhasil!');
            loadTransactions();
        }
    } else {
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
    }
});

document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('register-screen').classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
});

function logout() {
    auth.signOut();
}

// Fungsi Database
async function loadTransactions() {
    try {
        const snapshot = await userTransactionsCollection.orderBy("timestamp", "desc").get();
        transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAll();
    } catch (error) {
        console.error("Error fetching transactions:", error);
    }
}

async function addTransaction(transaction) {
    try {
        await userTransactionsCollection.add(transaction);
        showNotification("Transaksi berhasil disimpan!", "success");
        loadTransactions();
    } catch (error) {
        console.error("Error adding transaction:", error);
        showNotification("Gagal menyimpan transaksi.", "error");
    }
}

async function updateTransaction(id, transaction) {
    try {
        await userTransactionsCollection.doc(id).update(transaction);
        showNotification("Transaksi berhasil diperbarui!", "success");
        loadTransactions();
    } catch (error) {
        console.error("Error updating transaction:", error);
        showNotification("Gagal memperbarui transaksi.", "error");
    }
}

async function deleteTransaction(id) {
    try {
        await userTransactionsCollection.doc(id).delete();
        showNotification("Transaksi berhasil dihapus!", "success");
        loadTransactions();
    } catch (error) {
        console.error("Error deleting transaction:", error);
        showNotification("Gagal menghapus transaksi.", "error");
    }
}

async function migrateLocalStorageToFirebase(localTransactions) {
    const batch = db.batch();
    localTransactions.forEach(t => {
        const docRef = userTransactionsCollection.doc();
        batch.set(docRef, t);
    });
    return batch.commit();
}

// Fungsi Form & UI
function populateCategories(type = 'all', currentCategory = null) {
    const categorySelect = document.getElementById('transaction-category');
    categorySelect.innerHTML = type === 'all' ? '<option value="">Pilih...</option>' : '';
    if (type === 'income' && categories.income) {
        categories.income.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    } else if (type === 'expense' && categories.expense) {
        categories.expense.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    }
    if (currentCategory) {
        categorySelect.value = currentCategory;
    }
}

document.getElementById('transaction-type').addEventListener('change', (e) => {
    populateCategories(e.target.value);
});

document.getElementById('add-transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const transaction = {
        date: document.getElementById('transaction-date').value,
        type: document.getElementById('transaction-type').value,
        category: document.getElementById('transaction-category').value,
        subcategory: document.getElementById('transaction-subcategory').value,
        amount: parseFloat(document.getElementById('transaction-amount').value),
        note: document.getElementById('transaction-note').value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    addTransaction(transaction);
    e.target.reset();
    closeModal('addTransactionModal');
});

// Fungsi Render
function renderAll() {
    renderDashboard();
    renderTransactionsTable();
    populateFilters();
}

function renderDashboard() {
    const totalPemasukan = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalPengeluaran = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const omset = transactions.filter(t => t.category === 'Laba dari Order').reduce((sum, t) => sum + t.amount, 0);
    const hpp = transactions.filter(t => t.category === 'HPP').reduce((sum, t) => sum + t.amount, 0);
    const labaKotor = omset - hpp;
    
    const operationalExpenses = totalPengeluaran - hpp;
    const labaBersih = labaKotor - operationalExpenses;

    document.getElementById('total-pemasukan').textContent = formatRupiah(totalPemasukan);
    document.getElementById('total-pengeluaran').textContent = formatRupiah(totalPengeluaran);
    document.getElementById('omset-display').textContent = formatRupiah(omset);
    document.getElementById('hpp-display').textContent = formatRupiah(hpp);
    document.getElementById('laba-kotor-display').textContent = formatRupiah(labaKotor);
    document.getElementById('pengeluaran-operasional-display').textContent = formatRupiah(operationalExpenses);
    document.getElementById('laba-bersih-display').textContent = formatRupiah(labaBersih);

    // Hitung dan tampilkan progress bar
    const progress = Math.min(100, (omset / TARGET_OMSET) * 100);
    document.getElementById('omset-progress-bar').style.width = `${progress}%`;
    document.getElementById('omset-progress-text').textContent = `${progress.toFixed(1)}%`;

    renderChart();
    renderRecentTransactions();
}

function renderTransactionsTable() {
    const tableBody = document.getElementById('transactions-table-body');
    tableBody.innerHTML = '';
    const filteredTransactions = filterTransactions();
    
    if (filteredTransactions.length === 0) {
        document.getElementById('empty-transactions').classList.remove('hidden');
        return;
    } else {
        document.getElementById('empty-transactions').classList.add('hidden');
    }

    filteredTransactions.forEach(t => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-200 hover:bg-gray-100';
        row.innerHTML = `
            <td class="py-3 px-6">${t.date}</td>
            <td class="py-3 px-6"><span class="type-badge type-${t.type}">${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span></td>
            <td class="py-3 px-6">${t.category}</td>
            <td class="py-3 px-6">${t.note}</td>
            <td class="py-3 px-6">${formatRupiah(t.amount)}</td>
            <td class="py-3 px-6 text-center">
                <button onclick="editTransaction('${t.id}')" class="btn-icon btn-edit" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="confirmDeleteTransaction('${t.id}')" class="btn-icon btn-delete" title="Hapus"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function renderRecentTransactions() {
    const list = document.getElementById('transaksi-terbaru-list');
    list.innerHTML = '';
    const recent = transactions.slice(0, 5);
    if (recent.length === 0) {
        list.innerHTML = `<div class="empty-state text-center text-gray-500"><p>Tidak ada transaksi terbaru.</p></div>`;
        return;
    }
    
    recent.forEach(t => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
        item.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="p-2 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}">
                    <i class="fas ${t.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                </div>
                <div>
                    <h3 class="font-semibold">${t.category}</h3>
                    <p class="text-sm text-gray-500">${t.note}</p>
                </div>
            </div>
            <p class="font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}">${formatRupiah(t.amount)}</p>
        `;
        list.appendChild(item);
    });
}

function renderChart() {
    const ctx = document.getElementById('finance-chart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }

    const monthlySummary = {};
    transactions.forEach(t => {
        const month = new Date(t.date).getMonth();
        if (!monthlySummary[month]) {
            monthlySummary[month] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            monthlySummary[month].income += t.amount;
        } else {
            monthlySummary[month].expense += t.amount;
        }
    });

    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const labels = Object.keys(monthlySummary).sort().map(m => months[m]);
    const incomeData = Object.keys(monthlySummary).sort().map(m => monthlySummary[m].income);
    const expenseData = Object.keys(monthlySummary).sort().map(m => monthlySummary[m].expense);

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: incomeData,
                    borderColor: '#4cc9a4',
                    backgroundColor: 'rgba(76, 201, 164, 0.2)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Pengeluaran',
                    data: expenseData,
                    borderColor: '#f72585',
                    backgroundColor: 'rgba(247, 37, 133, 0.2)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Fungsi Utility
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
}

function showNotification(message, type) {
    // Implementasi notifikasi bisa ditambahkan di sini
    alert(message);
}

// Event Listeners Filter
document.getElementById('filter-month').addEventListener('change', renderTransactionsTable);
document.getElementById('filter-year').addEventListener('change', renderTransactionsTable);
document.getElementById('filter-type').addEventListener('change', renderTransactionsTable);
document.getElementById('filter-category').addEventListener('change', renderTransactionsTable);

function filterTransactions() {
    const monthFilter = document.getElementById('filter-month').value;
    const yearFilter = document.getElementById('filter-year').value;
    const typeFilter = document.getElementById('filter-type').value;
    const categoryFilter = document.getElementById('filter-category').value;
    
    let filteredTransactions = transactions;
    if (monthFilter !== 'semua') {
        filteredTransactions = filteredTransactions.filter(t => new Date(t.date).getMonth() + 1 === parseInt(monthFilter));
    }
    if (yearFilter !== 'semua') {
        filteredTransactions = filteredTransactions.filter(t => new Date(t.date).getFullYear() === parseInt(yearFilter));
    }
    if (typeFilter !== 'semua') {
    filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
    }
    if (categoryFilter !== 'semua') {
    filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter);
    }
    return filteredTransactions;
}

function populateFilters() {
    const months = [...new Set(transactions.map(t => new Date(t.date).getMonth() + 1))].sort((a,b) => a-b);
    const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a,b) => a-b);
    const allCategories = [...new Set(transactions.map(t => t.category))];

    const monthFilterEl = document.getElementById('filter-month');
    const yearFilterEl = document.getElementById('filter-year');
    const categoryFilterEl = document.getElementById('filter-category');

    months.forEach(m => {
        if (!monthFilterEl.querySelector(`option[value="${m}"]`)) {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = new Date(2000, m-1, 1).toLocaleString('id-ID', { month: 'long' });
            monthFilterEl.appendChild(option);
        }
    });

    years.forEach(y => {
        if (!yearFilterEl.querySelector(`option[value="${y}"]`)) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearFilterEl.appendChild(option);
        }
    });

    allCategories.forEach(c => {
        if (!categoryFilterEl.querySelector(`option[value="${c}"]`)) {
            const option = document.createElement('option');
            option.value = c;
            option.textContent = c;
            categoryFilterEl.appendChild(option);
        }
    });
}

// Fitur Lainnya (Export CSV/PDF, dll)
document.getElementById('export-csv-btn').addEventListener('click', () => {
    let csv = 'Tanggal,Jenis,Kategori,Sub Kategori,Nominal,Catatan\n';
    const filteredTransactions = filterTransactions();
    filteredTransactions.forEach(t => {
        csv += `${t.date},${t.type},${t.category},${t.subcategory},${t.amount},"${t.note}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'laporan_rafaela_finance.csv';
    link.click();
});

document.getElementById('export-pdf-btn').addEventListener('click', async () => {
    const invoiceTemplate = document.getElementById('invoice-template');
    invoiceTemplate.style.display = 'block';

    const { jsPDF } = window.jspdf;
    html2canvas(invoiceTemplate).then(canvas => {
        invoiceTemplate.style.display = 'none';
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        pdf.save(`laporan_rafaela_finance.pdf`);
    });
});

// PWA Installation
let deferredPrompt;
const installBtnContainer = document.getElementById('pwa-install-container');
const installBtn = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtnContainer.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
        installBtnContainer.classList.add('hidden');
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
