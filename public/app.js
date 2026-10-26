const $ = selector => document.querySelector(selector);
const app = $('#app');
const dialog = $('#dialog');
const state = { user: null, tickets: [], status: 'all', priority: 'all', query: '', view: 'tickets', loginRole: location.pathname === '/admin/login' ? 'admin' : 'solicitante', detailTab: 'comments', detailId: null, revising: false };
const labels = { baixa: 'Baixa', normal: 'Normal', alta: 'Alta', critica: 'Crítica', aberta: 'Aberta', em_atendimento: 'Em atendimento', concluida: 'Concluída' };
const priorityInfo = { baixa: 'Pode aguardar', normal: 'Rotina da equipe', alta: 'Precisa de atenção', critica: 'Trabalho interrompido' };
const paths = {
  layers: '<path d="m3 7 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  inbox: '<path d="M4 4h16l2 12v4H2v-4L4 4Z"/><path d="M2 16h6l2 3h4l2-3h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  users: '<path d="M16 21v-2a6 6 0 0 0-12 0v2m15-7a5 5 0 0 1 3 5v2M16 3a4 4 0 0 1 0 8"/><circle cx="10" cy="7" r="4"/>',
  logout: '<path d="M9 3H3v18h6m5-14 5 5-5 5m-7-5h12"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  message: '<path d="M21 11a9 9 0 0 1-9 9H4l-3 2 2-6a9 9 0 1 1 18-5Z"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  send: '<path d="m22 2-7 20-4-9-9-4L22 2Zm0 0L11 13"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.inbox}</svg>`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const initials = name => name.split(' ').map(word => word[0]).slice(0, 2).join('');
const date = value => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Recife' }).format(new Date(value)).replace('.', '');
const dateTime = value => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Recife' }).format(new Date(value));
const number = ticket => `DEM-${ticket.number}`;
const admin = () => state.user?.role === 'admin';
const avatar = (user, cls = '') => `<span class="avatar ${user.role === 'admin' ? 'manager-avatar' : ''} ${cls}">${escape(initials(user.name))}</span>`;
const statusBadge = status => `<span class="badge status-${status}"><span class="status-dot"></span>${labels[status]}</span>`;
const priorityBadge = priority => `<span class="priority priority-${priority}"><span class="priority-bars"><i></i><i></i><i></i><i></i></span>${labels[priority]}</span>`;
const logo = () => `<span class="logo-symbol">${icon('layers')}</span><span class="logo-word">central<span>.</span></span>`;
let toastTimer;
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 5000); }
function route(path) { history.replaceState({}, '', path); }
async function api(path, options = {}) {
  let response;
  try { response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }); }
  catch { throw new Error('Não foi possível conectar. Confira se o servidor local está em execução.'); }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== '/login' && state.user) { state.user = null; dialog.close(); route('/login'); renderLogin(); }
    throw new Error(data.error || 'Não foi possível concluir esta ação.');
  }
  return data;
}
const post = (path, data) => api(path, { method: 'POST', body: JSON.stringify(data) });
async function reload() { state.tickets = (await api('/tickets')).tickets; }

