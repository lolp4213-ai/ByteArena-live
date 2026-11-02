const express = require('express');
const app = express();

const WINDOW_MS = 60 * 1000; 
const MAX_REQUESTS = 100; 
const clients = new Map();   
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  let data = clients.get(ip);

  if (!data || now - data.windowStart > WINDOW_MS) {
    data = { count: 1, windowStart: now };
    clients.set(ip, data);
  } else {
    data.count++;
  }

  if (data.count > MAX_REQUESTS) {
    res.status(429).json({ error: 'Too Many Requests' });
    return;
  }

  res.set('X-RateLimit-Limit', MAX_REQUESTS);
  res.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - data.count));
  next();
}

app.use(rateLimit);
app.get('/', (req, res) => res.send('ok'));

app.listen(3000);
