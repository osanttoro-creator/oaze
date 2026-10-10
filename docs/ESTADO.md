# OAZE 2 — estado em 10/10/2026

O projeto canônico está em `G:\Meu Drive\sites\oaze app`. O remoto Git configurado é `https://github.com/osanttoro-creator/oaze.git`. O site público OAZE 1 continua separado.

## Implementado e validado localmente

- Núcleo React/TypeScript compartilhado; cascas adaptativas para celular e desktop; projetos Capacitor para Android/iOS e Tauri para Windows/macOS.
- Motor financeiro, design system Night Ocean, navegação, partículas e telas de conta.
- Estado, fila offline e revisões separados por conta. Trocar de conta esconde os dados anteriores imediatamente. O estado sem conta fica local e pode ser copiado para uma conta por escolha explícita.
- Importação por escolha explícita dos dados locais do OAZE 1 e dos perfis da própria conta em `public.dados`, sem alterar o site antigo.
- 21 arquivos de testes / 222 testes, typecheck, build Vite e scanner de segurança passaram nesta máquina. Isso não comprova os builds nativos.

## Supabase compartilhado

O aplicativo usa o mesmo projeto Supabase do OAZE 1, por URL e chave publicável locais ignoradas pelo Git. A migração `20261010010249_oaze2_multiplatform_sync.sql` foi aplicada no projeto OAZE. As quatro tabelas `oaze2_*` estão vazias, têm RLS ativa e permissões conferidas. A RPC de escrita e o isolamento de leitura entre duas contas passaram em transações revertidas. Nenhum dado financeiro de usuário foi transferido automaticamente.

`VITE_OAZE_SYNC_ENABLED=false` ainda é intencional. Faltam teste autenticado do fluxo completo com dois dispositivos, resolução de conflito real e recuperação offline antes de ligar a sincronização financeira em builds distribuídos. A conta e o login podem funcionar com a chave publicável configurada; isso não significa que os dados financeiros já apareçam em outro aparelho. Google/Apple e links de retorno dependem de configuração dos provedores no Supabase e teste nativo.

## Builds e publicação

- Android/iOS: projetos e CI preparados; cofre, biometria, preferências, compartilhamento, clipboard e push por import dinâmico. `npx cap sync android` e `npx cap sync ios` passaram numa cópia temporária; os dez plugins entram nos dois projetos, incluindo biometria via SPM no iOS. O workflow de teste #4 passou no GitHub: gerou APK Android, compilou AAB sem assinatura de loja e compilou iOS sem assinatura. O APK está em `builds/oaze-android-teste-4.apk` (SHA-256 `711B473226FD72DB6EE4D498E4840900805287F37319541E0D8CD5ECBC0BB701`). Faltam instalação e fluxos em aparelhos, configuração FCM/APNs e assinatura de loja.
- Windows/macOS: o workflow desktop #3 compilou e empacotou ambos com sucesso no GitHub. Instaladores em `builds/oaze-windows-teste-3.msi`, `builds/oaze-windows-teste-3.exe` e `builds/oaze-macos-teste-3.dmg` (Apple Silicon). Faltam instalação observada, assinatura e notarização para distribuição.
- Push registra token por usuário e dispositivo, mas ainda não há função de envio no servidor. Lembretes locais seguem independentes.
- Crash reporting de produção, validação de loja e distribuição continuam pendentes. `12-PUBLICACAO.md` registra as decisões de negócio e loja.
- `npm audit --omit=dev` encontrou zero vulnerabilidades; o audit completo reportou três avisos moderados na cadeia de ferramentas do Capacitor CLI, ainda sem correção compatível verificada.

## Próximas verificações

1. Instalar e validar APK Android, instaladores Windows e DMG macOS em aparelhos reais; testar iOS via TestFlight quando houver assinatura Apple.
2. Configurar Auth OAuth e deep links; testar login, importação e saída em aparelhos reais.
3. Testar dois aparelhos com alterações simultâneas e offline; somente então ligar a flag de sincronização.
4. Configurar push, assinatura, crash reporting e submissão às lojas.
