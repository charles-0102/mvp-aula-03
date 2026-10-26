# PRD inicial — Central de Demandas

Versão: 0.2 · Data: 26/10/2026 · Estado: protótipo local implementado; integração Supabase pendente.

**Atualização de escopo:** João solicitou um protótipo funcional para demonstração local e autorizou o envio ao repositório `charles-0102/mvp-aula-03`. A justificativa é obrigatória em **todas** as prioridades. Como as credenciais Supabase ainda não foram fornecidas, esta versão usa autenticação demonstrativa no servidor Node.js e persistência em arquivo JSON local. As regras de autorização são verificadas no servidor. Supabase Auth e RLS continuam sendo requisitos da futura versão conectada.

As propostas de fluxo abaixo foram adotadas como decisões de implementação do protótipo, podendo ser ajustadas após a demonstração. Hospedagem pública da aplicação não faz parte desta entrega.

Base: canvas “MVP Canvas — Central de Demandas” enviado por João e pedido de duas áreas de login, uma para administrador e outra para solicitante. O canvas orienta o produto; não representa telas já construídas ou serviços já configurados.

## 1. Visão e objetivo

Criar uma aplicação web para registrar, atender e acompanhar demandas de uma única equipe, reunindo pedido, situação e conversa no mesmo lugar.

Hipótese: quando solicitantes conseguem consultar a situação e as respostas por conta própria, diminuem as cobranças em outros canais e o administrador consegue organizar melhor o atendimento.

Resultados esperados:

- Autonomia para acompanhar uma demanda sem pedir atualizações por outro canal.
- Uma fila que ajude o administrador a identificar prioridades e organizar o trabalho.
- Histórico consultável de quem solicitou, quando solicitou, quem atendeu e quando concluiu.

## 2. Público e plataforma

| Perfil | Referência no canvas | Necessidade | Acesso |
| --- | --- | --- | --- |
| Solicitante | Ana, que pede teclado e mouse | Registrar o pedido, confirmar que foi recebido e acompanhar o atendimento | Somente suas próprias demandas |
| Administrador | Rui, gestor da equipe | Organizar pedidos, revisar prioridades e dar retorno | Todas as demandas da equipe |

São dois tipos de usuário, com possibilidade de várias contas. O MVP atende uma equipe e funciona no navegador do computador e do celular. Login é obrigatório; as contas serão preparadas previamente.

## 3. Escopo e decisões

### Requisitos confirmados

- Duas entradas de login: administrador e solicitante.
- Supabase como serviço de autenticação e banco; credenciais e identificação do projeto ainda pendentes.
- Abertura com título, descrição e prioridade; qualquer prioridade exige justificativa.
- Número gerado ao salvar e situação inicial “Aberta”.
- Fila administrativa com filtros e contagens.
- Administrador atualiza situação e revisa prioridade, registrando motivo da revisão.
- Detalhe da demanda com pedido, prioridade, comentários, autores e datas.
- Solicitante pode comentar até a conclusão. Após a conclusão, a demanda fica somente para leitura.
- Permissões aplicadas também no banco.

### Propostas para orientar a implementação

Estas escolhas detalham pontos que o canvas não fecha. Foram adotadas no protótipo para permitir a demonstração solicitada; a turma pode validar o fluxo e solicitar ajustes.

| Tema | Proposta inicial |
| --- | --- |
| Credencial de login | E-mail e senha; autenticação demonstrativa no servidor local nesta versão, Supabase na futura integração |
| Rotas de entrada | `/login` para solicitantes e `/admin/login` para administradores |
| Situações | Aberta → Em atendimento → Concluída |
| Transições | Somente as etapas seguintes desse fluxo; sem reabertura ou retrocesso no MVP |
| Prioridades | Baixa, Normal, Alta e Crítica; seleção explícita no formulário, com justificativa obrigatória em todas |
| Ordenação da fila | Prioridade da maior para a menor; entre iguais, mais antigas primeiro |
| Filtros | Situação e prioridade; combinação dos dois filtros |
| Contagens | Totais por situação, considerando o filtro de prioridade e sem serem reduzidos pelo filtro de situação |
| Dados do pedido | Título e descrição permanecem inalterados após a criação; complementos são feitos por comentários |
| Comentários | Visíveis aos dois perfis autorizados, sem edição, exclusão ou notas internas |
| Conclusão | Exigir pelo menos uma resposta do administrador antes de concluir, para que o solicitante encontre um retorno |

### Fora do MVP

