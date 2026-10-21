# Marca no login Google — estado em 19/10/2026

## Estado verificado

- O cliente Google OAuth usado pelo Supabase OAZE está no projeto Google Cloud `clean-tower-508414-f7` (`My Project 88914`), acessível pela conta Google KYPSELE. Nome `OAZE`, página inicial `https://oaze.site/`, privacidade e termos foram salvos no Google Auth Platform. Em 19/10, o usuário selecionou manualmente `oaze-perfil-oficial-1080.png`; a alteração foi salva e, após recarga, o painel exibiu **Logotipo do app atual**. A extensão recusou o upload automatizado; o usuário confirmou que desativou novamente o acesso temporário a arquivos locais.
- No Supabase, o projeto `gxwatircdhhetvzzlwwq` está na organização Free. O adicional Custom Domain aparece por US$ 10/mês, exclusivo do plano Pro de US$ 25/mês. Valores antes de impostos e uso excedente. O usuário decidiu não contratar agora; nenhum upgrade foi contratado.
- O Google continua apontando para o callback atual `https://gxwatircdhhetvzzlwwq.supabase.co/auth/v1/callback`. O domínio próprio ainda não está ativo.
- O app continua configurado somente para a URL padrão do Supabase. Nenhum build deve apontar para `auth.oaze.site` antes de contratar, ativar e testar o domínio.

## Procedimento de ativação, na ordem

1. Conferir a aparência do logo enviado na tela de consentimento real do Google. A política de privacidade pública ainda se declara minuta com lacunas de controlador/DPO; resolver isso antes de pedir verificação externa da marca.
2. Autorizar o orçamento mensal e contratar Pro + Custom Domain no Supabase. O custo de referência visto no painel é US$ 35/mês, fora impostos e uso excedente.
3. Registrar `auth.oaze.site` em Supabase, configurar CNAME e TXT de validação no DNS, verificar TLS.
4. **Antes da ativação:** adicionar `https://auth.oaze.site/auth/v1/callback` ao cliente Google OAuth. Manter o callback antigo durante a transição. Apple está desativado no Supabase em 18/10; se for habilitado, configurar também o serviço e retorno Apple antes da ativação.
5. Ativar o domínio no Supabase, testar login web e Windows instalado. Só então alterar `OAZE_SUPABASE_URL` nas variáveis de build e gerar Android, iOS, Windows e macOS. Testar também recuperação de sessão e retorno do navegador ao app.

O Google controla a tela de seleção de conta. A marca pode ganhar nome/logo OAZE e domínio `auth.oaze.site`, mas o endereço de destino pode continuar visível como informação de segurança.
