import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';

export const priorities = ['baixa', 'normal', 'alta', 'critica'];
export const statuses = ['aberta', 'em_atendimento', 'concluida'];
export const labels = { baixa: 'Baixa', normal: 'Normal', alta: 'Alta', critica: 'Crítica', aberta: 'Aberta', em_atendimento: 'Em atendimento', concluida: 'Concluída' };
export const publicUser = ({ id, name, email, role }) => ({ id, name, email, role });

export function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function passwordMatches(password, hash) {
  const [salt, value] = hash.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(value, 'hex'));
}

function seed() {
  const users = [
    { id: 'ana', name: 'Ana Silva', email: 'ana@demo.local', role: 'solicitante' },
    { id: 'rui', name: 'Rui Costa', email: 'rui@demo.local', role: 'admin' },
    { id: 'bruno', name: 'Bruno Lima', email: 'bruno@demo.local', role: 'solicitante' },
  ].map(user => ({ ...user, passwordHash: passwordHash('Demo123!') }));
  const rows = [
    ['Acesso à pasta compartilhada do projeto', 'Preciso acessar a pasta do projeto para consultar os materiais e atualizar os arquivos da equipe.', 'alta', 'Sem esse acesso, não consigo finalizar a apresentação desta semana.', 'aberta', 'ana'],
    ['Substituição de teclado e mouse', 'O teclado está com algumas teclas falhando e o mouse perde a conexão. Preciso da substituição dos dois equipamentos.', 'normal', 'Consigo trabalhar temporariamente com equipamentos emprestados.', 'em_atendimento', 'ana'],
    ['Internet instável na sala de reuniões', 'A conexão cai durante as chamadas de vídeo na sala de reuniões do segundo andar.', 'critica', 'Temos uma apresentação para o cliente hoje e a falha afeta toda a equipe.', 'em_atendimento', 'ana'],
    ['Novo monitor para a estação de trabalho', 'Gostaria de um segundo monitor para trabalhar com as planilhas e os relatórios lado a lado.', 'baixa', 'É uma melhoria de produtividade, sem impedimento para o trabalho atual.', 'aberta', 'ana'],
    ['Atualização da licença de design', 'A licença da ferramenta de design precisa ser renovada para continuar os trabalhos do projeto.', 'alta', 'A licença expira nesta semana e temos entregas em andamento.', 'concluida', 'ana'],
    ['Configuração de assinatura de e-mail', 'Preciso atualizar minha assinatura com a identidade visual da equipe e os novos dados de contato.', 'baixa', 'A assinatura atual funciona; a atualização pode ser feita quando houver disponibilidade.', 'concluida', 'ana'],
    ['Acesso ao painel de indicadores', 'Preciso de acesso de leitura ao painel de indicadores da equipe.', 'normal', 'O acesso será usado na reunião de acompanhamento da próxima semana.', 'aberta', 'bruno'],
    ['Projetor da sala sem imagem', 'O projetor liga, mas não exibe a imagem do computador por HDMI.', 'alta', 'A sala está reservada para um treinamento amanhã de manhã.', 'aberta', 'bruno'],
  ];
  const now = Date.now();
  const tickets = rows.map(([title, description, priority, justification, status, requesterId], index) => {
    const createdAt = new Date(now - (index + 1) * 86400000).toISOString();
    const updatedAt = new Date(now - index * 3600000).toISOString();
    const history = [{ id: randomUUID(), actorId: requesterId, type: 'created', at: createdAt, text: 'Demanda aberta', to: 'aberta' }];
    const comments = [];
    if (status !== 'aberta') {
      history.push({ id: randomUUID(), actorId: 'rui', type: 'status', from: 'aberta', to: 'em_atendimento', at: updatedAt, text: 'Iniciou o atendimento' });
      comments.push({ id: randomUUID(), authorId: 'rui', text: status === 'concluida' ? 'Solicitação atendida! A alteração já está disponível. Obrigado por registrar seu pedido aqui na central.' : 'Recebemos sua solicitação e já estamos cuidando disso. Vou atualizar você por aqui assim que tiver novidades.', createdAt: updatedAt });
    }
    if (status === 'concluida') history.push({ id: randomUUID(), actorId: 'rui', type: 'status', from: 'em_atendimento', to: 'concluida', at: updatedAt, text: 'Concluiu a demanda' });
    return { id: randomUUID(), number: 1048 - index, requesterId, title, description, priority, justification, status, createdAt, updatedAt: status === 'aberta' ? createdAt : updatedAt, completedAt: status === 'concluida' ? updatedAt : null, comments, history };
  });
  return { version: 1, nextNumber: 1049, users, tickets };
}

// Operações síncronas em um único processo: cada escrita e seu histórico são
// aplicados juntos. O rename atômico evita deixar um JSON parcialmente gravado.
export function createStore(file) {
  mkdirSync(dirname(file), { recursive: true });
  let data = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : seed();
  function persist(next) {
    writeFileSync(`${file}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
    renameSync(`${file}.tmp`, file);
    data = next;
  }
  if (!existsSync(file)) persist(data);
  return {
    read: () => structuredClone(data),
    change: mutation => {
      const next = structuredClone(data);
      const result = mutation(next);
      persist(next);
      return result;
    },
  };
}