Anexos, notificações por e-mail, SLA, múltiplas equipes, inteligência artificial, cadastro público, seleção de perfil pelo próprio usuário, reabertura, exclusão de demandas e aplicativo móvel nativo. Painéis analíticos e formulários de pesquisa dentro do sistema também não são necessários para validar o piloto.

## 4. Jornadas principais

### Solicitante abre uma demanda

1. Acessa a entrada de solicitante e faz login.
2. Abre “Nova demanda” e informa título, descrição e prioridade.
3. Informa a justificativa obrigatória, independentemente da prioridade escolhida.
4. Salva e recebe confirmação com um número único e situação Aberta.
5. Encontra o pedido na lista “Minhas demandas”.

Se o salvamento falhar, o sistema informa o erro, preserva os dados preenchidos e não apresenta um número como se o pedido tivesse sido criado.

### Administrador atende

1. Acessa a entrada de administrador e faz login.
2. Consulta a fila da equipe, as contagens e os filtros.
3. Abre uma demanda e consulta o pedido, a justificativa e o histórico.
4. Revisa a prioridade quando necessário, informando o motivo.
5. Comenta e avança a situação durante o atendimento.
6. Conclui a demanda; o sistema registra autor e data da conclusão.

### Solicitante acompanha

1. Acessa “Minhas demandas” e abre um pedido próprio.
2. Consulta situação, prioridade atual, respostas e histórico.
3. Comenta enquanto a demanda estiver aberta ou em atendimento.
4. Após a conclusão, pode consultar todo o conteúdo, sem alterá-lo.

## 5. Telas e requisitos funcionais

| ID | Área | Comportamento esperado |
| --- | --- | --- |
| RF01 | Login do solicitante | Entrada identificada para solicitantes; campos de e-mail e senha, validação e feedback de autenticação |
| RF02 | Login do administrador | Entrada identificada para administradores; acesso administrativo depende do perfil verificado |
| RF03 | Sessão e acesso | Proteger telas e dados; permitir sair; tratar sessão expirada; direcionar contas autenticadas à área compatível com seu perfil |
| RF04 | Minhas demandas | Listar somente pedidos do usuário autenticado, com número, título, situação, prioridade e data de abertura |
| RF05 | Nova demanda | Exigir título e descrição não vazios, prioridade válida e justificativa para qualquer nível de prioridade; impedir cliques repetidos durante o envio |
| RF06 | Criação | Gerar número único no banco, registrar autor e data e iniciar em Aberta; confirmar somente após persistência |
| RF07 | Fila administrativa | Exibir as demandas da equipe com solicitante, número, título, situação, prioridade e data, além de filtros e contagens |
| RF08 | Detalhe | Reunir pedido, justificativa, situação, prioridade, autor, datas, comentários e histórico de alterações |
| RF09 | Conversa | Permitir comentários não vazios de usuários autorizados, com autor e data definidos pelo servidor |
| RF10 | Prioridade | Permitir ao administrador alterar a prioridade com motivo obrigatório e registrar valor anterior e novo |
| RF11 | Situação | Permitir ao administrador executar as transições aceitas e registrar autor, data e valores anterior e novo |
| RF12 | Conclusão | Registrar data de conclusão e bloquear qualquer alteração e novo comentário para ambos os perfis |

Os dois logins usam a mesma base de autenticação local de demonstração nesta versão. A página escolhida não altera o perfil da conta. Uma conta solicitante nunca recebe acesso administrativo por entrar pela outra URL.

## 6. Regras de negócio e permissões

| Operação | Solicitante | Administrador |
| --- | --- | --- |
| Consultar demandas, comentários e histórico | Apenas das próprias demandas | De todas as demandas da equipe |
| Criar demanda | Sim, em seu próprio nome | Não previsto no MVP |
| Comentar antes da conclusão | Apenas nas próprias demandas | Em todas as demandas da equipe |
| Alterar prioridade com motivo | Não | Sim, antes da conclusão |
| Atualizar situação | Não | Sim, antes da conclusão |
| Alterar uma demanda concluída | Não | Não |
| Excluir demanda ou alterar histórico | Não | Não |
| Alterar o próprio perfil de acesso | Não | Não pela aplicação do MVP |

