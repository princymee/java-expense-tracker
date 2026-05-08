// =============================================
// app.js — Expense Tracker Main Logic
// Firebase Auth + Realtime Database
// =============================================

import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  ref,
  push,
  set,
  get,
  remove,
  update,
  onValue,
  off,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// =============================================
// STATE
// =============================================
let currentUser = null;
let allExpenses = [];       // local cache from Firebase
let expenseListener = null; // Firebase listener reference
let editingId = null;
let monthlyBudget = 0;

const CATEGORY_COLORS = {
  Food:          "#f97316",
  Transport:     "#3b82f6",
  Shopping:      "#a855f7",
  Bills:         "#ef4444",
  Entertainment: "#ec4899",
  Health:        "#22c55e",
  Education:     "#f59e0b",
  Other:         "#64748b"
};
const CATEGORY_EMOJIS = {
  Food: "🍔", Transport: "🚗", Shopping: "🛍️",
  Bills: "💡", Entertainment: "🎬", Health: "🏥",
  Education: "📚", Other: "📦"
};

// =============================================
// AUTH STATE LISTENER
// =============================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showApp();
    loadUserData();
  } else {
    currentUser = null;
    showAuth();
    detachExpenseListener();
  }
});

// =============================================
// AUTH FUNCTIONS
// =============================================

window.loginUser = async function () {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) return showAuthError("Please fill in all fields.");
  showLoader(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showLoader(false);
  } catch (err) {
    showLoader(false);
    showAuthError(friendlyError(err.code));
  }
};

window.registerUser = async function () {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  if (!name || !email || !password) return showAuthError("Please fill in all fields.");
  if (password.length < 6) return showAuthError("Password must be at least 6 characters.");
  showLoader(true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    showLoader(false);
  } catch (err) {
    showLoader(false);
    showAuthError(friendlyError(err.code));
  }
};

window.loginGoogle = async function () {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    showAuthError(friendlyError(err.code));
  }
};

window.logoutUser = async function () {
  try {
    await signOut(auth);
    showToast("Signed out successfully.", "info");
  } catch (err) {
    showToast("Error signing out.", "error");
  }
};

// =============================================
// SCREEN TRANSITIONS
// =============================================
function showApp() {
  document.getElementById("auth-screen").classList.remove("active");
  document.getElementById("app-screen").classList.add("active");

  // Greet user
  const name = currentUser.displayName || currentUser.email.split("@")[0];
  document.getElementById("user-display-name").textContent = name;
  document.getElementById("user-display-email").textContent = currentUser.email;
  document.getElementById("greeting-name").textContent = name.split(" ")[0];
  document.getElementById("user-avatar-text").textContent = name[0].toUpperCase();

  const h = new Date().getHours();
  document.getElementById("greeting-time").textContent =
    h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

function showAuth() {
  document.getElementById("app-screen").classList.remove("active");
  document.getElementById("auth-screen").classList.add("active");
  allExpenses = [];
}

// =============================================
// FIREBASE DATA
// =============================================
function loadUserData() {
  attachExpenseListener();
  loadBudget();
}

function attachExpenseListener() {
  if (!currentUser) return;
  const expRef = ref(db, `users/${currentUser.uid}/expenses`);
  expenseListener = onValue(expRef, (snapshot) => {
    allExpenses = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        allExpenses.push({ id: child.key, ...child.val() });
      });
      // Sort newest first
      allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    refreshUI();
  });
}

function detachExpenseListener() {
  if (expenseListener && currentUser) {
    off(ref(db, `users/${currentUser.uid}/expenses`));
    expenseListener = null;
  }
}

// =============================================
// EXPENSE CRUD
// =============================================
window.saveExpense = async function () {
  const title = document.getElementById("expense-title").value.trim();
  const amount = parseFloat(document.getElementById("expense-amount").value);
  const category = document.getElementById("expense-category").value;
  const date = document.getElementById("expense-date").value;
  const note = document.getElementById("expense-note").value.trim();
  const id = document.getElementById("editing-id").value;

  if (!title) return showModalError("Please enter a title.");
  if (!amount || amount <= 0) return showModalError("Please enter a valid amount.");
  if (!category) return showModalError("Please select a category.");
  if (!date) return showModalError("Please select a date.");

  const expData = { title, amount, category, date, note, updatedAt: Date.now() };

  try {
    if (id) {
      // Update existing
      await update(ref(db, `users/${currentUser.uid}/expenses/${id}`), expData);
      showToast("Expense updated! ✏️", "success");
    } else {
      // Create new
      expData.createdAt = Date.now();
      await push(ref(db, `users/${currentUser.uid}/expenses`), expData);
      showToast("Expense added! 🎉", "success");
    }
    closeModal();
  } catch (err) {
    showModalError("Failed to save. Check your connection.");
    console.error(err);
  }
};

