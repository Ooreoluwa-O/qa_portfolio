import { test, expect } from '@playwright/test';

/**
 * API test suite for the Users resource.
 * Covers: happy-path CRUD, status codes, response schema shape,
 * pagination, and negative/error cases.
 */

test.describe('Users API', () => {
  test('GET /api/users returns a paginated list with expected schema', async ({ request }) => {
    const res = await request.get('/api/users?page=1&per_page=2');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('page', 1);
    expect(body).toHaveProperty('per_page', 2);
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(2);

    for (const user of body.data) {
      expect(user).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          email: expect.any(String),
        })
      );
    }
  });

  test('GET /api/users/:id returns a single user', async ({ request }) => {
    const res = await request.get('/api/users/1');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual(
      expect.objectContaining({ id: 1, name: 'Ada Lovelace', email: 'ada@example.com' })
    );
  });

  test('GET /api/users/:id returns 404 for a non-existent user', async ({ request }) => {
    const res = await request.get('/api/users/9999');
    expect(res.status()).toBe(404);

    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/users creates a new user', async ({ request }) => {
    const payload = { name: 'Margaret Hamilton', email: 'margaret@example.com' };
    const res = await request.post('/api/users', { data: payload });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.data).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: payload.name,
        email: payload.email,
        role: 'member', // default role when not specified
      })
    );

    // Verify it's actually retrievable afterwards
    const getRes = await request.get(`/api/users/${body.data.id}`);
    expect(getRes.status()).toBe(200);
  });

  test('POST /api/users returns 400 when required fields are missing', async ({ request }) => {
    const res = await request.post('/api/users', { data: { name: 'No Email' } });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('PUT /api/users/:id updates an existing user', async ({ request }) => {
    const createRes = await request.post('/api/users', {
      data: { name: 'Temp User', email: 'temp@example.com' },
    });
    const created = (await createRes.json()).data;

    const updateRes = await request.put(`/api/users/${created.id}`, {
      data: { role: 'admin' },
    });
    expect(updateRes.status()).toBe(200);

    const updated = (await updateRes.json()).data;
    expect(updated).toEqual(
      expect.objectContaining({ id: created.id, name: 'Temp User', role: 'admin' })
    );
  });

  test('PUT /api/users/:id returns 404 for a non-existent user', async ({ request }) => {
    const res = await request.put('/api/users/9999', { data: { role: 'admin' } });
    expect(res.status()).toBe(404);
  });

  test('DELETE /api/users/:id removes a user', async ({ request }) => {
    const createRes = await request.post('/api/users', {
      data: { name: 'Delete Me', email: 'deleteme@example.com' },
    });
    const created = (await createRes.json()).data;

    const deleteRes = await request.delete(`/api/users/${created.id}`);
    expect(deleteRes.status()).toBe(204);

    const getRes = await request.get(`/api/users/${created.id}`);
    expect(getRes.status()).toBe(404);
  });

  test('DELETE /api/users/:id returns 404 for a non-existent user', async ({ request }) => {
    const res = await request.delete('/api/users/9999');
    expect(res.status()).toBe(404);
  });
});