function renderLogin() {
  window.scrollTo(0, 0);
  const manager = state.loginRole === 'admin';
  document.title = `${manager ? 'Acesso do gestor' : 'Entrar'} · Central`;
  app.innerHTML = `<main class="login-page">
    <section class="login-story">
      <a class="brand" href="/login" aria-label="Central, início">${logo()}</a>
      <div class="story-content"><span class="eyebrow story-eyebrow"><span></span> SUA EQUIPE, NO MESMO LUGAR</span>
        <h1>Menos ruído.<br>Mais <span>resoluções.</span></h1>
        <p>Do primeiro pedido à última resposta.<br>Um lugar para acompanhar cada passo.</p>
        <div class="story-visual" aria-hidden="true"><div class="visual-line"></div>
          <div class="floating-ticket ticket-back"><span class="mock-icon">${icon('checkCircle')}</span><div><small>RESOLVIDO, SEM COMPLICAÇÃO</small><strong>Tudo pronto para continuar.</strong></div><span class="mock-check">${icon('check')}</span></div>
          <div class="floating-ticket ticket-front"><div class="mock-ticket-top"><span>DEM-1049</span>${statusBadge('em_atendimento')}</div><strong>Um novo pedido. Um próximo passo.</strong><p>A equipe já está cuidando disso.</p><div class="mock-ticket-bottom"><span class="avatar manager-avatar">RC</span><span>Rui está atendendo</span><span class="mock-bubbles">${icon('message')} 2</span></div></div>
          <span class="spark-decoration">${icon('spark')}</span>
        </div>
      </div>
      <div class="story-footer"><span class="mini-dot"></span> Feito para equipes que fazem acontecer.</div>
    </section>
    <section class="login-side"><div class="login-top"><span class="demo-badge"><span></span> Ambiente de demonstração</span></div>
      <div class="login-box"><span class="welcome-icon">${icon(manager ? 'users' : 'inbox')}</span><h2>Bem-vindo à Central</h2><p>Entre para ${manager ? 'organizar e atender os pedidos da equipe' : 'criar e acompanhar suas demandas'}.</p>
        <div class="role-tabs" aria-label="Área de acesso"><button class="${!manager ? 'active' : ''}" data-action="login-role" data-role="solicitante" aria-pressed="${!manager}">${icon('user')} Sou solicitante</button><button class="${manager ? 'active' : ''}" data-action="login-role" data-role="admin" aria-pressed="${manager}">${icon('users')} Sou gestor</button></div>
        <form id="login-form"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" placeholder="seu@email.com" value="${manager ? 'rui' : 'ana'}@demo.local" required maxlength="200">
          <label for="password">Senha</label><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" value="Demo123!" required maxlength="200"><button type="button" class="icon-button" data-action="toggle-password" aria-label="Mostrar senha">${icon('eye')}</button></div>
          <div class="form-error" id="login-error" role="alert"></div><button class="button primary login-submit" type="submit">Entrar como ${manager ? 'gestor' : 'solicitante'} ${icon('arrow')}</button>
        </form>
        <div class="demo-access">${icon('spark')}<div><strong>Pronto para experimentar</strong><p>Conta de ${manager ? 'Rui' : 'Ana'} preenchida para a aula.<br>Senha de demonstração: <code>Demo123!</code></p></div></div>
      </div><div class="login-bottom">Central de Demandas <span>·</span> Primeira versão, grandes possibilidades.</div>
    </section></main>`;
}

