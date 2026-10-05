require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'kitstone.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  product TEXT,
  quantity TEXT,
  city TEXT,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'Новая'
)`);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 80, standardHeaders: true, legacyHeaders: false }));

const clean = (value, max = 500) => String(value || '').trim().replace(/[<>]/g, '').slice(0, max);
app.post('/api/leads', (req, res) => {
  const body = req.body || {};
  // Honeypot field catches many simple bots.
  if (body.website) return res.status(200).json({ ok: true });
  const name = clean(body.name, 100);
  const phone = clean(body.phone, 50);
  if (name.length < 2 || phone.length < 6) {
    return res.status(400).json({ ok: false, message: 'Укажите имя и корректный номер телефона.' });
  }
  const result = db.prepare(`INSERT INTO leads (name, phone, company, product, quantity, city, comment)
    VALUES (@name, @phone, @company, @product, @quantity, @city, @comment)`).run({
      name, phone, company: clean(body.company, 150), product: clean(body.product, 100),
      quantity: clean(body.quantity, 100), city: clean(body.city, 100), comment: clean(body.comment, 1500)
    });
  res.status(201).json({ ok: true, id: result.lastInsertRowid, message: 'Заявка сохранена. Спасибо!' });
});

app.get('/api/leads', (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token === 'replace-this-with-a-long-random-secret' || req.get('x-admin-token') !== token) {
    return res.status(401).json({ ok: false, message: 'Нет доступа.' });
  }
  const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 500').all();
  res.json({ ok: true, leads: rows });
});

app.patch('/api/leads/:id/status', (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token === 'replace-this-with-a-long-random-secret' || req.get('x-admin-token') !== token) {
    return res.status(401).json({ ok: false, message: 'Нет доступа.' });
  }
  const status = clean(req.body?.status, 40);
  const allowed = ['Новая', 'В работе', 'Коммерческое предложение', 'Закрыта'];
  if (!allowed.includes(status)) return res.status(400).json({ ok: false, message: 'Недопустимый статус.' });
  const result = db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  if (!result.changes) return res.status(404).json({ ok: false, message: 'Заявка не найдена.' });
  res.json({ ok: true });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Китстоун demo запущен: http://localhost:${PORT}`));
