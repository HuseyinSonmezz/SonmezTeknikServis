import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc, getDoc, Timestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCtgO12GYcNWIWGWMGjHuaCImni3uo5VnQ",
    authDomain: "sonmez-crm.firebaseapp.com",
    projectId: "sonmez-crm",
    storageBucket: "sonmez-crm.firebasestorage.app",
    messagingSenderId: "777279068898",
    appId: "1:777279068898:web:05a910bd647bd81e195cbb",
    measurementId: "G-NDMN2JQS7L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let deleteTargetId = null;
let activeFilter = 'all';

let allCustomers = [];
let allStocks = [];
let allExpenses = [];

let totalRevenue = 0;
let totalPartsCost = 0;
let totalGeneralExpense = 0;

let chartDailyInstance = null;
let chartWeeklyInstance = null;
let chartMonthlyInstance = null;

const escapeHTML = (str) => {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
};

const formatPhone = (val) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.substring(0, 11);
    if (clean.length > 0 && clean[0] !== '0') clean = '0' + clean;
    let formatted = clean;
    if (clean.length > 4) formatted = clean.substring(0, 4) + ' ' + clean.substring(4);
    if (clean.length > 7) formatted = clean.substring(0, 4) + ' ' + clean.substring(4, 7) + ' ' + clean.substring(7);
    if (clean.length > 9) formatted = clean.substring(0, 4) + ' ' + clean.substring(4, 7) + ' ' + clean.substring(7, 9) + ' ' + clean.substring(9);
    return formatted;
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount).replace('₺', '').trim() + ' ₺';
};

document.querySelectorAll('.phone-input').forEach(input => {
    input.addEventListener('input', (e) => e.target.value = formatPhone(e.target.value));
});

window.switchTab = (tab) => {
    document.getElementById('btn-tab-staff').classList.toggle('active', tab === 'staff');
    document.getElementById('btn-tab-customer').classList.toggle('active', tab === 'customer');
    document.getElementById('form-staff').classList.toggle('hidden', tab !== 'staff');
    document.getElementById('form-customer').classList.toggle('hidden', tab !== 'customer');
};

window.login = (e) => {
    if (e) e.preventDefault();
    const userPart = document.getElementById('username-input').value.toLowerCase().trim();
    const pass = document.getElementById('password-input').value;
    if (!userPart) return;
    const email = userPart + "@servis.com";
    signInWithEmailAndPassword(auth, email, pass).catch(err => {
        const el = document.getElementById('login-error');
        el.innerText = "Giriş başarısız!";
        el.classList.remove('hidden');
    });
};

window.openLogoutModal = () => toggleModal('logout-modal');
window.confirmLogout = () => { toggleModal('logout-modal'); signOut(auth); };

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        document.getElementById('nav-username').innerText = user.email.split('@')[0];
        
        // ADMIN KONTROLÜ
        if(user.email === 'admin@servis.com') {
            document.body.classList.add('admin-mode');
            document.getElementById('user-role-label').innerText = "GELİŞTİRİCİ";
            document.getElementById('user-role-label').classList.replace('text-blue-400', 'text-yellow-400');
            document.getElementById('user-role-label').classList.replace('border-blue-900/50', 'border-yellow-900/50');
        } else {
            document.body.classList.remove('admin-mode');
            document.getElementById('user-role-label').innerText = "PERSONEL";
            document.getElementById('user-role-label').classList.replace('text-yellow-400', 'text-blue-400');
        }
        
        initApp();
    } else {
        currentUser = null;
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
        document.body.classList.remove('admin-mode');
    }
});

