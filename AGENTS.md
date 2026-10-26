# Central de Demandas — instruções para agentes

## Contexto e fonte de requisitos

- Este projeto é a primeira versão de uma Central de Demandas para uma única equipe.
- Leia `PRD.md` antes de implementar ou alterar o produto. Ele reúne os requisitos do canvas e identifica propostas ainda não validadas.
- Existem dois perfis de acesso: administrador (o gestor do canvas) e solicitante. São perfis, não um limite de duas contas.
- O Supabase será usado para autenticação e banco de dados. O projeto e as credenciais serão informados por João.
- João autorizou o protótipo funcional local e o envio do código ao repositório `charles-0102/mvp-aula-03`. A aplicação usa Node.js e arquivos estáticos, sem dependências.
- Até receber as credenciais Supabase e implementar a integração, preservar o modo demonstrativo com autenticação e autorização no servidor e dados em `data/store.json`. Não apresentar esse modo como Supabase conectado ou ambiente de produção.
- Justificativa é obrigatória em todas as prioridades, conforme o pedido atualizado.
- Leia `README.md` para executar e demonstrar. `npm test` cobre regras e permissões; `npm run check` verifica sintaxe.

## Preferência de navegador

- Ao abrir sites para João, use sempre o navegador integrado ao chat (in-app browser / `iab`) e mantenha a aba visível para ele acompanhar ou configurar.
- Isso inclui o Supabase e os fluxos de autenticação da CLI. Use opções como `--no-browser` para evitar que comandos abram o navegador externo e abra o link no navegador integrado.
- Só use um navegador externo se João pedir explicitamente ou após explicar uma limitação do navegador integrado.

## Forma de trabalhar

- Comunique-se e escreva textos da interface e documentação em português do Brasil.
- Inspecione os arquivos existentes antes de editar; preserve o trabalho de João.
- Mantenha o escopo do MVP. Não adicione funcionalidades, dependências ou serviços sem necessidade para o pedido em andamento.
- Não trate propostas do PRD como decisões já aprovadas. Registre as decisões tomadas durante a implementação.
- Não invente credenciais, identificadores de projeto, dados de produção, resultados de testes ou integrações concluídas.
- Ao entregar uma alteração, informe o que mudou, como foi verificado e as pendências relevantes.

## Autenticação e autorização

- Ofereça entradas de login distintas para gestor (administrador) e solicitante. No protótipo ambas usam o mesmo servidor local; na versão conectada usarão o Supabase Auth.
- O perfil deve vir de um registro confiável no servidor ou no banco. A URL, o estado do navegador e dados editáveis pelo usuário não concedem privilégios.
- Dados de execução em `data/`, `.env`, capturas em `.local/` e outros segredos não devem ir para o GitHub.
- Solicitantes acessam somente as próprias demandas e seus comentários e históricos. Administradores acessam as demandas da equipe.
- No protótipo, aplique as permissões no servidor. Na integração Supabase, aplique-as também no banco com Row Level Security (RLS) e validações das operações. Ocultar botões não é autorização.
- Não permitir que uma pessoa escolha ou promova o próprio perfil para administrador. As contas do piloto serão previamente preparadas por um fluxo confiável.
- Demandas concluídas ficam somente para leitura para ambos os perfis, inclusive por acesso direto à API.
- Preserve autoria, datas e histórico das mudanças. Não implemente exclusão de demandas ou alteração do histórico no MVP.

## Credenciais e configuração

- Use `.env` para a configuração local. Os campos iniciais ficam vazios até João fornecer os valores do projeto.
- Não copie credenciais para o PRD, código, logs, capturas, mensagens de entrega ou testes.
- Nunca exponha senhas de banco, chaves secretas ou `service_role` no frontend. A aplicação no navegador deve usar apenas a chave pública apropriada, com autorização aplicada no banco.
- Os nomes das variáveis no `.env` são neutros até a escolha do framework. Adapte os nomes públicos apenas quando necessário e mantenha documentação e código consistentes.
- Antes de versionar, enviar ou publicar o projeto, configure a exclusão de `.env` e de arquivos locais de segredos no `.gitignore` e confira se nenhum está rastreado. Uma futura `.env.example` deve conter apenas campos vazios ou exemplos fictícios.
- Este preparo inicial não exige chave administrativa, senha do banco nem token da CLI.

## Implementação e verificação futuras

- Quando a implementação for solicitada, siga as etapas e os critérios de aceite do `PRD.md`.
- Priorize uma interface responsiva, rótulos claros, navegação por teclado e estados de carregamento, vazio, erro e sucesso.
- Versione mudanças de banco por migrações; não dependa de configurações manuais não documentadas.
- Valide as regras de negócio no servidor/banco, além das orientações no formulário.
- Gere número da demanda, autoria e datas em uma operação confiável; não confie em identificadores ou perfis enviados pelo cliente.
- Verifique com duas contas solicitantes e uma administradora o isolamento entre usuários, os privilégios e o bloqueio após conclusão.
- Execute verificações proporcionais à alteração e descreva somente os testes realmente executados.
