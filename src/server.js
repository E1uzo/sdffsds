const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, '..', 'data', 'Users.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) console.error('Database connection failed:', err.message);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/users', (req, res) => {
  const { firstName, lastName, phoneNumber } = req.body || {};
  if (![firstName, lastName, phoneNumber].every(v => typeof v === 'string' && v.trim())) {
    return res.status(400).json({ error: 'firstName, lastName and phoneNumber are required non-empty strings' });
  }
  const phone = phoneNumber.trim();
  if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phoneNumber format' });
  }
  const user = { firstName: firstName.trim(), lastName: lastName.trim(), phoneNumber: phone };
  db.run('INSERT INTO Users (firstName, lastName, phoneNumber) VALUES (?, ?, ?)',
    [user.firstName, user.lastName, user.phoneNumber], function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Phone number already exists' });
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, ...user });
    });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Invalid JSON' });
  next(err);
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
}
module.exports = app;
