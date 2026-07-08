const state = {
  transactions: [],
  editingId: null,
  monthFilter: new Date().toISOString().slice(0, 7),
  typeFilter: 'all',
  categoryFilter: 'all',
  search: '',
  budget: Number(localStorage.getItem('budget') || 5000)
};

const form = document.getElementById('transactionForm');
const title = document.getElementById('formTitle');
const buttonText = document.getElementById('submitText');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const paymentMethodInput = document.getElementById('paymentMethod');
const recurringInput = document.getElementById('recurring');

const incomeValue = document.getElementById('incomeValue');
const expenseValue = document.getElementById('expenseValue');
const balanceValue = document.getElementById('balanceValue');
const budgetValue = document.getElementById('budgetValue');
const budgetBar = document.getElementById('budgetBar');
const budgetText = document.getElementById('budgetText');
const categoryBars = document.getElementById('categoryBars');
const transactionList = document.getElementById('transactionList');
const monthFilter = document.getElementById('monthFilter');
const typeFilter = document.getElementById('typeFilter');
const categoryFilter = document.getElementById('categoryFilter');
const searchInput = document.getElementById('search');
const budgetInput = document.getElementById('budgetInput');
const exportBtn = document.getElementById('exportBtn');
const themeToggle = document.getElementById('themeToggle');
const resetBtn = document.getElementById('resetBtn');

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(value) {
  if (!value || value === 'all') return 'All time';
  const [year, month] = value.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function populateMonthFilter() {
  const months = new Set([getCurrentMonth()]);
  state.transactions.forEach(item => months.add(item.date.slice(0, 7)));
  const sortedMonths = Array.from(months).sort().reverse();
  monthFilter.innerHTML = '<option value="all">All time</option>' + sortedMonths.map(month => `<option value="${month}">${monthLabel(month)}</option>`).join('');
  if (!sortedMonths.includes(state.monthFilter)) {
    state.monthFilter = 'all';
  }
  monthFilter.value = state.monthFilter;
}

function populateCategoryFilter() {
  const categories = new Set(state.transactions.map(item => item.category));
  const options = Array.from(categories).sort();
  categoryFilter.innerHTML = '<option value="all">All categories</option>' + options.map(category => `<option value="${category}">${category}</option>`).join('');
  categoryFilter.value = state.categoryFilter;
}

function getFilteredTransactions() {
  return state.transactions.filter(item => {
    const monthMatch = state.monthFilter === 'all' || item.date.startsWith(state.monthFilter);
    const typeMatch = state.typeFilter === 'all' || item.type === state.typeFilter;
    const categoryMatch = state.categoryFilter === 'all' || item.category === state.categoryFilter;
    const searchMatch = !state.search || item.description.toLowerCase().includes(state.search.toLowerCase()) || item.category.toLowerCase().includes(state.search.toLowerCase());
    return monthMatch && typeMatch && categoryMatch && searchMatch;
  });
}

function renderSummary() {
  const filtered = getFilteredTransactions();
  const income = filtered.filter(item => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = filtered.filter(item => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = income - expense;

  incomeValue.textContent = formatCurrency(income);
  expenseValue.textContent = formatCurrency(expense);
  balanceValue.textContent = formatCurrency(balance);

  const budgetUsed = expense;
  const ratio = state.budget > 0 ? Math.min(100, (budgetUsed / state.budget) * 100) : 0;
  budgetValue.textContent = formatCurrency(budgetUsed) + ' / ' + formatCurrency(state.budget);
  budgetBar.style.width = `${ratio}%`;
  budgetText.textContent = ratio >= 100 ? 'Budget reached' : `${Math.round(100 - ratio)}% remaining`;
  budgetBar.style.background = ratio >= 100 ? 'linear-gradient(90deg, #ef4444, #f59e0b)' : 'linear-gradient(90deg, #22c55e, #38bdf8)';
}

function renderCategoryBars() {
  const filtered = getFilteredTransactions().filter(item => item.type === 'expense');
  const totals = filtered.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
    return acc;
  }, {});

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    categoryBars.innerHTML = '<div class="empty">No expense data for this view yet.</div>';
    return;
  }

  categoryBars.innerHTML = entries.map(([name, total]) => {
    const percentage = Math.round((total / Math.max(...entries.map(([, value]) => value))) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label">
          <span>${name}</span>
          <strong>${formatCurrency(total)}</strong>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTransactions() {
  const filtered = getFilteredTransactions().sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!filtered.length) {
    transactionList.innerHTML = '<div class="empty">No transactions match your filters.</div>';
    return;
  }

  transactionList.innerHTML = filtered.map(item => `
    <article class="transaction-card ${item.type === 'expense' ? 'expense' : 'income'}">
      <div class="transaction-main">
        <div class="transaction-title-row">
          <h4>${item.description}</h4>
          <span class="pill ${item.type}">${item.type}</span>
        </div>
        <p>${item.category} • ${item.paymentMethod || 'Card'} • ${new Date(item.date).toLocaleDateString()}</p>
        <div class="meta-row">
          ${item.recurring ? '<span class="pill recurring">Recurring</span>' : ''}
          <span class="amount ${item.type === 'expense' ? 'negative' : 'positive'}">${item.type === 'expense' ? '-' : '+'}${formatCurrency(item.amount)}</span>
        </div>
      </div>
      <div class="action-row">
        <button class="icon-btn edit-btn" data-id="${item.id}">✎</button>
        <button class="icon-btn delete-btn" data-id="${item.id}">🗑</button>
      </div>
    </article>
  `).join('');
}

function resetForm() {
  form.reset();
  dateInput.value = new Date().toISOString().slice(0, 10);
  typeInput.value = 'expense';
  categoryInput.value = 'Food';
  paymentMethodInput.value = 'Card';
  recurringInput.checked = false;
  state.editingId = null;
  title.textContent = 'Add new transaction';
  buttonText.textContent = 'Save transaction';
}

async function loadTransactions() {
  const response = await fetch('/api/transactions');
  const data = await response.json();
  state.transactions = data;
  populateMonthFilter();
  populateCategoryFilter();
  render();
}

function render() {
  renderSummary();
  renderCategoryBars();
  renderTransactions();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const payload = {
    description: descriptionInput.value.trim(),
    amount: amountInput.value,
    type: typeInput.value,
    category: categoryInput.value,
    date: dateInput.value,
    paymentMethod: paymentMethodInput.value,
    recurring: recurringInput.checked
  };

  if (!payload.description || !payload.amount || !payload.date) return;

  const url = state.editingId ? `/api/transactions/${state.editingId}` : '/api/transactions';
  const method = state.editingId ? 'PUT' : 'POST';
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    resetForm();
    await loadTransactions();
  }
});

transactionList.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;

  const id = button.dataset.id;
  if (button.classList.contains('delete-btn')) {
    const confirmed = confirm('Delete this transaction?');
    if (!confirmed) return;
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    await loadTransactions();
    return;
  }

  if (button.classList.contains('edit-btn')) {
    const item = state.transactions.find(entry => entry.id === id);
    if (!item) return;
    descriptionInput.value = item.description;
    amountInput.value = item.amount;
    typeInput.value = item.type;
    categoryInput.value = item.category;
    dateInput.value = item.date;
    paymentMethodInput.value = item.paymentMethod || 'Card';
    recurringInput.checked = Boolean(item.recurring);
    state.editingId = item.id;
    title.textContent = 'Edit transaction';
    buttonText.textContent = 'Update transaction';
    descriptionInput.focus();
  }
});