window.trackDevice = async () => {
    const id = document.getElementById('tracking-id').value.trim();
    if (!id) { alert("Lütfen kod giriniz."); return; }
    try {
        const docSnap = await getDoc(doc(db, "customers", id));
        if (docSnap.exists()) {
            const d = docSnap.data();
            document.getElementById('tracking-result').classList.remove('hidden');
            document.getElementById('res-customer').innerText = d.name;
            document.getElementById('res-warranty').innerText = d.warranty ? `Garanti: ${d.warranty.split('-').reverse().join('.')}` : 'Garanti: -';
            document.getElementById('res-status').innerText = d.status || 'Beklemede';
            document.getElementById('res-amount').innerText = formatCurrency(d.amount || 0);
        } else {
            alert("Kayıt bulunamadı! Kodu doğru girdiğinizden emin olun.");
        }
    } catch (e) { console.error(e); alert("Sorgulama hatası."); }
};

function initApp() {
    listenCustomers();
    listenStocks();
    listenTodos();
    listenExpenses();
    cleanOldTodos();
}

function listenExpenses() {
    const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        allExpenses = [];
        const expenseListEl = document.getElementById('expense-list');
        if (expenseListEl) expenseListEl.innerHTML = "";
        let count = 0;
        totalGeneralExpense = 0;
        snap.forEach(d => {
            const data = d.data();
            allExpenses.push({ id: d.id, ...data });
            totalGeneralExpense += (data.amount || 0);
            if (count < 5 && expenseListEl) {
                expenseListEl.innerHTML += `
                    <div class="flex justify-between items-center bg-[#181818] p-2 rounded border border-[#2D2D2D] text-xs group relative">
                        <div class="flex flex-col">
                            <span class="text-gray-300 font-bold">${escapeHTML(data.name)}</span>
                            <span class="text-[9px] text-gray-600">${escapeHTML(data.createdBy || '-')}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-red-400 font-mono font-bold">-${formatCurrency(data.amount)}</span>
                            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button onclick="openEditExpenseModal('${d.id}', '${escapeHTML(data.name)}', ${data.amount})" class="text-blue-500 hover:text-white"><i class="fas fa-pen"></i></button>
                                <button onclick="openDeleteExpenseModal('${d.id}')" class="text-red-500 hover:text-white"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>`;
                count++;
            }
        });
        calculateFinancials();
    });
}

window.addExpense = async (e) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    const name = document.getElementById('expense-name').value;
    const amount = Number(document.getElementById('expense-amount').value);
    if (name && amount > 0) {
        await addDoc(collection(db, "expenses"), {
            name: name, amount: amount, createdAt: Timestamp.now(), createdBy: currentUser.email.split('@')[0]
        });
        document.getElementById('expense-name').value = "";
        document.getElementById('expense-amount').value = "";
    }
}

window.openEditExpenseModal = (id, name, amount) => { document.getElementById('edit-expense-id').value=id; document.getElementById('edit-expense-name').value=name; document.getElementById('edit-expense-amount').value=amount; toggleModal('edit-expense-modal'); };
window.saveExpenseEdit = async () => { const id=document.getElementById('edit-expense-id').value; const name=document.getElementById('edit-expense-name').value; const amount=Number(document.getElementById('edit-expense-amount').value); if(name && amount>0) { await updateDoc(doc(db,"expenses",id), {name,amount}); toggleModal('edit-expense-modal'); } };
window.openDeleteExpenseModal = (id) => { document.getElementById('delete-expense-id').value=id; toggleModal('delete-expense-modal'); };
window.confirmExpenseDelete = async () => { const id=document.getElementById('delete-expense-id').value; if(id) { await deleteDoc(doc(db,"expenses",id)); toggleModal('delete-expense-modal'); } };

// --- FİNANSAL HESAPLAMA ---
function calculateFinancials() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let todayRev = 0, todayCost = 0, todayExp = 0;
    
    allCustomers.forEach(c => {
        if(c.updatedAt && c.updatedAt.toDate() >= startOfToday) {
            todayRev += (c.amount || 0); todayCost += (c.cost || 0);
        }
    });
    allExpenses.forEach(e => {
        if(e.createdAt && e.createdAt.toDate() >= startOfToday) todayExp += (e.amount || 0);
    });

    const elRevT = document.getElementById('stat-revenue-today');
    const elCostT = document.getElementById('stat-cost-today');
    const elProfitT = document.getElementById('stat-profit-today');
    const elProfitAll = document.getElementById('stat-profit-total');

    if(elRevT) elRevT.innerText = formatCurrency(todayRev);
    if(elCostT) elCostT.innerText = formatCurrency(todayCost + todayExp);
    if(elProfitT) elProfitT.innerText = formatCurrency(todayRev - (todayCost + todayExp));
    if(elProfitAll) elProfitAll.innerText = formatCurrency(totalRevenue - (totalPartsCost + totalGeneralExpense));

    renderFinancialReports();
    renderCharts();
}

