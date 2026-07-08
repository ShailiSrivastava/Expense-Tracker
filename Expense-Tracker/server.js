const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'transactions.json');
const STATIC_ROOT = __dirname;

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
}

function readTransactions() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeTransactions(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  };
  return map[ext] || 'application/octet-stream';
}

function serveStatic(req, res) {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname || '/');
  if (pathname === '/') pathname = '/index.html';
  const safePath = path.normalize(path.join(STATIC_ROOT, pathname));

  if (!safePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(safePath, (error, file) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': getMimeType(safePath) });
    res.end(file);
  });
}

function generateId() {
  return crypto.randomUUID();
}

function toMonthKey(dateString) {
  return dateString.slice(0, 7);
}

function createSummary(transactions, month) {
  const filtered = month && month !== 'all'
    ? transactions.filter(item => toMonthKey(item.date) === month)
    : transactions;

  const income = filtered.filter(item => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = filtered.filter(item => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = income - expense;

  const categories = filtered.filter(item => item.type === 'expense').reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
    return acc;
  }, {});

  return {
    month: month || 'all',
    income,
    expense,
    balance,
    categories,
    transactions: filtered.length
  };
}

function buildCsv(transactions) {
  const header = ['id', 'description', 'type', 'amount', 'category', 'date', 'paymentMethod', 'recurring'];
  const rows = transactions.map(item => [item.id, item.description, item.type, item.amount, item.category, item.date, item.paymentMethod || '', item.recurring ? 'true' : 'false']);
  const csvLines = [header.join(',')].concat(rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')));
  return csvLines.join('\n');
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/transactions') {
    if (req.method === 'GET') {
      const transactions = readTransactions();
      return sendJson(res, 200, transactions);
    }

    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const { description, amount, type, category, date, paymentMethod, recurring } = body;

        if (!description || !amount || !type || !category || !date) {
          return sendJson(res, 400, { error: 'Please fill out all required fields.' });
        }

        const transaction = {
          id: generateId(),
          description,
          amount: Number(amount),
          type,
          category,
          date,
          paymentMethod: paymentMethod || 'Card',
          recurring: Boolean(recurring)
        };

        const transactions = readTransactions();
        transactions.unshift(transaction);
        writeTransactions(transactions);
        return sendJson(res, 201, transaction);
      } catch (error) {
        return sendJson(res, 400, { error: 'Invalid JSON payload.' });
      }
    }
  }

  if (pathname.startsWith('/api/transactions/')) {
    const id = pathname.split('/').pop();
    const transactions = readTransactions();
    const index = transactions.findIndex(item => item.id === id);

    if (index === -1) {
      return sendJson(res, 404, { error: 'Transaction not found.' });
    }

    if (req.method === 'PUT') {
      try {
        const body = await parseBody(req);
        const updated = {
          ...transactions[index],
          ...body,
          amount: Number(body.amount),
          recurring: Boolean(body.recurring)
        };
        transactions[index] = updated;
        writeTransactions(transactions);
        return sendJson(res, 200, updated);
      } catch (error) {
        return sendJson(res, 400, { error: 'Invalid JSON payload.' });
      }
    }

    if (req.method === 'DELETE') {
      transactions.splice(index, 1);
      writeTransactions(transactions);
      return sendJson(res, 200, { success: true });
    }
  }

  if (pathname === '/api/summary') {
    const transactions = readTransactions();
    return sendJson(res, 200, createSummary(transactions, parsedUrl.query.month));
  }

  if (pathname === '/api/export') {
    const transactions = readTransactions();
    const month = parsedUrl.query.month;
    const filtered = month && month !== 'all' ? transactions.filter(item => toMonthKey(item.date) === month) : transactions;
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="transactions.csv"'
    });
    res.end(buildCsv(filtered));
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Expense tracker running at http://localhost:${PORT}`);
});
