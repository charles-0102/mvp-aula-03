import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server/index.js';

test('fluxo completo, autorização e persistência do protótipo', async t => {
  const folder = mkdtempSync(join(tmpdir(), 'central-test-'));
  const dataFile = join(folder, 'store.json');
  let server = createApp({ dataFile });
  const start = async () => { server.listen(0, '127.0.0.1'); await once(server, 'listening'); return `http://127.0.0.1:${server.address().port}`; };
  let base = await start();
  const stop = () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  t.after(async () => { await stop(); rmSync(folder, { recursive: true, force: true }); });
  async function request(path, { cookie, method = 'GET', data, headers = {} } = {}) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  }
  const login = async (email, role) => {
    const result = await request('/api/login', { method: 'POST', data: { email, password: 'Demo123!', role } });
    assert.equal(result.status, 200);
    assert.match(result.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    assert.equal(result.body.user.passwordHash, undefined);
    return result.cookie;
  };
  let ana, rui, bruno, ticketId, ticketNumber;
  const valid = { title: 'Teclado para a demonstração', description: 'Meu teclado está com uma tecla quebrada.', priority: 'normal', justification: 'Tenho um teclado provisório, mas preciso substituir o meu.' };

  await t.test('recusa anônimos, senha inválida e perfil incompatível', async () => {
    assert.equal((await request('/api/tickets')).status, 401);
    assert.equal((await request('/api/login', { method: 'POST', data: { email: 'ana@demo.local', password: 'errada', role: 'solicitante' } })).status, 401);
    assert.equal((await request('/api/login', { method: 'POST', data: { email: 'ana@demo.local', password: 'Demo123!', role: 'admin' } })).status, 403);
    ana = await login('ana@demo.local', 'solicitante');
    rui = await login('rui@demo.local', 'admin');
    bruno = await login('bruno@demo.local', 'solicitante');
  });
  await t.test('isola demandas e comentários entre dois solicitantes', async () => {
    const own = (await request('/api/tickets', { cookie: ana })).body.tickets;
    const others = (await request('/api/tickets', { cookie: bruno })).body.tickets;
    const all = (await request('/api/tickets', { cookie: rui })).body.tickets;
    assert.ok(own.every(ticket => ticket.requesterId === 'ana'));
    assert.ok(others.every(ticket => ticket.requesterId === 'bruno'));
    assert.equal(all.length, own.length + others.length);
    assert.equal((await request(`/api/tickets/${others[0].id}`, { cookie: ana })).status, 404);
    assert.equal((await request(`/api/tickets/${others[0].id}/comments`, { cookie: ana, method: 'POST', data: { text: 'Tentativa indevida' } })).status, 404);
  });
  await t.test('exige justificativa em todas as prioridades e rejeita campos vazios', async () => {
    for (const priority of ['baixa', 'normal', 'alta', 'critica']) {
      for (const justification of ['', '   ', undefined]) {
        const result = await request('/api/tickets', { cookie: ana, method: 'POST', data: { ...valid, priority, justification } });
        assert.equal(result.status, 422, `${priority} não pode ser salva sem justificativa`);
      }
    }
    for (const field of ['title', 'description']) assert.equal((await request('/api/tickets', { cookie: ana, method: 'POST', data: { ...valid, [field]: '  ' } })).status, 422);
    assert.equal((await request('/api/tickets', { cookie: ana, method: 'POST', data: { ...valid, priority: 'inventada' } })).status, 422);
  });
  await t.test('cria demanda sem aceitar autoria, situação ou número enviados pelo cliente', async () => {
    const result = await request('/api/tickets', { cookie: ana, method: 'POST', data: { ...valid, requesterId: 'bruno', number: 1, status: 'concluida', role: 'admin' } });
    assert.equal(result.status, 201);
    assert.equal(result.body.ticket.requesterId, 'ana');
    assert.equal(result.body.ticket.status, 'aberta');
    assert.notEqual(result.body.ticket.number, 1);
    assert.equal(result.body.ticket.history[0].actorId, 'ana');
    ticketId = result.body.ticket.id; ticketNumber = result.body.ticket.number;
    assert.equal((await request('/api/tickets', { cookie: rui, method: 'POST', data: valid })).status, 403);
  });
  await t.test('somente gestor revisa prioridade; motivo obrigatório fica no histórico', async () => {
    assert.equal((await request(`/api/tickets/${ticketId}/priority`, { cookie: ana, method: 'POST', data: { priority: 'alta', reason: 'Teste' } })).status, 403);
    assert.equal((await request(`/api/tickets/${ticketId}/priority`, { cookie: rui, method: 'POST', data: { priority: 'alta', reason: ' ' } })).status, 422);
    const before = (await request(`/api/tickets/${ticketId}`, { cookie: rui })).body.ticket;
    assert.equal(before.priority, 'normal');
    assert.equal(before.history.length, 1);
    const changed = await request(`/api/tickets/${ticketId}/priority`, { cookie: rui, method: 'POST', data: { priority: 'alta', reason: 'A entrega foi antecipada.' } });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.ticket.history.at(-1).reason, 'A entrega foi antecipada.');
    assert.equal(changed.body.ticket.history.at(-1).from, 'normal');
    assert.equal(changed.body.ticket.justification, valid.justification);
  });
  await t.test('transições válidas, resposta antes de concluir e autoria de comentários', async () => {
    assert.equal((await request(`/api/tickets/${ticketId}/status`, { cookie: ana, method: 'POST', data: { status: 'em_atendimento' } })).status, 403);
    assert.equal((await request(`/api/tickets/${ticketId}/status`, { cookie: rui, method: 'POST', data: { status: 'concluida' } })).status, 422);
    assert.equal((await request(`/api/tickets/${ticketId}/status`, { cookie: rui, method: 'POST', data: { status: 'em_atendimento' } })).status, 200);
    assert.equal((await request(`/api/tickets/${ticketId}/status`, { cookie: rui, method: 'POST', data: { status: 'concluida' } })).status, 422);
    assert.equal((await request(`/api/tickets/${ticketId}/comments`, { cookie: rui, method: 'POST', data: { text: '   ' } })).status, 422);
    const comment = await request(`/api/tickets/${ticketId}/comments`, { cookie: rui, method: 'POST', data: { text: 'O teclado novo já está disponível.', authorId: 'ana' } });
    assert.equal(comment.status, 200);
    assert.equal(comment.body.ticket.comments.at(-1).authorId, 'rui');
    const done = await request(`/api/tickets/${ticketId}/status`, { cookie: rui, method: 'POST', data: { status: 'concluida' } });
    assert.equal(done.status, 200);
    assert.ok(done.body.ticket.completedAt);
    assert.equal(done.body.ticket.history.at(-1).to, 'concluida');
  });
  await t.test('conclusão bloqueia comentários, revisão e reabertura por API', async () => {
    for (const cookie of [ana, rui]) {
      assert.equal((await request(`/api/tickets/${ticketId}/comments`, { cookie, method: 'POST', data: { text: 'Tarde demais' } })).status, 409);
      assert.equal((await request(`/api/tickets/${ticketId}/priority`, { cookie, method: 'POST', data: { priority: 'baixa', reason: 'Teste' } })).status, 409);
      assert.equal((await request(`/api/tickets/${ticketId}/status`, { cookie, method: 'POST', data: { status: 'aberta' } })).status, 409);
    }
  });
  await t.test('criações simultâneas têm números únicos; requisições de outra origem falham', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => request('/api/tickets', { cookie: ana, method: 'POST', data: { ...valid, title: `Pedido simultâneo ${i}` } })));
    assert.ok(results.every(result => result.status === 201));
    assert.equal(new Set(results.map(result => result.body.ticket.number)).size, 8);
    assert.equal((await request('/api/tickets', { cookie: ana, method: 'POST', headers: { Origin: 'https://outro-site.example' }, data: valid })).status, 403);
    assert.equal((await request('/.env')).status, 404);
    assert.equal((await request('/data/store.json')).status, 404);
  });
  await t.test('persistência após reiniciar e invalidação da sessão após sair', async () => {
    await stop(); server = createApp({ dataFile }); base = await start();
    assert.equal((await request('/api/tickets', { cookie: ana })).status, 401);
    ana = await login('ana@demo.local', 'solicitante');
    const restored = (await request(`/api/tickets/${ticketId}`, { cookie: ana })).body.ticket;
    assert.equal(restored.number, ticketNumber);
    assert.equal(restored.status, 'concluida');
    assert.equal(restored.comments[0].text, 'O teclado novo já está disponível.');
    assert.equal((await request('/api/logout', { cookie: ana, method: 'POST', data: {} })).status, 200);
    assert.equal((await request('/api/me', { cookie: ana })).status, 401);
  });
});
