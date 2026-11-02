const express = require('express');
const Redis = require('ioredis');
const { Pool } = require('pg');

const redis = new Redis({ host: '127.0.0.1', port: 6379 });
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
app.use(express.json());

const MAX_ACCOUNTS_PER_IP = 1;
const WINDOW_SECONDS = 24 * 60 * 60;

function getIp(req) {
  return (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
}

app.post('/signup', async (req, res) => {
  const ip = getIp(req);
  if (!ip) return res.status(400).json({ error: 'Не вдалось визначити IP' });

  const key = `accounts:ip:${ip}`;

  try {
    const count = await redis.get(key);
    if (count !== null && parseInt(count, 10) >= MAX_ACCOUNTS_PER_IP) {
      return res.status(429).json({ error: 'З цієї IP вже створено забагато акаунтів. Зверніться до підтримки.' });
    }

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Пусті поля' });

    const client = await pg.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query('SELECT id FROM users WHERE email=$1', [email]);
      if (r.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Email вже існує' });
      }
      const insert = await client.query(
        'INSERT INTO users(email, password_hash, signup_ip, created_at) VALUES($1, crypt($2, gen_salt(\'bf\')), $3, now()) RETURNING id',
        [email, password, ip]
      );
      const userId = insert.rows[0].id;
      await client.query('COMMIT');
      
      const newCount = await redis.incr(key);
      if (newCount === 1) {
        await redis.expire(key, WINDOW_SECONDS);
      }

      return res.json({ ok: true, id: userId });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      return res.status(500).json({ error: 'Помилка сервера' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Redis/DB error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

app.listen(3000);
{

}