[monthFilter, typeFilter, categoryFilter, searchInput].forEach(element => {
  element.addEventListener('input', event => {
    if (event.target === monthFilter) state.monthFilter = monthFilter.value;
    if (event.target === typeFilter) state.typeFilter = typeFilter.value;
    if (event.target === categoryFilter) state.categoryFilter = categoryFilter.value;
    if (event.target === searchInput) state.search = searchInput.value;
    render();
  });
});

budgetInput.addEventListener('input', event => {
  state.budget = Number(event.target.value || 0);
  localStorage.setItem('budget', String(state.budget));
  renderSummary();
});

exportBtn.addEventListener('click', () => {
  const month = state.monthFilter === 'all' ? '' : `?month=${encodeURIComponent(state.monthFilter)}`;
  window.location.href = `/api/export${month}`;
});

themeToggle.addEventListener('click', () => {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
});

resetBtn.addEventListener('click', () => {
  resetForm();
});

window.addEventListener('DOMContentLoaded', async () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
  budgetInput.value = state.budget;
  dateInput.value = new Date().toISOString().slice(0, 10);
  monthFilter.value = state.monthFilter;
  typeFilter.value = state.typeFilter;
  categoryFilter.value = state.categoryFilter;
  searchInput.value = state.search;
  await loadTransactions();
});
