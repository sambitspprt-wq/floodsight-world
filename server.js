// FloodSight · India — lightweight server
// Serves the dashboard and proxies live weather + geocoding from Open-Meteo
// so the browser only ever talks to this same origin (preview-safe).

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

// ---------- tiny in-memory cache (TTL 10 min) ----------
const cache = new Map();
function cached(key, ttlMs, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return Promise.resolve(hit.data);
  return loader().then((data) => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

// ---------- helpers ----------
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function sendText(res, code, text, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(text);
}

// ---------- Open-Meteo fetchers ----------
async function fetchWeather(lat, lon) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure' +
    '&hourly=precipitation,precipitation_probability,weather_code' +
    '&daily=precipitation_sum,precipitation_probability_max,weather_code' +
    '&timezone=auto&past_days=1&forecast_days=7';

  const r = await fetch(url, { headers: { 'User-Agent': 'FloodSightIndia/1.0' } });
  if (!r.ok) throw new Error('Open-Meteo HTTP ' + r.status);
  return r.json();
}

async function geocode(q) {
  const url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    `?name=${encodeURIComponent(q)}&count=10&language=en&format=json`;
  const r = await fetch(url, { headers: { 'User-Agent': 'FloodSightIndia/1.0' } });
  if (!r.ok) throw new Error('Geocoding HTTP ' + r.status);
  const data = await r.json();
  const results = (data.results || []).slice(0, 10);
  return results.map((r) => ({
    name: r.name,
    state: r.admin1 || '',
    country: r.country || r.country_code || '',
    latitude: r.latitude,
    longitude: r.longitude,
    elevation: r.elevation != null ? Math.round(r.elevation) : null,
    population: r.population || null,
  }));
}

// ---------- request router ----------
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const p = u.pathname;

    // API: weather proxy
    if (p === '/api/weather') {
      const lat = parseFloat(u.searchParams.get('lat'));
      const lon = parseFloat(u.searchParams.get('lon'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return json(res, 400, { error: 'lat/lon required' });
      }
      const key = `w:${lat.toFixed(2)},${lon.toFixed(2)}`;
      try {
        const data = await cached(key, 10 * 60 * 1000, () => fetchWeather(lat, lon));
        return json(res, 200, data);
      } catch (e) {
        return json(res, 502, { error: 'upstream weather error: ' + e.message });
      }
    }

    // API: geocoding proxy
    if (p === '/api/geocode') {
      const q = (u.searchParams.get('q') || '').trim();
      if (q.length < 2) return json(res, 400, { error: 'q required' });
      try {
        const data = await cached('g:' + q.toLowerCase(), 24 * 60 * 60 * 1000, () => geocode(q));
        return json(res, 200, { results: data });
      } catch (e) {
        return json(res, 502, { error: 'upstream geocoding error: ' + e.message });
      }
    }

    // health
    if (p === '/api/health') return json(res, 200, { ok: true, ts: Date.now() });

    // static: serve index.html for everything else
    let file = path.join(ROOT, 'index.html');
    const data = fs.readFileSync(file);
    sendText(res, 200, data, 'text/html; charset=utf-8');
  } catch (e) {
    try { json(res, 500, { error: String(e && e.message || e) }); } catch (_) {}
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('FloodSight World running on http://0.0.0.0:' + PORT);
});