- Usuários sem autenticação não acessam dados das demandas.
- Contas sem perfil válido não recebem acesso; ausência de perfil nunca implica privilégio administrativo.
- O motivo da prioridade escolhida na abertura e os motivos das revisões posteriores devem permanecer consultáveis.
- O número da demanda é gerado de forma confiável e não pode se repetir, inclusive em criações simultâneas.
- Datas, autoria, propriedade e histórico não podem ser forjados pelo cliente.
- Mudanças de situação e prioridade devem salvar a alteração e seu histórico na mesma transação.
- A conclusão e a inserção de comentários devem respeitar o bloqueio mesmo em operações concorrentes: depois de concluída, nenhuma escrita pode ser aceita.
- Comentários e históricos herdam a mesma restrição de leitura da demanda correspondente.

## 7. Estrutura de dados proposta

Modelo conceitual para orientar as futuras migrações Supabase. No protótipo, perfis, demandas, comentários e eventos são persistidos em `data/store.json`; não há tabelas remotas.

| Entidade | Dados principais | Observações |
| --- | --- | --- |
| Usuário autenticado | Identificador, e-mail e credencial | Gerenciado pelo Supabase Auth; não duplicar senhas em tabelas da aplicação |
| Perfil | ID vinculado ao Auth, nome, perfil (`admin` ou `solicitante`), data de criação | Perfil atribuído por operação confiável; sem promoção pelo próprio usuário |
| Demanda | ID, número único, solicitante, título, descrição, prioridade atual, justificativa inicial da prioridade, situação, datas de criação, atualização e conclusão | Valores controlados para prioridade e situação; data de conclusão somente quando concluída |
| Comentário | ID, demanda, autor, texto e data de criação | Sem edição ou exclusão na aplicação |
| Evento de histórico | ID, demanda, ator, tipo de evento, valor anterior, valor novo, motivo e data | Registrar criação, revisão de prioridade e mudança de situação; histórico imutável pela aplicação |

A primeira versão tem uma única equipe. O modelo não precisa incluir gestão de organizações ou múltiplas equipes.

## 8. Requisitos técnicos e de experiência

- **Supabase:** autenticação e persistência. O projeto ainda precisa ser identificado e configurado.
- **Proteção no banco:** RLS para leitura e acesso por perfil; validações, funções e/ou gatilhos para regras como transições, histórico e bloqueio após conclusão.
- **Configuração:** `.env` inicialmente com `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` vazios. São nomes neutros; o framework escolhido definirá a eventual nomenclatura pública. Se o projeto fornecer uma chave pública legada `anon`, ajustar a configuração quando ela for recebida.
- **Segredos:** o frontend nunca recebe `service_role`, chave secreta, senha do banco ou token de gerenciamento. Não é necessário solicitar esses valores neste preparo inicial.
- **Versionamento:** antes do primeiro commit, excluir `.env` do controle de versão e verificar que ele não está rastreado.
- **Interface:** português do Brasil, uso em computador e celular, formulários com rótulos, acesso por teclado e situação identificada por texto, sem depender apenas de cor.
- **Feedback:** prever carregamento, listas vazias, erro, falta de permissão, sessão expirada e confirmação de ações.
- **Datas:** armazenar instantes com fuso e exibir em formato legível; proposta inicial de exibição em `America/Recife`.
- **Conteúdo:** renderizar títulos, descrições e comentários como texto seguro, sem executar conteúdo fornecido por usuários.
- **Arquitetura do protótipo:** frontend em HTML, CSS e JavaScript modular; servidor HTTP Node.js 20+; persistência JSON com escrita atômica em um único processo; testes de integração com `node:test`. Sem dependências de terceiros. Hospedagem e integração Supabase continuam pendentes.

## 9. Critérios de aceite do MVP

1. Uma conta solicitante entra pela sua área, e uma administradora entra pela área administrativa, com sessão e saída funcionando.
2. Um visitante sem autenticação não consulta demandas por tela, URL direta ou API.
3. Solicitante A não acessa nem comenta a demanda de solicitante B, mesmo alterando IDs ou fazendo chamadas diretas ao banco.
4. Uma conta solicitante não consegue se promover, revisar prioridade, alterar situação ou acessar dados administrativos.
5. Ao criar uma demanda válida, o sistema grava o pedido em Aberta e apresenta um número único que continua disponível após recarregar a página.
6. Qualquer demanda sem justificativa é rejeitada pelo formulário e pelo servidor local; na integração Supabase, a regra também será aplicada no banco.
7. O administrador consulta todas as demandas da equipe, e filtros e contagens apresentam resultados coerentes com os dados cadastrados.
8. A revisão de prioridade sem motivo é rejeitada; com motivo, a mudança e o histórico são gravados juntos, com autor e data.
9. Comentários autorizados aparecem para os dois perfis com autor e data, permanecendo após recarregar.
10. Cada mudança de situação registra histórico; a conclusão registra a data correspondente.
11. Após concluir, nenhum perfil consegue alterar a demanda ou incluir comentários, inclusive por API ou por uma tela que estava aberta antes da conclusão.
12. Os fluxos principais podem ser concluídos em computador e celular, com feedback claro de erros e operações bem-sucedidas.

