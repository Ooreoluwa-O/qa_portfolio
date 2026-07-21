/**
 * A tiny, dependency-free mock REST API used as the system under test
 * for the API test suite. Modeled loosely on a typical "Users" resource
 * (create / read / update / delete), similar in shape to public test
 * APIs like reqres.in, but self-hosted so tests are fast, deterministic,
 * and don't depend on a third-party service being up.
 *
 * Run standalone with: node mock-server/server.js
 * Playwright's webServer config starts/stops it automatically for tests.
 */
const http = require('http');

let users = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com', role: 'member' },
  { id: 3, name: 'Grace Hopper', email: 'grace@example.com', role: 'member' },
];
let nextId = 4;

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean); // e.g. ['api','users','2']

  try {
    // GET /api/users  (supports ?page=&per_page=)
    if (req.method === 'GET' && parts.length === 2 && parts[0] === 'api' && parts[1] === 'users') {
      const page = Number(url.searchParams.get('page') || 1);
      const perPage = Number(url.searchParams.get('per_page') || 6);
      const start = (page - 1) * perPage;
      const pageData = users.slice(start, start + perPage);
      return send(res, 200, {
        page,
        per_page: perPage,
        total: users.length,
        total_pages: Math.ceil(users.length / perPage),
        data: pageData,
      });
    }

    // GET /api/users/:id
    if (req.method === 'GET' && parts.length === 3 && parts[0] === 'api' && parts[1] === 'users') {
      const id = Number(parts[2]);
      const user = users.find((u) => u.id === id);
      if (!user) return send(res, 404, { error: 'User not found' });
      return send(res, 200, { data: user });
    }

    // POST /api/users
    if (req.method === 'POST' && parts.length === 2 && parts[0] === 'api' && parts[1] === 'users') {
      const body = await readBody(req);
      if (!body.name || !body.email) {
        return send(res, 400, { error: 'name and email are required' });
      }
      const user = { id: nextId++, name: body.name, email: body.email, role: body.role || 'member' };
      users.push(user);
      return send(res, 201, { data: user });
    }

    // PUT /api/users/:id
    if (req.method === 'PUT' && parts.length === 3 && parts[0] === 'api' && parts[1] === 'users') {
      const id = Number(parts[2]);
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) return send(res, 404, { error: 'User not found' });
      const body = await readBody(req);
      users[idx] = { ...users[idx], ...body, id };
      return send(res, 200, { data: users[idx] });
    }

    // DELETE /api/users/:id
    if (req.method === 'DELETE' && parts.length === 3 && parts[0] === 'api' && parts[1] === 'users') {
      const id = Number(parts[2]);
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) return send(res, 404, { error: 'User not found' });
      users.splice(idx, 1);
      return send(res, 204, {});
    }

    // Simple login page (used by the UI test suite)
    if (req.method === 'GET' && parts.length === 0) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'index.html')));
    }

    return send(res, 404, { error: 'Not found' });
  } catch (err) {
    return send(res, 500, { error: 'Internal server error', details: err.message });
  }
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  server.listen(PORT, () => console.log(`Mock API server listening on http://localhost:${PORT}`));
}

module.exports = server;