function filteredTickets(ignoreStatus = false) {
  return state.tickets.filter(ticket => (ignoreStatus || state.status === 'all' || ticket.status === state.status) && (state.priority === 'all' || ticket.priority === state.priority) && `${ticket.title} ${number(ticket)} ${ticket.requester.name}`.toLocaleLowerCase('pt-BR').includes(state.query.toLocaleLowerCase('pt-BR')))
    .sort((a, b) => ['critica', 'alta', 'normal', 'baixa'].indexOf(a.priority) - ['critica', 'alta', 'normal', 'baixa'].indexOf(b.priority) || new Date(a.createdAt) - new Date(b.createdAt));
}
function statsHTML() {
  const tickets = filteredTickets(true);
  const cards = [['all', 'Total de demandas', 'inbox', 'neutral'], ['aberta', 'Abertas', 'inbox', 'orange'], ['em_atendimento', 'Em atendimento', 'clock', 'purple'], ['concluida', 'Concluídas', 'checkCircle', 'green']];
  return cards.map(([status, title, symbol, tone]) => `<button class="stat-card ${state.status === status ? 'selected' : ''}" data-action="filter-status" data-status="${status}" aria-pressed="${state.status === status}"><div><span class="stat-label">${title}</span><strong>${String(status === 'all' ? tickets.length : tickets.filter(ticket => ticket.status === status).length).padStart(2, '0')}</strong></div><span class="stat-icon ${tone}">${icon(symbol)}</span><span class="stat-foot">${status === 'all' ? 'Tudo em um só lugar' : status === 'aberta' ? 'Aguardando o primeiro passo' : status === 'em_atendimento' ? 'A equipe está cuidando' : 'Mais uma demanda resolvida'} ${icon('arrow')}</span></button>`).join('');
}
function renderApp() {
  window.scrollTo(0, 0);
  document.title = `${admin() ? 'Fila da equipe' : 'Minhas demandas'} · Central`;
  app.innerHTML = `<div class="app-layout"><aside class="sidebar"><a class="brand" href="/app">${logo()}</a>
      <div class="workspace-card"><span class="workspace-icon">N</span><div><strong>Equipe NERD</strong><span>Workspace da equipe</span></div><span class="workspace-dot"></span></div>
      <span class="nav-caption">WORKSPACE</span><nav aria-label="Navegação principal"><button class="nav-item ${state.view === 'overview' ? 'active' : ''}" data-action="nav" data-view="overview">${icon('grid')} Visão geral</button><button class="nav-item ${state.view === 'tickets' ? 'active' : ''}" data-action="nav" data-view="tickets">${icon(admin() ? 'users' : 'inbox')} ${admin() ? 'Fila da equipe' : 'Minhas demandas'}<span class="nav-count">${state.tickets.length}</span></button>${!admin() ? `<button class="nav-item" data-action="new-ticket">${icon('plus')} Nova demanda</button>` : ''}</nav>
      <div class="sidebar-bottom"><div class="sidebar-tip"><span class="tip-icon">${icon('message')}</span><strong>Boas conversas resolvem.</strong><p>Contexto no pedido.<br>Respostas no mesmo lugar.</p><button data-action="help">Conheça o fluxo ${icon('arrow')}</button></div><button class="nav-item help-link" data-action="help">${icon('help')} Como funciona</button><div class="profile">${avatar(state.user)}<div><strong>${escape(state.user.name)}</strong><span>${admin() ? 'Gestor da equipe' : 'Solicitante'}</span></div><button class="icon-button" data-action="logout" aria-label="Sair da conta" title="Sair da conta">${icon('logout')}</button></div></div>
    </aside><div class="workspace-main"><header class="topbar"><div class="breadcrumb">Workspace ${icon('chevron')} <strong>${admin() ? 'Área do gestor' : 'Minha área'}</strong></div><div class="topbar-right"><span class="demo-badge"><span></span> Demonstração local</span><span class="topbar-divider"></span>${avatar(state.user, 'small')}</div></header>
      <main class="main-content"><section class="page-heading"><div><div class="eyebrow">${admin() ? 'ORGANIZAR. ATENDER. RESOLVER.' : 'PEDIR. ACOMPANHAR. RESOLVER.'}</div><h1>${state.view === 'overview' ? `Olá, ${escape(state.user.name.split(' ')[0])} <span class="hello-dot">✦</span>` : admin() ? 'Fila da equipe' : 'Minhas demandas'}<span class="heading-dot">.</span></h1><p>${admin() ? 'Cada pedido merece um próximo passo. Organize o atendimento por aqui.' : 'Seus pedidos, suas respostas. Acompanhe tudo em um só lugar.'}</p></div>${!admin() ? `<button class="button primary" data-action="new-ticket">${icon('plus')} Nova demanda</button>` : `<span class="team-label">${icon('users')} Uma equipe. Tudo conectado.</span>`}</section>
      <section class="stats-grid" aria-label="Resumo de demandas" id="stats">${statsHTML()}</section>
      ${state.view === 'overview' ? overviewHTML() : ''}
      <section class="tickets-panel" aria-labelledby="list-title"><div class="panel-heading"><div><h2 id="list-title">${admin() ? 'Demandas da equipe' : 'Acompanhe seus pedidos'}</h2><p>${admin() ? 'Prioridades claras para fazer a fila andar.' : 'Da abertura à resolução, sem perder o contexto.'}</p></div><span class="live-label"><span></span> Atualizado nesta sessão</span></div>
        <div class="table-tools"><div class="status-tabs" id="status-tabs" aria-label="Filtrar por situação">${tabsHTML()}</div><div class="table-filters"><label class="search-field">${icon('search')}<input id="search" type="search" placeholder="Buscar demanda…" aria-label="Buscar demanda" value="${escape(state.query)}"></label><label class="priority-filter">${icon('flag')}<select id="priority-filter" aria-label="Filtrar por prioridade"><option value="all">Todas as prioridades</option>${Object.entries(priorityInfo).map(([key]) => `<option value="${key}" ${state.priority === key ? 'selected' : ''}>${labels[key]}</option>`).join('')}</select></label></div></div>
        <div id="ticket-list">${tableHTML()}</div>
      </section><footer class="main-footer"><span>${icon('lock')} Seus pedidos, na área certa.</span><span>Central de Demandas <span class="footer-dot">·</span> MVP 01</span></footer>
    </main></div></div>`;
}
function overviewHTML() {
  const pending = state.tickets.filter(ticket => ticket.status !== 'concluida');
  const urgent = pending.filter(ticket => ['alta', 'critica'].includes(ticket.priority));
  return `<section class="overview-banner"><span class="overview-symbol">${icon('spark')}</span><div><h2>${pending.length ? 'Um próximo passo faz a diferença.' : 'Tudo em dia por aqui.'}</h2><p>${pending.length ? `${pending.length} demanda${pending.length > 1 ? 's' : ''} em aberto ou em atendimento${urgent.length ? `, sendo ${urgent.length} de prioridade alta ou crítica` : ''}.` : 'Todas as demandas foram concluídas. Novos pedidos aparecerão aqui.'}</p></div><button class="button secondary" data-action="nav" data-view="tickets">Ver demandas ${icon('arrow')}</button></section>`;
}
function tabsHTML() {
  const tickets = filteredTickets(true);
  return [['all', 'Todas'], ['aberta', 'Abertas'], ['em_atendimento', 'Em atendimento'], ['concluida', 'Concluídas']].map(([key, label]) => `<button class="status-tab ${state.status === key ? 'active' : ''}" data-action="filter-status" data-status="${key}" aria-pressed="${state.status === key}">${label}<span>${key === 'all' ? tickets.length : tickets.filter(ticket => ticket.status === key).length}</span></button>`).join('');
}
function tableHTML() {
  const tickets = filteredTickets();
  if (!tickets.length) return `<div class="empty-state"><span>${icon('inbox')}</span><h3>${state.query || state.priority !== 'all' || state.status !== 'all' ? 'Nenhuma demanda por aqui' : 'Seu primeiro pedido começa aqui'}</h3><p>${state.query || state.priority !== 'all' || state.status !== 'all' ? 'Experimente outra busca ou limpe os filtros para ver mais pedidos.' : 'Abra uma demanda e acompanhe cada etapa com a equipe.'}</p><button class="button secondary" data-action="${state.query || state.priority !== 'all' || state.status !== 'all' ? 'clear-filters' : 'new-ticket'}">${state.query || state.priority !== 'all' || state.status !== 'all' ? 'Limpar filtros' : 'Criar primeira demanda'}</button></div>`;
  return `<div class="table-scroll"><table><thead><tr><th class="ticket-column">DEMANDA</th>${admin() ? '<th>SOLICITANTE</th>' : ''}<th>SITUAÇÃO</th><th>PRIORIDADE</th><th>ABERTURA</th><th aria-label="Abrir demanda"></th></tr></thead><tbody>${tickets.map(ticket => `<tr><td><div class="ticket-cell"><span class="ticket-type ${ticket.status === 'concluida' ? 'done' : ''}">${icon(ticket.status === 'concluida' ? 'checkCircle' : 'inbox')}</span><div><span class="ticket-number">${number(ticket)}</span><button class="ticket-title" data-action="open-ticket" data-id="${ticket.id}">${escape(ticket.title)}</button></div></div></td>${admin() ? `<td class="requester-column"><div class="requester-cell">${avatar(ticket.requester, 'tiny')}<span>${escape(ticket.requester.name.split(' ')[0])}</span></div></td>` : ''}<td class="status-cell">${statusBadge(ticket.status)}</td><td class="priority-cell">${priorityBadge(ticket.priority)}</td><td class="date-cell">${date(ticket.createdAt)}</td><td><button class="icon-button row-arrow" data-action="open-ticket" data-id="${ticket.id}" aria-label="Abrir ${number(ticket)}">${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div><div class="table-footer"><span>Mostrando ${tickets.length} de ${state.tickets.length} demandas</span><span>${icon('flag')} Ordenadas por prioridade</span></div>`;
}
function refreshList() { $('#stats').innerHTML = statsHTML(); $('#status-tabs').innerHTML = tabsHTML(); $('#ticket-list').innerHTML = tableHTML(); }
function openDialog(content, cls) { dialog.className = cls; dialog.innerHTML = content; if (!dialog.open) dialog.showModal(); }
const closeButton = () => `<button type="button" class="icon-button modal-close" data-action="close-dialog" aria-label="Fechar janela">${icon('close')}</button>`;
function openNew() {
  openDialog(`<div class="modal-header"><div><span class="eyebrow">VAMOS DAR O PRIMEIRO PASSO</span><h2 id="dialog-title">Nova demanda<span class="heading-dot">.</span></h2><p>Conte o que você precisa. A equipe cuida do próximo passo.</p></div>${closeButton()}</div>
    <form id="new-ticket-form" class="new-ticket-form"><label for="title">Qual é o seu pedido? <span>*</span></label><input id="title" name="title" placeholder="Ex.: Preciso de um novo teclado e mouse" maxlength="120" required autofocus><span class="field-hint">Um título curto ajuda a equipe a entender a demanda.</span>
      <label for="description">Descreva sua necessidade <span>*</span></label><textarea id="description" name="description" rows="4" maxlength="5000" placeholder="Compartilhe os detalhes, o contexto e o que você precisa para seguir em frente…" required></textarea>
      <fieldset class="priority-fieldset"><legend>Qual é a prioridade? <span>*</span></legend><div class="priority-options">${Object.entries(priorityInfo).map(([key, info]) => `<label class="priority-option priority-${key}"><input type="radio" name="priority" value="${key}" required><span class="priority-option-top">${priorityBadge(key)}<span class="radio-circle"></span></span><small>${info}</small></label>`).join('')}</div></fieldset>
      <label for="justification">Por que essa prioridade? <span>*</span><span class="required-pill">Obrigatório em todas as prioridades</span></label><textarea id="justification" name="justification" rows="3" maxlength="2000" placeholder="Explique o impacto do pedido e por que ele precisa dessa prioridade." required aria-describedby="justification-help"></textarea><span class="field-hint" id="justification-help">A justificativa ajuda o gestor a organizar o atendimento de forma justa.</span>
      <div class="form-error" id="new-error" role="alert"></div><div class="modal-footer"><span>${icon('lock')} Visível para você e para o gestor</span><div><button type="button" class="button secondary" data-action="close-dialog">Cancelar</button><button class="button primary" type="submit">Criar demanda ${icon('arrow')}</button></div></div>
    </form>`, 'new-modal');
}
function openDetail(id, reset = false) {
  const ticket = state.tickets.find(item => item.id === id);
  if (!ticket) return toast('Demanda não encontrada.');
  state.detailId = id;
  if (reset) { state.detailTab = 'comments'; state.revising = false; }
  const closed = ticket.status === 'concluida';
  openDialog(`<div class="detail-header"><div class="detail-kicker"><span class="ticket-number">${number(ticket)}</span>${statusBadge(ticket.status)}</div>${closeButton()}<h2 id="dialog-title">${escape(ticket.title)}</h2><p>Aberta por ${escape(ticket.requester.name)} · ${dateTime(ticket.createdAt)}</p></div>
    <div class="detail-grid"><div class="detail-main"><section class="detail-section"><h3>Sobre o pedido</h3><p class="preserve-text">${escape(ticket.description)}</p><div class="justification-box"><h4>${icon('flag')} Justificativa da prioridade inicial</h4><p class="preserve-text">${escape(ticket.justification)}</p></div></section>
      <div class="detail-tabs"><button data-action="detail-tab" data-tab="comments" class="${state.detailTab === 'comments' ? 'active' : ''}">${icon('message')} Conversa <span>${ticket.comments.length}</span></button><button data-action="detail-tab" data-tab="history" class="${state.detailTab === 'history' ? 'active' : ''}">${icon('clock')} Histórico <span>${ticket.history.length}</span></button></div>
      ${state.detailTab === 'comments' ? `<div class="comments-list">${ticket.comments.length ? ticket.comments.map(comment => `<article class="comment">${avatar(comment.author, 'small')}<div class="comment-content"><div class="comment-meta"><strong>${escape(comment.author.name)}</strong>${comment.author.role === 'admin' ? '<span class="manager-tag">Gestor</span>' : ''}<time>${dateTime(comment.createdAt)}</time></div><p class="preserve-text">${escape(comment.text)}</p></div></article>`).join('') : `<div class="conversation-empty">${icon('message')}<strong>A conversa começa aqui</strong><p>Use este espaço para complementar o pedido e acompanhar as respostas.</p></div>`}</div>${!closed ? `<form id="comment-form"><label class="sr-only" for="comment-text">Escreva um comentário</label><textarea name="text" id="comment-text" rows="3" maxlength="5000" placeholder="${admin() ? 'Dê um retorno ao solicitante…' : 'Complemente seu pedido ou tire uma dúvida…'}" required></textarea><div class="comment-form-bottom"><span>Todos os envolvidos podem ler.</span><button class="button primary small-button" type="submit">${icon('send')} Enviar resposta</button></div><div class="form-error" id="comment-error" role="alert"></div></form>` : `<div class="closed-notice">${icon('lock')} Demanda concluída. A conversa fica disponível para consulta.</div>`}` : `<div class="history-list">${ticket.history.slice().reverse().map(event => `<article class="history-item"><span class="history-symbol">${icon(event.type === 'priority' ? 'flag' : event.to === 'concluida' ? 'check' : 'clock')}</span><div><strong>${escape(event.text)}</strong><p>${escape(event.actor.name)} · ${dateTime(event.at)}</p>${event.reason ? `<div class="history-reason">${escape(event.reason)}</div>` : ''}</div></article>`).join('')}</div>`}
    </div><aside class="detail-aside"><h3>Detalhes da demanda</h3><dl><dt>Situação</dt><dd>${statusBadge(ticket.status)}</dd><dt>Prioridade atual</dt><dd>${priorityBadge(ticket.priority)}${admin() && !closed ? `<button class="text-button" data-action="revise">${icon('edit')} Revisar</button>` : ''}</dd><dt>Solicitante</dt><dd class="aside-user">${avatar(ticket.requester, 'small')}<span>${escape(ticket.requester.name)}</span></dd><dt>Aberta em</dt><dd>${dateTime(ticket.createdAt)}</dd>${closed ? `<dt>Concluída em</dt><dd>${dateTime(ticket.completedAt)}</dd>` : ''}</dl>
      ${state.revising && !closed && admin() ? `<form id="priority-form" class="revision-form"><label for="new-priority">Nova prioridade</label><select name="priority" id="new-priority">${Object.keys(priorityInfo).map(key => `<option value="${key}" ${key === ticket.priority ? 'selected' : ''}>${labels[key]}</option>`).join('')}</select><label for="reason">Motivo da revisão *</label><textarea name="reason" id="reason" rows="3" maxlength="2000" required placeholder="Explique a mudança de prioridade"></textarea><div class="form-error" id="priority-error" role="alert"></div><button type="submit" class="button secondary full-width">Salvar prioridade</button></form>` : ''}
      ${admin() && !closed ? `<div class="manager-actions"><span class="eyebrow">PRÓXIMO PASSO</span><button class="button primary full-width" data-action="advance" data-status="${ticket.status === 'aberta' ? 'em_atendimento' : 'concluida'}">${icon(ticket.status === 'aberta' ? 'clock' : 'checkCircle')} ${ticket.status === 'aberta' ? 'Iniciar atendimento' : 'Concluir demanda'}</button><p>${ticket.status === 'aberta' ? 'Avise que a equipe já está cuidando deste pedido.' : 'Deixe uma resposta antes de concluir. Depois, a demanda ficará só para leitura.'}</p><div class="form-error" id="detail-error" role="alert"></div></div>` : `<div class="aside-note">${icon(closed ? 'checkCircle' : 'message')}<p>${closed ? 'Mais um pedido resolvido. O histórico continua por aqui.' : 'Você será atualizado por aqui. Toda a conversa fica neste pedido.'}</p></div>`}
    </aside></div>`, 'detail-modal');
}
function help() {
  openDialog(`<div class="modal-header"><div><span class="eyebrow">SIMPLES, DO INÍCIO AO FIM</span><h2 id="dialog-title">Um pedido. Três passos.</h2></div>${closeButton()}</div><div class="help-content">${[['01', 'Você pede', 'Descreva a demanda, escolha a prioridade e explique o motivo. Ao criar, você recebe um número para acompanhar.'], ['02', 'A equipe atende', 'O gestor organiza a fila, conversa com você e atualiza a situação. A revisão de prioridade sempre tem uma justificativa.'], ['03', 'Todos acompanham', 'Pedido, respostas e histórico ficam juntos. Depois da conclusão, tudo continua disponível para consulta.']].map(([num, title, copy]) => `<div class="help-step"><span>${num}</span><div><h3>${title}</h3><p>${copy}</p></div></div>`).join('')}<div class="help-demo"><strong>Sobre esta demonstração</strong><p>Os pedidos são salvos neste computador. Para experimentar o outro perfil, saia da conta e escolha a outra área de acesso. Ana é solicitante e Rui é gestor.</p></div><button class="button primary full-width" data-action="close-dialog">Entendi, vamos lá ${icon('arrow')}</button></div>`, 'help-modal');
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  try {
    if (action === 'login-role') { state.loginRole = button.dataset.role; route(state.loginRole === 'admin' ? '/admin/login' : '/login'); renderLogin(); }
    if (action === 'toggle-password') { const input = $('#password'); input.type = input.type === 'password' ? 'text' : 'password'; button.setAttribute('aria-label', input.type === 'password' ? 'Mostrar senha' : 'Ocultar senha'); }
    if (action === 'logout') { button.disabled = true; await post('/logout', {}); state.user = null; state.tickets = []; state.status = 'all'; state.priority = 'all'; state.query = ''; state.view = 'tickets'; route(state.loginRole === 'admin' ? '/admin/login' : '/login'); renderLogin(); }
    if (action === 'nav') { state.view = button.dataset.view; state.status = 'all'; state.priority = 'all'; state.query = ''; await reload(); renderApp(); }
    if (action === 'filter-status') { state.status = button.dataset.status; refreshList(); }
    if (action === 'clear-filters') { state.query = ''; state.priority = 'all'; state.status = 'all'; renderApp(); }
    if (action === 'new-ticket') openNew();
    if (action === 'close-dialog') dialog.close();
    if (action === 'open-ticket') { await reload(); openDetail(button.dataset.id, true); }
    if (action === 'detail-tab') { state.detailTab = button.dataset.tab; openDetail(state.detailId); }
    if (action === 'revise') { state.revising = !state.revising; openDetail(state.detailId); }
    if (action === 'help') help();
    if (action === 'advance') {
      button.disabled = true;
      try { await post(`/tickets/${state.detailId}/status`, { status: button.dataset.status }); await reload(); renderApp(); openDetail(state.detailId); toast(button.dataset.status === 'concluida' ? 'Demanda concluída. Mais um pedido resolvido!' : 'Atendimento iniciado.'); }
      catch (error) { if ($('#detail-error')) $('#detail-error').textContent = error.message; else toast(error.message); }
      finally { button.disabled = false; }
    }
  } catch (error) { toast(error.message); button.disabled = false; }
});

document.addEventListener('invalid', event => {
  const input = event.target;
  if (input.validity.valueMissing) input.setCustomValidity(input.type === 'radio' ? 'Selecione uma prioridade.' : 'Preencha este campo obrigatório.');
  else if (input.validity.typeMismatch) input.setCustomValidity('Informe um e-mail válido.');
}, true);
document.addEventListener('input', event => {
  event.target.setCustomValidity?.('');
  if (event.target.id === 'search') { state.query = event.target.value; refreshList(); }
});
document.addEventListener('change', event => {
  event.target.setCustomValidity?.('');
  if (event.target.name === 'priority') document.querySelectorAll('input[name="priority"]').forEach(input => input.setCustomValidity(''));
  if (event.target.id === 'priority-filter') { state.priority = event.target.value; refreshList(); }
});
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!['login-form', 'new-ticket-form', 'comment-form', 'priority-form'].includes(form.id)) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const errorElement = form.querySelector('.form-error');
  errorElement.textContent = '';
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  submit.setAttribute('aria-busy', 'true');
  try {
    if (form.id === 'login-form') {
      state.user = (await post('/login', { ...data, role: state.loginRole })).user;
      await reload(); route('/app'); renderApp();
    }
    if (form.id === 'new-ticket-form') {
      const { ticket } = await post('/tickets', data);
      await reload(); state.status = 'all'; state.priority = 'all'; state.query = ''; renderApp(); openDetail(ticket.id, true); toast(`${number(ticket)} criada! Seu pedido já está na fila.`);
    }
    if (form.id === 'comment-form') { await post(`/tickets/${state.detailId}/comments`, data); await reload(); renderApp(); openDetail(state.detailId); toast('Resposta enviada.'); }
    if (form.id === 'priority-form') { await post(`/tickets/${state.detailId}/priority`, data); await reload(); state.revising = false; renderApp(); openDetail(state.detailId); toast('Prioridade atualizada. O motivo ficou registrado no histórico.'); }
  } catch (error) { if (document.contains(errorElement)) { errorElement.textContent = error.message; } else toast(error.message); }
  finally { submit.disabled = false; submit.removeAttribute('aria-busy'); }
});
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
window.addEventListener('focus', async () => {
  if (!state.user || dialog.open) return;
  try {
    const { user } = await api('/me');
    const changed = state.user.id !== user.id;
    state.user = user;
    state.loginRole = user.role;
    await reload();
    if (changed) { state.status = 'all'; state.priority = 'all'; state.query = ''; renderApp(); }
    else if ($('#ticket-list')) refreshList();
  } catch (error) { toast(error.message); }
});

try { state.user = (await api('/me')).user; state.loginRole = state.user.role; await reload(); route('/app'); renderApp(); }
catch (error) { renderLogin(); if (!error.message.includes('sessão terminou')) toast(error.message); }