window.deleteExpense = async function (id) {
  if (!confirm("Delete this expense?")) return;
  try {
    await remove(ref(db, `users/${currentUser.uid}/expenses/${id}`));
    showToast("Expense deleted.", "info");
  } catch (err) {
    showToast("Failed to delete.", "error");
  }
};

window.editExpense = function (id) {
  const exp = allExpenses.find(e => e.id === id);
  if (!exp) return;
  editingId = id;
  document.getElementById("expense-title").value = exp.title;
  document.getElementById("expense-amount").value = exp.amount;
  document.getElementById("expense-category").value = exp.category;
  document.getElementById("expense-date").value = exp.date;
  document.getElementById("expense-note").value = exp.note || "";
  document.getElementById("editing-id").value = id;
  document.getElementById("modal-title").textContent = "Edit Expense";
  document.getElementById("save-btn-text").textContent = "Update Expense";
  openModal();
};

// =============================================
// BUDGET
// =============================================
window.saveBudget = async function () {
  const amount = parseFloat(document.getElementById("budget-amount").value);
  if (!amount || amount <= 0) return showToast("Enter a valid budget amount.", "error");
  try {
    await set(ref(db, `users/${currentUser.uid}/budget`), amount);
    monthlyBudget = amount;
    updateBudgetUI();
    showToast("Budget saved! 💼", "success");
  } catch (err) {
    showToast("Failed to save budget.", "error");
  }
};

async function loadBudget() {
  try {
    const snap = await get(ref(db, `users/${currentUser.uid}/budget`));
    if (snap.exists()) {
      monthlyBudget = snap.val();
      document.getElementById("budget-amount").value = monthlyBudget;
      updateBudgetUI();
    }
  } catch (_) {}
}

function updateBudgetUI() {
  const now = new Date();
  const thisMonthExpenses = allExpenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const spent = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const pct = monthlyBudget > 0 ? Math.min((spent / monthlyBudget) * 100, 100) : 0;

  document.getElementById("budget-label").textContent =
    `₹${formatNum(spent)} / ₹${formatNum(monthlyBudget)}`;

  const bar = document.getElementById("budget-progress-bar");
  bar.style.width = pct + "%";
  bar.className = "progress-bar" + (pct >= 90 ? " danger" : pct >= 70 ? " warn" : "");

  const remaining = monthlyBudget - spent;
  if (monthlyBudget === 0) {
    document.getElementById("budget-remaining").textContent = "Set a budget to track your spending";
  } else if (remaining < 0) {
    document.getElementById("budget-remaining").textContent =
      `⚠️ Over budget by ₹${formatNum(Math.abs(remaining))}`;
  } else {
    document.getElementById("budget-remaining").textContent =
      `✅ ₹${formatNum(remaining)} remaining this month`;
  }

  // Category breakdown
  const catTotals = {};
  thisMonthExpenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });

  const catContainer = document.getElementById("category-budgets");
  if (Object.keys(catTotals).length === 0) {
    catContainer.innerHTML = `<p style="color:var(--text-3);font-size:0.88rem;">No expenses this month.</p>`;
    return;
  }

  catContainer.innerHTML = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const pct = spent > 0 ? (amt / spent) * 100 : 0;
      const color = CATEGORY_COLORS[cat] || "#64748b";
      return `
        <div class="cat-budget-row">
          <div class="cat-budget-header">
            <span>${CATEGORY_EMOJIS[cat] || "📦"} ${cat}</span>
            <span>₹${formatNum(amt)} (${pct.toFixed(0)}%)</span>
          </div>
          <div class="cat-bar-wrap">
            <div class="cat-bar" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>`;
    }).join("");
}

// =============================================
// UI REFRESH
// =============================================
function refreshUI() {
  updateStats();
  renderRecentExpenses();
  renderAllExpenses();
  renderBarChart();
  renderDonutChart();
  renderMonthlyBreakdown();
  updateBudgetUI();
}

