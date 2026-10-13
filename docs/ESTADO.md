# OAZE 2 — estado em 13/10/2026

O projeto canônico está em `G:\Meu Drive\sites\oaze app`. O remoto Git configurado é `https://github.com/osanttoro-creator/oaze.git`. O site público OAZE 1 continua separado.

## Implementado e validado localmente

- Núcleo React/TypeScript compartilhado; cascas adaptativas para celular e desktop; projetos Capacitor para Android/iOS e Tauri para Windows/macOS.
- Motor financeiro, design system Night Ocean, navegação, partículas e telas de conta.
- Estado, fila offline e revisões separados por conta. Trocar de conta esconde os dados anteriores imediatamente. O estado sem conta fica local e pode ser copiado para uma conta por escolha explícita.
- Importação por escolha explícita dos dados locais do OAZE 1 e dos perfis da própria conta em `public.dados`, sem alterar o site antigo.
- Agenda financeira portada da V3: visões de ano, mês e semana, vencimentos de fatura, recorrências e lançamento com data escolhida. O resumo usa os mesmos totais confirmados do domínio.
- 22 arquivos de testes / 226 testes, typecheck, build Vite e scanner de segurança passaram numa cópia temporária nesta máquina. O site de origem passou em 34 verificações. Os workflows nativos desta revisão também passaram no GitHub; instalação e uso em aparelho real ainda não foram verificados.

## Supabase compartilhado

O aplicativo usa o mesmo projeto Supabase do OAZE 1, por URL e chave publicável locais ignoradas pelo Git. A migração `20261010010249_oaze2_multiplatform_sync.sql` foi aplicada no projeto OAZE. As quatro tabelas `oaze2_*` estão vazias, têm RLS ativa e permissões conferidas. A RPC de escrita e o isolamento de leitura entre duas contas passaram em transações revertidas. Nenhum dado financeiro de usuário foi transferido automaticamente.

`VITE_OAZE_SYNC_ENABLED=false` ainda é intencional. Faltam teste autenticado do fluxo completo com dois dispositivos, resolução de conflito real e recuperação offline antes de ligar a sincronização financeira em builds distribuídos. A conta e o login podem funcionar com a chave publicável configurada; isso não significa que os dados financeiros já apareçam em outro aparelho. Google/Apple e links de retorno dependem de configuração dos provedores no Supabase e teste nativo.

## Builds e publicação

- Android/iOS: projetos e CI preparados; cofre, biometria, preferências, compartilhamento, clipboard e push por import dinâmico. `npx cap sync android` e `npx cap sync ios` passaram numa cópia temporária; os dez plugins entram nos dois projetos, incluindo biometria via SPM no iOS. O [workflow mobile desta revisão](https://github.com/osanttoro-creator/oaze/actions/runs/38433215960) passou: gerou APK Android, compilou AAB sem assinatura de loja e compilou iOS sem assinatura. O APK atualizado está em `builds/oaze-android-teste-7.apk` (SHA-256 `F65E35DF2A17ECEF337B15DF0A4841C1F8ED1D13C156F3A557C5C50F9C1C8187`). Faltam instalação e fluxos em aparelhos, configuração FCM/APNs e assinatura de loja.
- Windows/macOS: o [workflow desktop desta revisão](https://github.com/osanttoro-creator/oaze/actions/runs/38433216036) compilou e empacotou ambos com sucesso. Instaladores atualizados em `builds/oaze-windows-teste-7.msi` (SHA-256 `A02A03880C2349D40B0B5F79ADAF69AD7586EF364C0932B2CA5237E4D7F0C7BB`), `builds/oaze-windows-teste-7.exe` (SHA-256 `45FA5A42C0AA80061F7C0D35D0DC94587B6A14EDB688D0E653ED97CCE7455166`) e `builds/oaze-macos-teste-7.dmg` (Apple Silicon; SHA-256 `06B0C940B13752619FEA0AFACDEB5FE6ED8A9C69D58F16BA0ED8B483124236B2`). Faltam instalação observada, assinatura e notarização para distribuição.
- Microsoft Store: existe configuração separada para instalador offline, mas ainda faltam o nome jurídico do editor conforme Partner Center, assinatura de código para MSI/EXE, instalação silenciosa e build com a configuração de loja. Os instaladores de teste atualizados incluem a agenda, mas não são pacotes de submissão.
- Os workflows mobile e desktop agora validam também pull requests que alterem o app; os resultados desta revisão passaram em Android, iOS sem assinatura, Windows e macOS.
- Push registra token por usuário e dispositivo, mas ainda não há função de envio no servidor. Lembretes locais seguem independentes.
- Crash reporting de produção, validação de loja e distribuição continuam pendentes. `12-PUBLICACAO.md` registra as decisões de negócio e loja.
- `npm audit --omit=dev` encontrou zero vulnerabilidades; o audit completo reportou três avisos moderados na cadeia de ferramentas do Capacitor CLI, ainda sem correção compatível verificada.

## Próximas verificações

1. Instalar e validar APK Android, instaladores Windows e DMG macOS em aparelhos reais; testar iOS via TestFlight quando houver assinatura Apple.
2. Configurar Auth OAuth e deep links; testar login, importação e saída em aparelhos reais.
3. Testar dois aparelhos com alterações simultâneas e offline; somente então ligar a flag de sincronização.
4. Configurar push, assinatura, crash reporting e submissão às lojas.
5. Comparar o app com as capacidades do site atual em `13-PARIDADE-SITE-APP.md` antes de declarar equivalência.
