# OAZE app — estado em 26/10/2026

## Revisão 2.0.3 — pacotes de teste gerados

Entrada animada, áreas seguras da câmera, layout adaptativo para aparelhos dobráveis, consulta de cobrança e portal Stripe autenticado, controle contextual de notificações e fundo WebGL refinado foram implementados na pasta do app. A função `oaze-billing-portal` está ativa no Supabase; ainda não foi testada com uma assinatura real. O AAB da Google Play omite compra e portal Stripe até existir Play Billing ou programa permitido. `docs/19-ENTRADA-COBRANCA-AVISOS-E-DOBRAVEIS.md` registra o comportamento e os testes pendentes. A suíte local passou (241 testes, typecheck, builds e scanner); essa suíte não comprova a operação instalada em Android/Windows.

## Pacotes de teste 2.0.3

Os workflows do commit `5f575ae` passaram em [Android 22](https://github.com/osanttoro-creator/oaze/actions/runs/40327400997), [Windows 19](https://github.com/osanttoro-creator/oaze/actions/runs/40327401002) e [verificação 24](https://github.com/osanttoro-creator/oaze/actions/runs/40327401010). O APK está em `builds/oaze-android-painel-2.0.3-22.apk` (SHA-256 `A270D808B3C1497B6F0CC75789A9F3965C60D613D3B30540C66B42828F0A2A2D`). Windows: `builds/oaze-windows-painel-2.0.3-19.exe` (SHA-256 `4291F850EF081CE842DEB5782D45FD2777C5BA726250270690B6D3375A23F55D`) e `.msi` (SHA-256 `0A81D29179A661E561349ADBEF0842EE84243848B9342E538EC071E60AA50C0F`). Os binários não foram instalados em aparelhos nesta sessão. O AAB assinado para a loja não foi gerado.

Downloads de teste no Drive: [Android APK](https://drive.google.com/file/d/1QIduWvWX_XBkB-QWosl2NqEeu3zT4WhQ/view?usp=drivesdk), [Windows EXE](https://drive.google.com/file/d/1AmlQQUtw6jg26IQ2_DoMTc1Vpq6EJUZS/view?usp=drivesdk) e [Windows MSI](https://drive.google.com/file/d/1z342hdITtKBi17C05qr0L2j9oPI-g1Vx/view?usp=drivesdk).

## Painel publicado no app

Os pacotes de teste Android 16 e Windows 13 mostravam uma interface diferente da disponível em `https://oaze.site/app`. A versão 2.0.2 passou a empacotar o painel publicado em `app/live-site/` e a usar `app/dist-live/` nos shells Android e Windows. Ver `18-PAINEL-PUBLICADO-NO-APP.md`. Os links de builds antigos nesta página são histórico; conferir o número de versão antes de instalar.

O projeto canônico está em `G:\Meu Drive\sites\oaze app`. O remoto Git configurado é `https://github.com/osanttoro-creator/oaze.git`. O site público OAZE 1 continua separado, e migrou junto para o Drive: ele está em `G:\Meu Drive\sites\OAZE\o site`, não mais em `Downloads`.

## Rodada de 25/10/2026 — Android e Windows para loja

As lojas em preparação são **Google Play** e **Microsoft Store**. iOS e macOS continuam no repositório, fora desta rodada.

- Caminho da Microsoft Store definido como **MSIX**, não instalador assinado: no caminho empacotado a Microsoft assina e hospeda sem custo. `app/tools/empacotar-msix.mjs` monta o pacote a partir do binário do Tauri; o workflow é `App · Windows (Microsoft Store)`. Falta criar o produto no Partner Center para existirem os três valores de identidade — sem eles o script para antes de gerar nada.
- Botão voltar do Android implementado em `state/route.ts` (`backIntent()`) e ligado pela plataforma. Antes, sem ouvinte de `backButton`, o Capacitor consumia a tecla na tela inicial e o app não fechava pelo voltar.
- Workflows de loja passaram a ter canal `teste` ou `producao`: o canal de testes aceita a sincronização desligada, produção continua exigindo o teste entre dois aparelhos.
- Corrigida uma etapa `xcodebuild` que tinha ficado solta no job Android e faria toda execução falhar.
- `17-FICHAS-DE-LOJA.md` reúne textos e formulários das duas lojas, com o que depende de decisão marcado em vez de preenchido.
- `npm run check` passou numa cópia local: typecheck, 241 testes em 25 arquivos, build e scanner. O `node_modules` **não funciona na pasta do Drive** — os arquivos chegam com zero byte, então verificar exige copiar o projeto para disco local.
- Não verificado: empacotamento MSIX até o fim (falta `makeappx`/Windows SDK nesta máquina), instalação em aparelho e máquina reais, e o botão voltar num Android de verdade.

Detalhe da rodada em `16-ANDROID-WINDOWS-2026-10-25.md`.

## Implementado e validado localmente

- Núcleo React/TypeScript compartilhado; cascas adaptativas para celular e desktop; projetos Capacitor para Android/iOS e Tauri para Windows/macOS.
- Motor financeiro, design system Night Ocean, navegação, partículas e telas de conta.
- Estado, fila offline e revisões separados por conta. Trocar de conta esconde os dados anteriores imediatamente. O estado sem conta fica local e pode ser copiado para uma conta por escolha explícita.
- Importação por escolha explícita dos dados locais do OAZE 1 e dos perfis da própria conta em `public.dados`, sem alterar o site antigo.
- Agenda financeira portada da V3: visões de ano, mês e semana, vencimentos de fatura, recorrências e lançamento com data escolhida. O resumo usa os mesmos totais confirmados do domínio.
- 229 testes, typecheck, build Vite e scanner de segurança passaram numa cópia temporária nesta máquina. O site de origem passou em 36/36 verificações. Os [workflows mobile](https://github.com/osanttoro-creator/oaze/actions/runs/38976818155) e [desktop](https://github.com/osanttoro-creator/oaze/actions/runs/38976818160) desta revisão passaram, incluindo Android, Windows, iOS sem assinatura e macOS. Instalação e uso em aparelho real ainda não foram verificados.

## Supabase compartilhado

O aplicativo usa o mesmo projeto Supabase do OAZE 1, por URL e chave publicável locais ignoradas pelo Git. A migração `20261010010249_oaze2_multiplatform_sync.sql` foi aplicada no projeto OAZE. As quatro tabelas `oaze2_*` estão vazias, têm RLS ativa e permissões conferidas. A RPC de escrita e o isolamento de leitura entre duas contas passaram em transações revertidas. Nenhum dado financeiro de usuário foi transferido automaticamente.

Em 18/10, foi confirmado que a lista Auth Redirect URLs tinha somente endereços web: por isso o OAuth terminava em `https://oaze.site/app#home`, fora do aplicativo. `oaze://auth` foi adicionado e confirmado no painel Supabase. O cliente nativo passou ao fluxo PKCE, grava e lê o verificador no cofre assíncrono e só aceita o código de retorno no deep link. Os 231 testes, typecheck, build web e scanner passaram na cópia de validação; a entrada real no instalador atualizado ainda precisa ser testada.

O botão de demonstração do app Windows foi identificado pelo usuário como a entrada indevida. Nos builds de produção, a entrada “Ver com dados de exemplo” deixa de aparecer; a tela permanece acessível no ambiente de desenvolvimento para orientar a V4. A atualização preserva os espaços locais que já tenham sido criados.

`VITE_OAZE_SYNC_ENABLED=false` ainda é intencional. Faltam teste autenticado do fluxo completo com dois dispositivos, resolução de conflito real e recuperação offline antes de ligar a sincronização financeira em builds distribuídos. A conta e o login podem funcionar com a chave publicável configurada; isso não significa que os dados financeiros já apareçam em outro aparelho. O login Google/Apple abre o navegador do sistema e deve retornar pelo esquema `oaze://auth`; o callback no Android cobre abertura fria e no desktop registra instância única. A URL agora está permitida no Supabase; faltam instalação atualizada e teste real dos provedores. Recuperação de senha usa o formulário do site.

## Builds e publicação

- Android/iOS: projetos e CI preparados; cofre, biometria, preferências, compartilhamento, clipboard e push por import dinâmico. O [workflow mobile](https://github.com/osanttoro-creator/oaze/actions/runs/38976818155) passou: gerou APK Android, compilou AAB sem assinatura de loja e iOS sem assinatura. O APK com retorno nativo de login está em `builds/oaze-android-teste-10.apk` (SHA-256 `0716F298DDDF76E6345EF439048A477A48A563F3CBEA05F4518FEEDB244EE555`). O pacote foi aberto e contém URL pública do Supabase. Faltam instalação e fluxos em aparelhos, configuração FCM/APNs e assinatura de loja.
- Windows/macOS: o [workflow desktop](https://github.com/osanttoro-creator/oaze/actions/runs/38976818160) compilou e empacotou ambos com sucesso. Instaladores Windows atualizados em `builds/oaze-windows-teste-10.msi` (SHA-256 `400832E538C24110BF8838C190F2202A2B66B8B0E72F6B4FCDAFAC483AEFB684`) e `builds/oaze-windows-teste-10.exe` (SHA-256 `00DA87541C1B5DB9CD7441B549F3B9DB93AB44215DFBC274C80997BD0578177D`). Ambos estão sem assinatura de código. O DMG macOS local ainda é o build anterior `builds/oaze-macos-teste-7.dmg`; o workflow mais recente tem novo artefato, ainda não copiado para esta pasta. Faltam instalação observada, assinatura e notarização para distribuição.
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