function updateStats() {
  const total = allExpenses.reduce((s, e) => s + e.amount, 0);
  document.getElementById("total-spent").textContent = `₹${formatNum(total)}`;

  const today = new Date().toISOString().split("T")[0];
  const todayTotal = allExpenses
    .filter(e => e.date === today)
    .reduce((s, e) => s + e.amount, 0);
  document.getElementById("today-spent").textContent = `₹${formatNum(todayTotal)}`;

  document.getElementById("total-count").textContent = allExpenses.length;

  // Top category
  const catTotals = {};
  allExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("top-category").textContent = topCat
    ? `${CATEGORY_EMOJIS[topCat[0]] || "📦"} ${topCat[0]}` : "—";
}

// =============================================
// RENDER EXPENSE LISTS
// =============================================
function renderExpenseItem(exp, showActions = true) {
  const emoji = CATEGORY_EMOJIS[exp.category] || "📦";
  return `
    <div class="expense-item" id="exp-${exp.id}">
      <div class="expense-emoji">${emoji}</div>
      <div class="expense-details">
        <div class="expense-name">${escapeHtml(exp.title)}</div>
        <div class="expense-meta">${exp.category} • ${formatDate(exp.date)}${exp.note ? " • " + escapeHtml(exp.note) : ""}</div>
      </div>
      <div class="expense-amount">₹${formatNum(exp.amount)}</div>
      ${showActions ? `
        <div class="expense-actions">
          <button class="action-btn edit" onclick="editExpense('${exp.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn del" onclick="deleteExpense('${exp.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>` : ""}
    </div>`;
}

function renderRecentExpenses() {
  const container = document.getElementById("recent-expenses");
  const recent = allExpenses.slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-receipt"></i><p>No expenses yet. Add your first one!</p></div>`;
    return;
  }
  container.innerHTML = recent.map(e => renderExpenseItem(e)).join("");
}

window.filterExpenses = function () {
  const search = (document.getElementById("search-input").value || "").toLowerCase();
  const cat = document.getElementById("filter-category").value;
  const sort = document.getElementById("filter-sort").value;

  let filtered = allExpenses.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search) ||
      (e.note || "").toLowerCase().includes(search) ||
      e.category.toLowerCase().includes(search);
    const matchCat = !cat || e.category === cat;
    return matchSearch && matchCat;
  });

  filtered.sort((a, b) => {
    if (sort === "newest") return new Date(b.date) - new Date(a.date);
    if (sort === "oldest") return new Date(a.date) - new Date(b.date);
    if (sort === "highest") return b.amount - a.amount;
    if (sort === "lowest") return a.amount - b.amount;
    return 0;
  });

  const container = document.getElementById("all-expenses");
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-receipt"></i><p>No expenses match your filters.</p></div>`;
    return;
  }
  container.innerHTML = filtered.map(e => renderExpenseItem(e)).join("");
};

function renderAllExpenses() {
  window.filterExpenses();
}

// =============================================
// BAR CHART (Last 7 Days)
// =============================================
function renderBarChart() {
  const container = document.getElementById("bar-chart");
  const days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const total = allExpenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
    days.push({
      label: i === 0 ? "Today" : d.toLocaleDateString("en", { weekday: "short" }),
      date: dateStr,
      total,
      isToday: i === 0
    });
  }

  const max = Math.max(...days.map(d => d.total), 1);

  container.innerHTML = days.map(d => {
    const pct = Math.round((d.total / max) * 100);
    return `
      <div class="bar-item">
        <div class="bar-fill ${d.isToday ? "today" : ""}" style="height:${Math.max(pct, 3)}%" title="₹${formatNum(d.total)}"></div>
        <span class="bar-label">${d.label}</span>
      </div>`;
  }).join("");
}