function renderFinancialReports() {
    const renderTable = (id, dataList) => {
        const el = document.getElementById(id);
        if(!el) return;
        if(dataList.length === 0) { el.innerHTML = "<p class='text-gray-500 italic text-center py-4'>Veri yok.</p>"; return; }
        
        let html = `<table class="w-full text-left border-collapse">
            <thead><tr class="text-gray-500 text-[10px] border-b border-[#2D2D2D]"><th class="py-2">TARİH</th><th>GELİR</th><th>GİDER</th><th>NET</th></tr></thead>
            <tbody>`;
        
        dataList.forEach(row => {
            const net = row.rev - row.exp;
            const netColor = net >= 0 ? 'text-green-400' : 'text-red-400';
            html += `<tr class="border-b border-[#2D2D2D] last:border-0 hover:bg-[#252525] transition">
                <td class="py-2 text-gray-300 font-mono">${row.date}</td>
                <td class="py-2 text-white font-mono">${formatCurrency(row.rev)}</td>
                <td class="py-2 text-red-400 font-mono">${formatCurrency(row.exp)}</td>
                <td class="py-2 font-bold font-mono ${netColor}">${formatCurrency(net)}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        el.innerHTML = html;
    };

    // --- 1. GÜNLÜK (Son 7 Gün) ---
    const dailyData = {};
    for(let i=0; i<7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dailyData[key] = { date: d.getDate()+'.'+(d.getMonth()+1), rev:0, exp:0, rawDate: d };
    }
    
    // --- 2. HAFTALIK (Son 4 Hafta - Tarih Aralığı) ---
    const weeklyData = [];
    for(let i=0; i<4; i++) {
        const dEnd = new Date(); dEnd.setDate(dEnd.getDate() - (i*7));
        const dStart = new Date(dEnd); dStart.setDate(dStart.getDate() - 6);
        
        const sStr = dStart.getDate() + '.' + (dStart.getMonth()+1);
        const eStr = dEnd.getDate() + '.' + (dEnd.getMonth()+1);
        
        weeklyData.push({ 
            label: `${sStr} - ${eStr}`,
            start: dStart, end: dEnd, rev:0, exp:0
        });
    }

    // --- 3. AYLIK (Son 12 Ay - MM.YYYY) ---
    const monthlyData = {};
    for(let i=0; i<12; i++) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = d.toISOString().substring(0, 7); // YYYY-MM
        const m = (d.getMonth()+1).toString().padStart(2, '0');
        const y = d.getFullYear();
        monthlyData[key] = { label: `${m}.${y}`, rev:0, exp:0, rawDate: d };
    }

    // VERİ DAĞITIMI
    allCustomers.forEach(c => {
        if(c.updatedAt) {
            const d = c.updatedAt.toDate();
            const dayKey = d.toISOString().split('T')[0];
            const monthKey = d.toISOString().substring(0, 7);
            
            if(dailyData[dayKey]) { dailyData[dayKey].rev += (c.amount || 0); dailyData[dayKey].exp += (c.cost || 0); }
            weeklyData.forEach(w => { if(d >= w.start && d <= w.end) { w.rev += (c.amount || 0); w.exp += (c.cost || 0); } });
            if(monthlyData[monthKey]) { monthlyData[monthKey].rev += (c.amount || 0); monthlyData[monthKey].exp += (c.cost || 0); }
        }
    });

    allExpenses.forEach(e => {
        if(e.createdAt) {
            const d = e.createdAt.toDate();
            const dayKey = d.toISOString().split('T')[0];
            const monthKey = d.toISOString().substring(0, 7);
            
            if(dailyData[dayKey]) dailyData[dayKey].exp += (e.amount || 0);
            weeklyData.forEach(w => { if(d >= w.start && d <= w.end) w.exp += (e.amount || 0); });
            if(monthlyData[monthKey]) monthlyData[monthKey].exp += (e.amount || 0);
        }
    });

    // Listeleri Hazırla
    const dailyArr = Object.values(dailyData).sort((a,b) => b.rawDate - a.rawDate);
    const monthlyArr = Object.values(monthlyData).sort((a,b) => b.rawDate - a.rawDate);

    renderTable('report-daily', dailyArr);
    renderTable('report-weekly', weeklyData.map(w => ({ date: w.label, rev: w.rev, exp: w.exp })));
    renderTable('report-monthly', monthlyArr.map(m => ({ date: m.label, rev: m.rev, exp: m.exp })));
    
    window.chartData = { daily: dailyArr, weekly: weeklyData, monthly: monthlyArr };
}

function renderCharts() {
    if(!window.chartData) return;
    const { daily, weekly, monthly } = window.chartData;
    
    const ctxD = document.getElementById('chart-daily');
    const ctxW = document.getElementById('chart-weekly');
    const ctxM = document.getElementById('chart-monthly');
    if(!ctxD || !ctxW || !ctxM) return;

    const commonOpts = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { grid: { color: '#333' }, ticks: { color: '#888', font: {size: 10} } },
            x: { grid: { display: false }, ticks: { color: '#888', font: {size: 9} } }
        }
    };

    // 1. Günlük Grafik
    if(chartDailyInstance) chartDailyInstance.destroy();
    chartDailyInstance = new Chart(ctxD, {
        type: 'line',
        data: {
            labels: daily.map(d => d.date).reverse(),
            datasets: [{
                label: 'Net Kâr',
                data: daily.map(d => d.rev - d.exp).reverse(),
                borderColor: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.1)',
                fill: true, tension: 0.4, pointRadius: 3
            }]
        },
        options: commonOpts
    });

    // 2. Haftalık Grafik
    if(chartWeeklyInstance) chartWeeklyInstance.destroy();
    chartWeeklyInstance = new Chart(ctxW, {
        type: 'bar',
        data: {
            labels: weekly.map(w => w.label).reverse(),
            datasets: [{
                label: 'Kâr',
                data: weekly.map(w => w.rev - w.exp).reverse(),
                backgroundColor: '#60a5fa', borderRadius: 4
            }]
        },
        options: commonOpts
    });

    // 3. Aylık Grafik
    if(chartMonthlyInstance) chartMonthlyInstance.destroy();
    chartMonthlyInstance = new Chart(ctxM, {
        type: 'bar',
        data: {
            labels: monthly.map(m => m.label).reverse(),
            datasets: [{
                label: 'Kâr',
                data: monthly.map(m => m.rev - m.exp).reverse(),
                backgroundColor: '#f87171', borderRadius: 4
            }]
        },
        options: commonOpts
    });
}

window.switchFinTab = (tabName) => {
    ['summary', 'report', 'charts'].forEach(t => {
        const btn = document.getElementById('ftab-' + t);
        const view = document.getElementById('fin-view-' + t);
        if(t === tabName) { btn.classList.add('active'); view.classList.remove('hidden'); }
        else { btn.classList.remove('active'); view.classList.add('hidden'); }
    });
    if(tabName === 'charts') setTimeout(renderCharts, 100);
};

// ... Diğer tüm fonksiyonlar aynı ...
function listenCustomers() {
    const q = query(collection(db, "customers"), where("deleted", "==", false));
    onSnapshot(q, (snap) => {
        allCustomers = []; totalRevenue = 0; totalPartsCost = 0;
        snap.forEach(d => { const data = d.data(); allCustomers.push({ id: d.id, ...data }); totalRevenue += (data.amount || 0); totalPartsCost += (data.cost || 0); });
        allCustomers.sort((a, b) => b.updatedAt - a.updatedAt);
        calculateFinancials(); renderCustomers();
    });
}
window.setFilter = (filter) => {
    activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-' + filter).classList.add('active');
    renderCustomers();
};
function renderCustomers() {
    const list = document.getElementById('customer-list');
    if (!list) return;
    list.innerHTML = "";
    const term = document.getElementById('search-box').value.toLowerCase();
    const filtered = allCustomers.filter(c => (activeFilter === 'all' || c.status === activeFilter) && (c.name.toLowerCase().includes(term) || c.device.toLowerCase().includes(term)));
    filtered.forEach(d => {
        let statusColor = "text-gray-500";
        if (d.status === "İşlemde") statusColor = "text-blue-400";
        if (d.status === "Hazır") statusColor = "text-green-400";
        const card = document.createElement('div');
        card.className = "bg-[#1E1E1E] p-5 rounded-2xl border border-[#2D2D2D] relative group hover:border-[#404040] transition shadow-lg";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div><h3 class="font-bold text-white text-lg tracking-wide uppercase">${escapeHTML(d.name)}</h3><p class="text-[10px] text-gray-500">Oluşturan: <span class="text-gray-300 font-bold">${escapeHTML(d.createdBy || '-')}</span></p></div>
            </div>
            <p class="text-sm text-gray-400 mb-3"><i class="fas fa-mobile-alt mr-2"></i>${escapeHTML(d.device)}</p>
            <div class="flex items-center justify-between p-3 bg-[#181818] rounded-xl border border-[#2D2D2D] mb-3">
                <span class="font-bold ${statusColor} uppercase text-sm">${escapeHTML(d.status || 'Beklemede')}</span>
                <span class="font-mono text-white font-bold">${formatCurrency(d.amount)}</span>
            </div>
            <div class="flex gap-2 mt-2">
                <button onclick="printPDF('${d.id}')" class="flex-1 bg-[#2D2D2D] hover:bg-[#353535] text-gray-300 text-xs py-2.5 rounded-lg border border-[#404040]"><i class="fas fa-print mr-1"></i> FİŞ</button>
                <a href="https://wa.me/90${d.whatsapp || d.phone1}" target="_blank" class="flex-1 bg-green-900/20 hover:bg-green-900/30 text-green-500 border border-green-900/40 text-xs py-2.5 rounded-lg text-center"><i class="fab fa-whatsapp mr-1"></i> WP</a>
            </div>
            <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition flex gap-2">
                <button onclick="editCustomer('${d.id}')" class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg"><i class="fas fa-pen text-xs"></i></button>
                <button onclick="askDelete('${d.id}')" class="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg"><i class="fas fa-trash text-xs"></i></button>
            </div>`;
        list.appendChild(card);
    });
}
window.filterCustomers = renderCustomers;
function listenStocks() {
    onSnapshot(query(collection(db, "stocks")), (snap) => {
        allStocks = []; snap.forEach(doc => allStocks.push({ id: doc.id, ...doc.data() }));
        allStocks.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        renderStocks();
    });
}
window.renderStocks = () => {
    const list = document.getElementById('stock-list'); if (!list) return; list.innerHTML = "";
    const term = document.getElementById('stock-search-input').value.toLowerCase();
    const filteredStocks = allStocks.filter(s => s.name.toLowerCase().includes(term));
    filteredStocks.forEach(s => {
        const low = s.qty < 3;
        const item = document.createElement('div');
        item.className = `p-3 rounded-lg border ${low ? 'border-red-900/50 bg-red-900/10' : 'border-[#2D2D2D] bg-[#1E1E1E]'} flex items-center justify-between group relative`;
        item.innerHTML = `
            <div class="flex items-center gap-4 overflow-hidden">
                <div class="w-10 h-10 flex items-center justify-center rounded bg-[#121212] border border-[#2D2D2D] ${low ? 'text-red-500' : 'text-white'} font-mono font-bold text-lg">${s.qty}</div>
                <h4 class="font-bold text-gray-300 text-sm truncate" title="${escapeHTML(s.name)}">${escapeHTML(s.name)}</h4>
            </div>
            <div class="flex items-center gap-2 pl-2">
                <div class="flex flex-col gap-0.5">
                    <button onclick="upStock('${s.id}', 1)" class="w-6 h-4 rounded-t bg-[#2D2D2D] hover:bg-white hover:text-black text-gray-400 text-[9px] flex items-center justify-center transition"><i class="fas fa-chevron-up"></i></button>
                    <button onclick="upStock('${s.id}', -1)" class="w-6 h-4 rounded-b bg-[#2D2D2D] hover:bg-white hover:text-black text-gray-400 text-[9px] flex items-center justify-center transition"><i class="fas fa-chevron-down"></i></button>
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onclick="openEditStockModal('${s.id}', '${escapeHTML(s.name)}', ${s.qty})" class="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center shadow hover:bg-blue-500"><i class="fas fa-pen text-[10px]"></i></button>
                    <button onclick="openDeleteStockModal('${s.id}')" class="w-7 h-7 rounded bg-red-600 text-white flex items-center justify-center shadow hover:bg-red-500"><i class="fas fa-trash text-[10px]"></i></button>
                </div>
            </div>`;
        list.appendChild(item);
    });
}
window.filterStocks = renderStocks;
window.upStock = async (id, val) => { const s = allStocks.find(x => x.id === id); if (s) { const n = (s.qty || 0) + val; if (n >= 0) updateDoc(doc(db, "stocks", id), { qty: n }); } };
window.openEditStockModal = (id, name, qty) => { document.getElementById('edit-stock-id').value=id; document.getElementById('edit-stock-name').value=name; document.getElementById('edit-stock-qty').value=qty; toggleModal('edit-stock-modal'); };
window.saveStockEdit = async () => { const id=document.getElementById('edit-stock-id').value; const name=document.getElementById('edit-stock-name').value; const qty=Number(document.getElementById('edit-stock-qty').value); if(name && !isNaN(qty)) { await updateDoc(doc(db,"stocks",id), {name,qty}); toggleModal('edit-stock-modal'); } };
window.openDeleteStockModal = (id) => { document.getElementById('delete-stock-id').value=id; toggleModal('delete-stock-modal'); };
window.confirmStockDelete = async () => { const id=document.getElementById('delete-stock-id').value; if(id) { await deleteDoc(doc(db,"stocks",id)); toggleModal('delete-stock-modal'); } };
document.getElementById('stock-form').addEventListener('submit', async(e)=>{ e.preventDefault(); await addDoc(collection(db,"stocks"),{name:document.getElementById('stock-name').value, qty:Number(document.getElementById('stock-qty').value)}); toggleModal('stock-modal'); });

window.addTodo=async()=>{ const t=document.getElementById('todo-text').value; if(t){ try{ await addDoc(collection(db,"todos"),{text:t, uid:currentUser.uid, createdBy:currentUser.email.split('@')[0].toUpperCase(), createdAt:Timestamp.now(), completed:false, completedAt:null}); document.getElementById('todo-text').value=""; toggleModal('todo-modal'); }catch(e){console.error(e);} } };
function listenTodos(){
    onSnapshot(query(collection(db,"todos")), (snap)=>{
        const list=document.getElementById('todo-list'); if(!list)return; list.innerHTML="";
        let todos=[]; snap.forEach(d=>todos.push({id:d.id,...d.data()}));
        todos.sort((a,b)=> (a.completed===b.completed ? (b.createdAt.seconds-a.createdAt.seconds) : (a.completed?1:-1)));
        todos.forEach(d=>{
            const style = d.completed ? "bg-[#121212] border-gray-800 text-gray-600 line-through opacity-60" : "bg-[#1E1E1E] border-[#2D2D2D] text-gray-300";
            list.innerHTML+=`<div class="p-4 rounded-xl border flex items-center gap-3 transition ${style} group">
                <input type="checkbox" onchange="toggleTask('${d.id}',this.checked)" ${d.completed?'checked':''} class="w-5 h-5 rounded border-gray-600 bg-transparent accent-blue-600">
                <div class="flex-grow flex flex-col"><span class="text-sm">${escapeHTML(d.text)}</span><span class="text-[9px] font-bold text-blue-500 uppercase mt-1">${escapeHTML(d.createdBy||'Anonim')}</span></div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition"><button onclick="openEditTodoModal('${d.id}','${escapeHTML(d.text)}')" class="text-gray-400 hover:text-white"><i class="fas fa-pen"></i></button><button onclick="openDeleteTodoModal('${d.id}')" class="text-gray-400 hover:text-red-500"><i class="fas fa-trash"></i></button></div>
            </div>`;
        });
    });
}
window.openEditTodoModal=(id,t)=>{ document.getElementById('edit-todo-id').value=id; document.getElementById('edit-todo-text').value=t; toggleModal('edit-todo-modal'); };
window.saveTodoEdit=async()=>{ const id=document.getElementById('edit-todo-id').value; const text=document.getElementById('edit-todo-text').value; if(text){ await updateDoc(doc(db,"todos",id),{text}); toggleModal('edit-todo-modal'); } };
window.openDeleteTodoModal=(id)=>{ document.getElementById('delete-todo-id').value=id; toggleModal('delete-todo-modal'); };
window.confirmTodoDelete=async()=>{ const id=document.getElementById('delete-todo-id').value; if(id){ await deleteDoc(doc(db,"todos",id)); toggleModal('delete-todo-modal'); } };
window.toggleTask=(id,s)=>{ updateDoc(doc(db,"todos",id),{completed:s, completedAt:s?Timestamp.now():null}); };
async function cleanOldTodos(){ const q=query(collection(db,"todos")); const snap=await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js").then(m=>m.getDocs(q)); const now=new Date(); snap.forEach(d=>{ const data=d.data(); if(data.completed && data.completedAt && (now-data.completedAt.toDate())>(2*24*60*60*1000)) deleteDoc(doc(db,"todos",d.id)); }); }

document.getElementById('customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const data = {
        name: document.getElementById('cust-name').value.toUpperCase(),
        phone1: document.getElementById('cust-phone1').value,
        phone2: document.getElementById('cust-phone2').value,
        address: document.getElementById('cust-address').value,
        device: document.getElementById('cust-device').value,
        warranty: document.getElementById('cust-warranty').value,
        amount: Number(document.getElementById('cust-amount').value),
        cost: Number(document.getElementById('cust-cost').value),
        status: document.getElementById('cust-status').value,
        note: document.getElementById('cust-note').value,
        whatsapp: document.getElementById('cust-wp').value.replace(/[^0-9]/g, ''),
        updatedAt: Timestamp.now(), deleted: false
    };
    if (id) await updateDoc(doc(db, "customers", id), data);
    else { data.createdBy = currentUser.email.split('@')[0].toUpperCase(); data.createdAt = Timestamp.now(); await addDoc(collection(db, "customers"), data); }
    toggleModal('customer-modal');
});
window.editCustomer=async(id)=>{const d=allCustomers.find(c=>c.id===id); if(!d)return; document.getElementById('edit-id').value=id; document.getElementById('cust-name').value=d.name||''; document.getElementById('cust-phone1').value=d.phone1||''; document.getElementById('cust-phone2').value=d.phone2||''; document.getElementById('cust-address').value=d.address||''; document.getElementById('cust-device').value=d.device||''; document.getElementById('cust-warranty').value=d.warranty||''; document.getElementById('cust-amount').value=d.amount||0; document.getElementById('cust-cost').value=d.cost||0; document.getElementById('cust-status').value=d.status||'Beklemede'; document.getElementById('cust-note').value=d.note||''; document.getElementById('cust-wp').value=d.whatsapp||''; toggleModal('customer-modal'); };
window.askDelete=(id)=>{deleteTargetId=id; toggleModal('delete-modal');};
window.confirmDelete=async()=>{if(deleteTargetId){await updateDoc(doc(db,"customers",deleteTargetId),{deleted:true, updatedAt:Timestamp.now()}); toggleModal('delete-modal'); deleteTargetId=null;}};
window.openStockModal=()=>toggleModal('stock-modal');
window.openCustomerModal=()=>{document.getElementById('customer-form').reset(); document.getElementById('edit-id').value=""; toggleModal('customer-modal');};
window.toggleModal=(id)=>{const el=document.getElementById(id); if(el.classList.contains('hidden')){el.classList.remove('hidden'); if(['stock-modal','todo-modal'].includes(id)) el.querySelector('form')?.reset();} else el.classList.add('hidden');};
window.showPage=(p)=>{document.querySelectorAll('[id^="page-"]').forEach(e=>e.classList.add('hidden')); document.getElementById('page-'+p).classList.remove('hidden'); document.querySelectorAll('.nav-btn').forEach(b=>{b.classList.remove('bg-[#2D2D2D]','text-white'); b.classList.add('text-gray-400');}); if(event&&event.target){event.target.classList.add('bg-[#2D2D2D]','text-white'); event.target.classList.remove('text-gray-400');} if(p==='stats'&&!document.getElementById('fin-view-charts').classList.contains('hidden')) renderCharts(); };
const transliterate = (str) => { if(!str) return ""; const trMap = {'ğ':'g','ü':'u','ş':'s','ı':'i','ö':'o','ç':'c','Ğ':'G','Ü':'U','Ş':'S','İ':'I','Ö':'O','Ç':'C'}; return str.replace(/[ğüşıöçĞÜŞİÖÇ]/g, letter => trMap[letter]); };
window.printPDF = async (id) => {
    const d = allCustomers.find(c => c.id === id); if(!d) return;
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setTextColor(230, 230, 230); doc.setFontSize(40); doc.setFont("helvetica", "bold"); doc.text("TEKNIK SERVIS", 105, 140, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0); doc.setFontSize(22); doc.text("TEKNIK SERVIS FISI", 105, 20, null, null, "center");
    doc.setLineWidth(0.5); doc.line(20, 25, 190, 25);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); const dateStr = new Date().toLocaleDateString('tr-TR'); doc.text(`Tarih: ${dateStr}`, 140, 35); doc.text(`Takip Kodu: ${id}`, 20, 35);
    let y = 50; const lineHeight = 10;
    const printLine = (label, value) => { doc.setFont("helvetica", "bold"); doc.text(transliterate(label) + ":", 20, y); doc.setFont("helvetica", "normal"); const splitText = doc.splitTextToSize(transliterate(value), 120); doc.text(splitText, 60, y); y += (lineHeight * splitText.length); };
    printLine("Musteri", d.name); printLine("Telefon 1", d.phone1); if(d.phone2) printLine("Telefon 2", d.phone2); printLine("Adres", d.address); printLine("Cihaz", d.device); printLine("Garanti", d.warranty); printLine("Durum", d.status); if(d.note) printLine("Sonuc Notu", d.note);
    y += 10; doc.setDrawColor(0); doc.setFillColor(240, 240, 240); doc.rect(110, y - 8, 80, 15, 'FD'); 
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`TUTAR: ${formatCurrency(d.amount)}`, 150, y, null, null, "center");
    const pageHeight = doc.internal.pageSize.height; doc.setFontSize(10); doc.setFont("helvetica", "italic"); doc.text("Cihaz tesliminde bu fisi gosteriniz.", 105, pageHeight - 20, null, null, "center"); doc.text("Tesekkur ederiz.", 105, pageHeight - 15, null, null, "center");
    doc.save(`${transliterate(d.name).replace(/ /g, '_')}_fis.pdf`);
};