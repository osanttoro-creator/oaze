# OAZE 2 — estado em 09/10/2026

O projeto canônico está em `G:\Meu Drive\sites\oaze app`. O remoto Git configurado é `https://github.com/osanttoro-creator/oaze.git`. O site público OAZE 1 continua separado.

## Funciona neste estágio

- Núcleo React/TypeScript compartilhado, com cascas adaptativas para celular e desktop; projetos Capacitor para Android/iOS e Tauri para Windows/macOS.
- Motor financeiro, design system Night Ocean, navegação, campo de partículas e interfaces de conta.
- Conta configurada para o **mesmo projeto Supabase** do OAZE 1 por URL e chave publicável locais, ignoradas pelo Git. Isso não migra nem sincroniza automaticamente os dados de `public.dados`.
- Captura de alterações do estado em operações por entidade, fusão, fila offline e RPC SQL preparados. A captura tem testes de inclusão, edição, remoção e orçamento.
- Nesta máquina: 19 arquivos de testes / 216 testes, typecheck, build Vite e scanner de segurança passaram. O build web não comprova os builds nativos.

## Bloqueios para liberar sincronização

`VITE_OAZE_SYNC_ENABLED=false` de propósito. Hoje o estado (`oaze.v2`), a fila (`oaze.sync.queue.v1`) e as revisões (`oaze.sync.rev.v1`) ainda usam chaves locais globais. É preciso separar esses dados por usuário, definir a adoção de dados anteriores ao login e impedir que a troca de contas mostre ou envie dados de outra pessoa. Depois, aplicar a migração SQL em staging, testar Auth e RPC reais, conflitos e dois dispositivos. A migração SQL ainda não foi aplicada aqui.

O login web usa Supabase Auth, mas Google/Apple e links de retorno dependem da configuração de provedores e URLs no painel Supabase. Não foram validados em aparelhos.

## Builds e publicação

- Android/iOS: projetos e CI preparados; plugins, SDKs, assinaturas e fluxo real em aparelho ainda não verificados.
- Windows/macOS: código Rust e CI preparados; Rust não compilado nesta máquina. Assinatura e notarização pendentes.
- Push e demais recursos nativos exigem testes reais antes de promessa pública.
- `docs/12-PUBLICACAO.md` lista decisões de lojas e negócio ainda abertas.

## Ordem técnica seguinte

1. Isolar estado, fila e revisões por conta; testar login A → sair → login B e uso offline.
2. Aplicar SQL em staging e testar o fluxo completo contra o mesmo Supabase, sem tocar no `public.dados` do OAZE 1.
3. Rodar os workflows Android/Windows; depois builds iOS/macOS em macOS e testes em aparelhos.
4. Configurar links de retorno, assinaturas, crash reporting, distribuição e revisão das lojas.
