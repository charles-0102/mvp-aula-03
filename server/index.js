import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { createStore, priorities, statuses, labels, publicUser, passwordMatches } from './store.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_BODY = 24000;
const SESSION_MS = 8 * 60 * 60 * 1000;
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const requireThat = (condition, status, message) => { if (!condition) throw new HttpError(status, message); };
function field(value, label, max) {
  requireThat(typeof value === 'string' && value.trim().length > 0, 422, `${label} é obrigatório.`);
  requireThat(value.trim().length <= max, 422, `${label} deve ter no máximo ${max} caracteres.`);
  return value.trim();
}
async function body(req) {
  requireThat(req.headers['content-type']?.split(';')[0] === 'application/json', 415, 'Envie os dados em JSON.');
  let length = 0; const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    requireThat(length <= MAX_BODY, 413, 'O conteúdo enviado é muito grande.');
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    requireThat(data && typeof data === 'object' && !Array.isArray(data), 400, 'Dados inválidos.');
    return data;
  } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Dados inválidos.'); }
}

export function createApp({ dataFile = resolve(root, 'data/store.json') } = {}) {
  const store = createStore(dataFile);
  const sessions = new Map();
  const failures = new Map();
  function token(req) { return req.headers.cookie?.split('; ').find(item => item.startsWith('central_session='))?.slice(16); }
  function userFor(req) {
    const id = token(req); const session = sessions.get(id);
    if (!session || session.expiresAt <= Date.now()) { sessions.delete(id); throw new HttpError(401, 'Sua sessão terminou. Entre novamente.'); }
    const user = store.read().users.find(item => item.id === session.userId);
    requireThat(user, 401, 'Entre novamente para continuar.');
    return user;
  }
  function access(ticket, user) {
    requireThat(ticket && (user.role === 'admin' || ticket.requesterId === user.id), 404, 'Demanda não encontrada.');
  }
  function ticketView(ticket, users) {
    const byId = id => publicUser(users.find(user => user.id === id));
    return { ...ticket, requester: byId(ticket.requesterId), comments: ticket.comments.map(comment => ({ ...comment, author: byId(comment.authorId) })), history: ticket.history.map(event => ({ ...event, actor: byId(event.actorId) })) };
  }
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    try {
      const hostname = req.headers.host?.split(':')[0];
      requireThat(['localhost', '127.0.0.1'].includes(hostname), 403, 'Este protótipo está disponível apenas localmente.');
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) {
          requireThat(!req.headers.origin || req.headers.origin === `http://${req.headers.host}`, 403, 'Origem não permitida.');
          requireThat(req.headers['sec-fetch-site'] !== 'cross-site', 403, 'Origem não permitida.');
        }
        if (url.pathname === '/api/login' && req.method === 'POST') {
          const input = await body(req);
          const key = req.socket.remoteAddress;
          const attempts = failures.get(key);
          requireThat(!attempts || attempts.until < Date.now() || attempts.count < 20, 429, 'Muitas tentativas. Aguarde alguns minutos.');
          const email = field(input.email, 'E-mail', 200).toLowerCase();
          const password = field(input.password, 'Senha', 200);
          const user = store.read().users.find(item => item.email === email);
          if (!user || !passwordMatches(password, user.passwordHash)) {
            failures.set(key, { count: (attempts?.until > Date.now() ? attempts.count : 0) + 1, until: Date.now() + 300000 });
            throw new HttpError(401, 'E-mail ou senha incorretos. Confira os dados e tente novamente.');
          }
          requireThat(input.role === user.role, 403, `Esta conta é de ${user.role === 'admin' ? 'gestor' : 'solicitante'}. Use a entrada correspondente.`);
          failures.delete(key);
          for (const [id, session] of sessions) if (session.expiresAt <= Date.now()) sessions.delete(id);
          sessions.delete(token(req));
          const id = randomBytes(32).toString('hex');
          sessions.set(id, { userId: user.id, expiresAt: Date.now() + SESSION_MS });
          res.setHeader('Set-Cookie', `central_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`);
          return send(200, { user: publicUser(user) });
        }
        if (url.pathname === '/api/logout' && req.method === 'POST') {
          sessions.delete(token(req));
          res.setHeader('Set-Cookie', 'central_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
          return send(200, { ok: true });
        }
        const user = userFor(req);
        if (url.pathname === '/api/me' && req.method === 'GET') return send(200, { user: publicUser(user) });
        if (url.pathname === '/api/tickets' && req.method === 'GET') {
          const data = store.read();
          return send(200, { tickets: data.tickets.filter(ticket => user.role === 'admin' || ticket.requesterId === user.id).map(ticket => ticketView(ticket, data.users)) });
        }
        if (url.pathname === '/api/tickets' && req.method === 'POST') {
          requireThat(user.role === 'solicitante', 403, 'Somente solicitantes podem abrir demandas.');
          const input = await body(req);
          const title = field(input.title, 'Título', 120);
          const description = field(input.description, 'Descrição', 5000);
          requireThat(priorities.includes(input.priority), 422, 'Selecione uma prioridade válida.');
          const justification = field(input.justification, 'Justificativa da prioridade', 2000);
          const ticket = store.change(data => {
            const now = new Date().toISOString();
            const ticket = { id: randomUUID(), number: data.nextNumber++, requesterId: user.id, title, description, priority: input.priority, justification, status: 'aberta', createdAt: now, updatedAt: now, completedAt: null, comments: [], history: [{ id: randomUUID(), actorId: user.id, type: 'created', at: now, text: 'Demanda aberta', to: 'aberta' }] };
            data.tickets.push(ticket);
            return ticketView(ticket, data.users);
          });
          return send(201, { ticket });
        }
        const match = url.pathname.match(/^\/api\/tickets\/([a-zA-Z0-9-]+)(?:\/(comments|status|priority))?$/);
        if (match) {
          const [, ticketId, action] = match;
          const data = store.read();
          access(data.tickets.find(item => item.id === ticketId), user);
          if (req.method === 'GET' && !action) return send(200, { ticket: ticketView(data.tickets.find(item => item.id === ticketId), data.users) });
          if (req.method === 'POST' && action) {
            const input = await body(req);
            const ticket = store.change(data => {
              const ticket = data.tickets.find(item => item.id === ticketId);
              access(ticket, user);
              requireThat(ticket.status !== 'concluida', 409, 'Esta demanda foi concluída e está disponível apenas para leitura.');
              const now = new Date().toISOString();
              if (action === 'comments') {
                ticket.comments.push({ id: randomUUID(), authorId: user.id, text: field(input.text, 'Comentário', 5000), createdAt: now });
              } else {
                requireThat(user.role === 'admin', 403, 'Somente o gestor pode realizar esta ação.');
                if (action === 'status') {
                  requireThat(input.status === statuses[statuses.indexOf(ticket.status) + 1], 422, 'Avance para a próxima etapa do atendimento.');
                  if (input.status === 'concluida') {
                    requireThat(ticket.comments.some(comment => data.users.find(item => item.id === comment.authorId)?.role === 'admin'), 422, 'Envie uma resposta ao solicitante antes de concluir.');
                    ticket.completedAt = now;
                  }
                  ticket.history.push({ id: randomUUID(), actorId: user.id, type: 'status', from: ticket.status, to: input.status, at: now, text: input.status === 'concluida' ? 'Concluiu a demanda' : 'Iniciou o atendimento' });
                  ticket.status = input.status;
                } else if (action === 'priority') {
                  requireThat(priorities.includes(input.priority), 422, 'Selecione uma prioridade válida.');
                  requireThat(input.priority !== ticket.priority, 422, 'Escolha uma prioridade diferente da atual.');
                  const reason = field(input.reason, 'Motivo da revisão', 2000);
                  ticket.history.push({ id: randomUUID(), actorId: user.id, type: 'priority', from: ticket.priority, to: input.priority, reason, at: now, text: `Alterou a prioridade de ${labels[ticket.priority]} para ${labels[input.priority]}` });
                  ticket.priority = input.priority;
                }
              }
              ticket.updatedAt = now;
              return ticketView(ticket, data.users);
            });
            return send(200, { ticket });
          }
        }
        throw new HttpError(404, 'Recurso não encontrado.');
      }
      requireThat(req.method === 'GET' || req.method === 'HEAD', 405, 'Método não permitido.');
      const pages = ['/', '/login', '/admin/login', '/app'];
      const assets = { '/app.js': 'text/javascript', '/styles.css': 'text/css', '/favicon.svg': 'image/svg+xml' };
      const file = pages.includes(url.pathname) ? 'index.html' : assets[url.pathname] ? url.pathname.slice(1) : null;
      requireThat(file, 404, 'Página não encontrada.');
      const content = await readFile(resolve(root, 'public', file));
      res.writeHead(200, { 'Content-Type': `${assets[url.pathname] || 'text/html'}; charset=utf-8`, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (!error.status) console.error('Erro interno:', error.message);
      send(error.status || 500, error.status ? { error: error.message } : { error: 'Não foi possível salvar ou carregar os dados. Tente novamente.' });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5173);
  const app = createApp();
  app.listen(port, '127.0.0.1', () => console.log(`Central de Demandas disponível em http://127.0.0.1:${port}`));
  app.on('error', error => { console.error(`Não foi possível iniciar: ${error.message}`); process.exitCode = 1; });
}