As decisões da seção 3, incluindo o fluxo de situações e a exigência de resposta antes da conclusão, são cobertas pelos testes do protótipo. Os testes de autorização usarão pelo menos duas contas solicitantes e uma administradora.

## 10. Métricas e validação do piloto

| Métrica | Como medir | Resultado esperado |
| --- | --- | --- |
| Acompanhamento sem ajuda | Observar a tarefa de encontrar situação e resposta; dividir participantes que conseguem sem ajuda pelo total observado | Maior autonomia; meta numérica a combinar antes do piloto |
| Satisfação | Coletar notas de 1 a 5 antes e depois do piloto e entrevistar solicitantes e administrador | Melhora em relação ao método anterior |
| Cobranças fora da central | Contar mensagens sobre andamento por demanda no método anterior e durante o piloto, usando períodos comparáveis | Redução de cobranças externas |

A coleta pode ser manual, sem criar um módulo de métricas no MVP. Registrar a referência inicial, o tamanho da amostra e as metas antes do piloto. Se a clareza não melhorar, revisar o fluxo antes de ampliar o produto.

## 11. Plano de execução

| Etapa | Entrega | Condição de conclusão |
| --- | --- | --- |
| 0. Preparação atual | `AGENTS.md`, este PRD e `.env` vazio | Três arquivos criados; credenciais pendentes explicitadas |
| 1. Fundação e login | Escolha de stack, configuração do Supabase, perfis, contas preparadas e duas entradas de login | Sessão, redirecionamento e autorização por perfil verificados |
| 2. Solicitação | Modelo de demandas, abertura e lista própria | Número único, situação inicial e isolamento entre solicitantes verificados |
| 3. Atendimento | Fila, filtros, contagens, prioridade, situação, conversa e histórico | Jornada completa do administrador e acompanhamento pelo solicitante funcionando |
| 4. Validação | Testes das regras, autorização, concorrência na conclusão e uso em celular | Critérios de aceite atendidos antes do piloto |
| 5. Piloto | Uso por uma equipe e coleta das métricas | Comparação com a referência inicial e decisão sobre ajustes |

O canvas propõe uma aula de 3 horas com base pronta e um piloto de 2 semanas após os testes. São referências de planejamento, sem promessa de concluir toda a implementação em 3 horas. Custos de trabalho, ferramentas de IA, Supabase e hospedagem serão estimados após a escolha da stack e a conferência dos planos e limites aplicáveis.

## 12. Pendências para as próximas etapas

- Receber a URL e a chave pública do projeto Supabase e preencher `.env`.
- Confirmar stack do frontend e hospedagem.
- Validar as propostas de login, prioridades, situações, fila e conclusão da seção 3.
- Definir as contas do piloto e o procedimento confiável de provisionamento, entrega de acesso e recuperação de senha.
- Combinar metas de sucesso, participantes, responsáveis pela coleta, custos e datas do piloto.

## 13. Entrega do protótipo local

- Implementados: dois logins, sessões, perfis fixos, abertura com justificativa em todas as prioridades, números únicos, listagem, busca, filtros, contagens, conversa, revisão de prioridade com motivo, transições, conclusão e histórico.
- Dados fictícios iniciais: Ana e Bruno como solicitantes, Rui como gestor. Há dois perfis, não apenas duas contas. A segunda conta solicitante permite demonstrar isolamento.
- Persistência local em arquivo ignorado pelo Git. Reiniciar preserva os pedidos e exige novo login. Atualizar a página preserva a sessão enquanto o servidor estiver ativo.
- Contagens consideram prioridade e busca, mas não o filtro de situação. A lista usa todos os filtros e ordena por prioridade e antiguidade.
- O servidor escuta somente em `127.0.0.1`, com validações de origem, sessão em cookie HttpOnly e permissões por operação.
- Para uma turma no mesmo computador, sair da conta e entrar com o outro perfil permite demonstrar a jornada completa.
- As contas e senhas são exemplos públicos; não usar dados reais nem expor este servidor como aplicação de produção.
- Supabase ainda não conectado. Informar URL/chave no `.env` não ativa a integração automaticamente: será necessário implementar Auth, migrações, RLS e persistência remota.
- Execução e roteiro da demonstração estão em `README.md`.