// =============================================
// DONUT CHART (Canvas)
// =============================================
function renderDonutChart() {
  const canvas = document.getElementById("donut-canvas");
  const ctx = canvas.getContext("2d");
  const catTotals = {};
  allExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });

  const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  document.getElementById("donut-total").textContent = `₹${formatNum(total)}`;

  ctx.clearRect(0, 0, 220, 220);
  if (entries.length === 0) {
    ctx.beginPath();
    ctx.arc(110, 110, 85, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 22;
    ctx.stroke();
    document.getElementById("donut-legend").innerHTML = "";
    return;
  }

  let startAngle = -Math.PI / 2;
  entries.forEach(([cat, amt]) => {
    const slice = (amt / total) * 2 * Math.PI;
    const color = CATEGORY_COLORS[cat] || "#64748b";
    ctx.beginPath();
    ctx.arc(110, 110, 85, startAngle, startAngle + slice);
    ctx.strokeStyle = color;
    ctx.lineWidth = 22;
    ctx.lineCap = "round";
    ctx.stroke();
    startAngle += slice + 0.02;
  });

  document.getElementById("donut-legend").innerHTML = entries.slice(0, 6).map(([cat, amt]) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${CATEGORY_COLORS[cat] || '#64748b'}"></div>
      <span class="legend-name">${cat}</span>
      <span class="legend-amount">₹${formatNum(amt)}</span>
    </div>`).join("");
}

// =============================================
// MONTHLY BREAKDOWN
// =============================================
function renderMonthlyBreakdown() {
  const months = {};
  allExpenses.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
    months[key] = months[key] || { label, total: 0 };
    months[key].total += e.amount;
  });

  const sorted = Object.entries(months).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  const maxAmt = Math.max(...sorted.map(([, v]) => v.total), 1);

  document.getElementById("monthly-list").innerHTML = sorted.length === 0
    ? `<p style="color:var(--text-3);font-size:0.88rem;">No data yet.</p>`
    : sorted.map(([, v]) => `
      <div class="month-row">
        <span class="month-name">${v.label}</span>
        <div class="month-bar-wrap"><div class="month-bar" style="width:${(v.total / maxAmt) * 100}%"></div></div>
        <span class="month-amount">₹${formatNum(v.total)}</span>
      </div>`).join("");
}

// =============================================
// NAVIGATION
// =============================================
window.navigateTo = function (section) {
  document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
  document.getElementById(`section-${section}`).classList.add("active");

  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.querySelector(`[data-section="${section}"]`)?.classList.add("active");

  const titles = { dashboard: "Dashboard", expenses: "All Expenses", analytics: "Analytics", budget: "Budget" };
  document.getElementById("topbar-title").textContent = titles[section] || "Dashboard";

  // Close sidebar on mobile
  if (window.innerWidth <= 900) closeSidebar();
};

window.toggleSidebar = function () {
  const sb = document.getElementById("sidebar");
  const ov = document.getElementById("overlay");
  sb.classList.toggle("open");
  ov.classList.toggle("visible");
};

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("visible");
}

// =============================================
// MODAL
// =============================================
window.openModal = function () {
  document.getElementById("modal-overlay").classList.remove("hidden");
  document.getElementById("expense-date").value = new Date().toISOString().split("T")[0];
};

window.closeModal = function () {
  document.getElementById("modal-overlay").classList.add("hidden");
  document.getElementById("expense-title").value = "";
  document.getElementById("expense-amount").value = "";
  document.getElementById("expense-category").value = "";
  document.getElementById("expense-note").value = "";
  document.getElementById("editing-id").value = "";
  document.getElementById("modal-title").textContent = "Add Expense";
  document.getElementById("save-btn-text").textContent = "Save Expense";
  document.getElementById("modal-error").textContent = "";
  editingId = null;
};

window.closeModalOutside = function (e) {
  if (e.target.id === "modal-overlay") closeModal();
};

// =============================================
// AUTH UI HELPERS
// =============================================
window.switchTab = function (tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.querySelector(`[data-tab="${tab}"]`).classList.add("active");
  document.getElementById(`${tab}-tab`).classList.add("active");
  document.getElementById("auth-error").textContent = "";
};

window.togglePw = function (id) {
  const inp = document.getElementById(id);
  inp.type = inp.type === "password" ? "text" : "password";
};

function showAuthError(msg) { document.getElementById("auth-error").textContent = msg; }
function showModalError(msg) { document.getElementById("modal-error").textContent = msg; }
function showLoader(show) { document.getElementById("auth-loader").classList.toggle("hidden", !show); }

// =============================================
// TOAST
// =============================================
let toastTimer;
window.showToast = function (msg, type = "info") {
  const t = document.getElementById("toast");
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  t.innerHTML = `${icons[type] || ""} ${msg}`;
  t.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 3000);
};

// =============================================
// UTILITIES
// =============================================
function formatNum(n) {
  if (n >= 1e5) return (n / 1e5).toFixed(1) + "L";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return d.toLocaleDateString("en", { day: "numeric", month: "short" });
}

function escapeHtml(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found": "No account with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "Email already registered.",
    "auth/weak-password": "Password too weak (min 6 chars).",
    "auth/invalid-email": "Invalid email address.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/popup-closed-by-user": "Google sign-in cancelled.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// Auth tab buttons
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});
