# Central de Demandas

Um lugar para pedir, acompanhar e resolver. Protótipo funcional para demonstrar a jornada de uma equipe com **solicitante** e **gestor**.

## Rodar localmente

Requisito: **Node.js 20 ou superior**. Não é preciso instalar pacotes, configurar banco ou preencher credenciais.

```sh
npm start
```

Abra [http://127.0.0.1:5173](http://127.0.0.1:5173). Para encerrar, pressione `Ctrl+C` no terminal. Para desenvolver com reinício automático do servidor, use `npm run dev` e recarregue o navegador após alterar o frontend. Execute apenas um processo por arquivo de dados.

Uma porta alternativa pode ser definida com `PORT=5174 npm start` no macOS/Linux.

## Contas para a aula

| Perfil | Pessoa | E-mail | Senha de demonstração |
| --- | --- | --- | --- |
| Solicitante | Ana Silva | `ana@demo.local` | `Demo123!` |
| Gestor | Rui Costa | `rui@demo.local` | `Demo123!` |
| Solicitante adicional | Bruno Lima | `bruno@demo.local` | `Demo123!` |

As entradas são `/login` e `/admin/login`. As contas de Ana e Rui vêm preenchidas na entrada correspondente. Bruno permite verificar que um solicitante não enxerga os pedidos de outro.

Estas são contas fictícias com uma senha pública de demonstração, sem relação com credenciais reais. Sair da conta e escolher o outro perfil permite demonstrar os dois papéis no mesmo navegador. Abas do mesmo navegador compartilham a sessão.

## Roteiro de demonstração

1. Entre como **Ana**, solicitante, e clique em **Nova demanda**.
2. Preencha título e descrição, selecione uma prioridade e tente criar sem justificativa. O formulário exige o preenchimento em **Baixa, Normal, Alta e Crítica**.
3. Informe o motivo e crie a demanda. O sistema apresenta um número `DEM-…` e a situação **Aberta**.
4. Saia da conta e entre como **Rui**, gestor. Localize o pedido na fila, usando a busca pelo título ou número.
5. Abra o pedido, revise a prioridade com um motivo e clique em **Iniciar atendimento**.
6. Escreva uma resposta e clique em **Concluir demanda**. Sem resposta prévia do gestor, a conclusão é impedida.
7. Entre novamente como Ana. Consulte a resposta e o histórico. Após a conclusão, o pedido está somente para leitura.

## O que funciona

- Login por perfil, sessão em cookie HttpOnly e logout.
- Lista própria do solicitante e fila completa do gestor.
- Abertura com validação no formulário e no servidor, justificativa obrigatória em todas as prioridades e número único.
- Busca por título, número ou solicitante; filtros por situação e prioridade; contagens e ordenação por prioridade e antiguidade.
- Comentários com autor e data; revisão de prioridade com motivo; histórico de criação e alterações.
- Fluxo **Aberta → Em atendimento → Concluída**, com resposta obrigatória do gestor antes da conclusão.
- Bloqueio de escritas em demandas concluídas, inclusive chamadas diretas à API.
- Persistência após recarregar a página e reiniciar o servidor.
- Interface responsiva, rótulos de formulário, navegação por teclado e diálogos com foco contido.

As contagens acompanham a busca e a prioridade. As abas de situação alteram a lista, preservando as contagens de todas as situações para comparação.

## Dados e escopo desta versão

Na primeira execução, o servidor gera exemplos fictícios em `data/store.json`. Novos pedidos são salvos nesse mesmo arquivo, no computador que executa o servidor. A gravação usa arquivo temporário e renomeação atômica. Não há sincronização entre computadores.

As sessões duram até oito horas e ficam em memória; reiniciar o servidor exige novo login, mas preserva os pedidos. A autorização é validada no servidor. As senhas dos exemplos são armazenadas como hashes com sal individual.

O servidor escuta apenas em `127.0.0.1`. Este modo foi feito para a aula, com contas conhecidas, sem recuperação de senha, cadastro público, gerenciamento de usuários ou recursos de produção. Não o exponha publicamente nem use dados reais nele.

**Supabase está planejado, mas ainda não conectado.** O `.env` local está reservado para as credenciais. A futura integração exige Supabase Auth, migrações, políticas RLS e substituição da persistência local. Preencher o `.env` sozinho não ativa essa integração.

`.env`, `data/`, capturas locais e logs são ignorados pelo Git. Apenas `.env.example`, com campos vazios, deve ser publicado.

## Verificação

```sh
npm run check
npm test
```

Os testes de integração usam um servidor em porta temporária e dados isolados no diretório temporário do sistema. Verificam login, isolamento de Ana/Bruno, permissões do gestor, justificativa em todos os níveis, autoria confiável, revisão com motivo, transições, conclusão, persistência, criação simultânea e restrição de origem. Não alteram os dados da demonstração.

## Estrutura

```text
public/           Interface HTML, CSS e JavaScript
server/index.js   Servidor HTTP, sessões, autorização e API
server/store.js   Persistência e dados fictícios iniciais
tests/            Testes de integração
AGENTS.md         Orientações de trabalho no projeto
PRD.md            Requisitos, decisões e próximos passos
.env.example      Campos vazios da futura integração Supabase
```

O projeto não usa bibliotecas externas nem uma etapa de build. O Node.js serve os arquivos de `public/` e a API local.
