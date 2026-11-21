/* =============================================================
   central-marcas.js — a Central de marcas do OAZE (13/11/2026)
   -------------------------------------------------------------
   Um lugar só para bancos, bandeiras, vales, lojas e as marcas que
   aparecem nos lançamentos (Netflix, Vivo, 99…). Antes isso morava em
   três arquivos: vendor/bancos.js (desenhos dos bancos), a lista
   MARCAS_EXTRAS dentro de js/icons.js e o antigo vendor/marcas-oaze.js.

   COMO A IMAGEM É ESCOLHIDA, NESTA ORDEM
   1. Desenho local (bancos do pacote MIT e as silhuetas do Simple
      Icons): funciona sem internet e não manda nada para fora.
   2. Logo da Brandfetch pelo site da marca (Logo API, carregada direto
      da CDN deles, como os termos pedem). Só liga quando o client ID
      estiver em CLIENT_ID abaixo. O que sai do app é só o site da
      marca (ex.: netflix.com), nunca dado da pessoa.
   3. Sigla nas cores da marca, se a imagem não carregar.

   Quem usa: js/icons.js (bancos, cartões, contas) e app.js (selo do
   lançamento, via MarcasOAZE.forName, mantido por compatibilidade).
   Carregar depois de vendor/bancos.js e antes de js/icons.js.
   ============================================================= */
(function (global) {
  'use strict';

  /* Client ID público da Brandfetch (painel de desenvolvedor → Logo API).
     Vazio = só desenhos locais e siglas. Não é o token da Brand API:
     esse é segredo e fica só no servidor (BRANDFETCH_TOKEN). */
  const CLIENT_ID = '';

  const BR = global.BancosBR || { ICONES: {}, PRESETS: {} };
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9&+ ]+/g, ' ').replace(/\s+/g, ' ').trim();

  /* ---------- silhuetas locais de marcas de consumo (Simple Icons, CC0) ---------- */
  const SVG = {
    shopee: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z"/></svg>'
  };
  SVG.netflix = "<svg aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"m5.398 0 8.348 23.602c2.346.059 4.856.398 4.856.398L10.113 0H5.398zm8.489 0v9.172l4.715 13.33V0h-4.715zM5.398 1.5V24c1.873-.225 2.81-.312 4.715-.398V14.83L5.398 1.5z\"/></svg>";
  SVG.vivo = "<svg aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M19.604 14.101c-1.159 0-1.262-.95-1.262-1.24 0-.29.103-1.242 1.262-1.242h2.062c1.16 0 1.263.951 1.263 1.242 0 .29-.104 1.24-1.263 1.24m-2.062-3.527c-2.142 0-2.333 1.752-2.333 2.287 0 .535.19 2.286 2.333 2.286h2.062c2.143 0 2.334-1.751 2.334-2.286 0-.535-.19-2.287-2.334-2.287m-5.477.107c-.286 0-.345.05-.456.213-.11.164-2.022 3.082-2.022 3.082-.06.09-.126.126-.206.126-.08 0-.145-.036-.206-.126 0 0-1.912-2.918-2.022-3.082-.11-.164-.17-.213-.456-.213h-.668c-.154 0-.224.12-.127.267l2.283 3.467c.354.521.614.732 1.196.732s.842-.21 1.196-.732l2.284-3.467c.096-.146.026-.267-.128-.267m-8.876.284c0-.203.08-.284.283-.284h.505c.203 0 .283.08.283.283v3.9c0 .202-.08.283-.283.283h-.505c-.203 0-.283-.08-.283-.283zm-1.769-.285c-.287 0-.346.05-.456.213-.11.164-2.022 3.082-2.022 3.082-.061.09-.126.126-.206.126-.08 0-.145-.036-.206-.126 0 0-1.912-2.918-2.023-3.082-.11-.164-.169-.213-.455-.213H.175c-.171 0-.224.12-.127.267l2.283 3.467c.355.521.615.732 1.197.732.582 0 .842-.21 1.196-.732l2.283-3.467c.097-.146.044-.267-.127-.267m1.055-.893c-.165-.164-.165-.295 0-.46l.351-.351c.165-.165.296-.165.46 0l.352.351c.165.165.165.296 0 .46l-.352.352c-.164.165-.295.165-.46 0z\"/></svg>";

  /* ---------- catálogo ----------
     tipo: banco | bandeira | vale | loja | assinatura | servico
     dominio: o site da marca, usado para buscar a logo na Brandfetch.
     categoria: sugestão de categoria quando a marca aparece num lançamento. */
  const BANCOS_DOMINIO = {
    bancodobrasil: ['Banco do Brasil', 'bb.com.br'], bradesco: ['Bradesco', 'bradesco.com.br'], btg: ['BTG Pactual', 'btgpactual.com'],
    caixa: ['Caixa', 'caixa.gov.br'], cora: ['Cora', 'cora.com.br'], inter: ['Inter', 'bancointer.com.br'], itau: ['Itaú', 'itau.com.br'],
    nubank: ['Nubank', 'nubank.com.br'], santander: ['Santander', 'santander.com.br'], xp: ['XP', 'xpi.com.br'],
    infinitepay: ['InfinitePay', 'infinitepay.io'], picpay: ['PicPay', 'picpay.com'], mercadopago: ['Mercado Pago', 'mercadopago.com.br'],
    pagbank: ['PagBank', 'pagbank.com.br'], c6: ['C6 Bank', 'c6bank.com.br'], digio: ['Digio', 'digio.com.br'], sicoob: ['Sicoob', 'sicoob.com.br'],
    neon: ['Neon', 'neon.com.br'], pan: ['Banco Pan', 'bancopan.com.br'], safra: ['Safra', 'safra.com.br'], wise: ['Wise', 'wise.com'],
    paypal: ['PayPal', 'paypal.com'], stripe: ['Stripe', 'stripe.com'], stone: ['Stone', 'stone.com.br'], next: ['Next', 'next.me'],
    original: ['Original', 'original.com.br'], sicredi: ['Sicredi', 'sicredi.com.br'], rico: ['Rico', 'rico.com.vc'], revolut: ['Revolut', 'revolut.com'],
    bs2: ['BS2', 'bs2.com'], bv: ['Banco BV', 'bv.com.br'], efibank: ['Efí Bank', 'sejaefi.com.br'], ton: ['Ton', 'ton.com.br'], iugu: ['iugu', 'iugu.com'],
    asaas: ['Asaas', 'asaas.com'], ngcash: ['NG.CASH', 'ng.cash'], avenue: ['Avenue', 'avenue.us'], nomad: ['Nomad', 'nomadglobal.com'],
    mercantil: ['Mercantil', 'mercantil.com.br'], bmg: ['BMG', 'bancobmg.com.br'], agibank: ['Agibank', 'agibank.com.br']
  };

  /* Bandeiras, vales, lojas e bancos fora do pacote MIT: sigla nas cores
     da marca (antes era MARCAS_EXTRAS em js/icons.js). */
  const EXTRAS = {
    caju: { nome: 'Caju', sigla: 'caju', fundo: '#F2353B', cor: '#FFFFFF', re: /\bcaju\b/, grupo: 'vale', dominio: 'caju.com.br' },
    ifoodbeneficios: { nome: 'iFood Benefícios', sigla: 'iF', fundo: '#EA1D2C', cor: '#FFFFFF', re: /ifood/, grupo: 'vale', dominio: 'ifoodbeneficios.com.br' },
    alelo: { nome: 'Alelo', sigla: 'alelo', fundo: '#C4D600', cor: '#00573F', re: /\balelo\b/, grupo: 'vale', dominio: 'alelo.com.br' },
    pluxee: { nome: 'Pluxee', sigla: 'P', fundo: '#00EB5E', cor: '#221C46', re: /pluxee|sodexo/, grupo: 'vale', dominio: 'pluxee.com.br' },
    ticket: { nome: 'Ticket', sigla: 'T', fundo: '#E30613', cor: '#FFFFFF', re: /\bticket\b/, grupo: 'vale', dominio: 'ticket.com.br' },
    vr: { nome: 'VR', sigla: 'VR', fundo: '#00A13A', cor: '#FFFFFF', re: /^vr\b|\bvr (beneficio|refeicao|alimentacao)/, grupo: 'vale', dominio: 'vr.com.br' },
    flash: { nome: 'Flash', sigla: 'flash', fundo: '#FF2C83', cor: '#FFFFFF', re: /\bflash\b/, grupo: 'vale', dominio: 'flashapp.com.br' },
    ben: { nome: 'Ben', sigla: 'ben', fundo: '#111111', cor: '#FFFFFF', re: /^ben\b|\bben visa/, grupo: 'vale', dominio: 'benvisavale.com.br' },
    swile: { nome: 'Swile', sigla: 'swile', fundo: '#111111', cor: '#FFFFFF', re: /\bswile\b/, grupo: 'vale', dominio: 'swile.com.br' },
    wiipo: { nome: 'Wiipo', sigla: 'wiipo', fundo: '#5B2BE0', cor: '#FFFFFF', re: /\bwiipo\b/, grupo: 'vale', dominio: 'wiipo.com.br' },
    lecard: { nome: 'LeCard', sigla: 'LC', fundo: '#FFC20E', cor: '#1A1A1A', re: /le ?card/, grupo: 'vale', dominio: 'lecard.com.br' },
    visa: { nome: 'Visa', sigla: 'VISA', fundo: '#1A1F71', cor: '#FFFFFF', re: /\bvisa\b/, grupo: 'bandeira', dominio: 'visa.com.br' },
    mastercard: { nome: 'Mastercard', sigla: 'MC', fundo: '#252525', cor: '#F79E1B', re: /master ?card/, grupo: 'bandeira', dominio: 'mastercard.com.br' },
    elo: { nome: 'Elo', sigla: 'elo', fundo: '#000000', cor: '#FFCB05', re: /^elo\b|\belo (credito|debito|nanquim|grafite|mais)/, grupo: 'bandeira', dominio: 'elo.com.br' },
    amex: { nome: 'Amex', sigla: 'AMEX', fundo: '#2E77BC', cor: '#FFFFFF', re: /\bamex\b|american express/, grupo: 'bandeira', dominio: 'americanexpress.com' },
    hipercard: { nome: 'Hipercard', sigla: 'H', fundo: '#B3131B', cor: '#FFFFFF', re: /hipercard/, grupo: 'bandeira', dominio: 'hipercard.com.br' },
    shopee: { nome: 'Shopee', sigla: 'S', fundo: '#EE4D2D', cor: '#FFFFFF', re: /shopee/, grupo: 'loja', dominio: 'shopee.com.br', categoria: 'compras' },
    amazon: { nome: 'Amazon', sigla: 'a', fundo: '#232F3E', cor: '#FF9900', re: /amazon(?! prime)/, grupo: 'loja', dominio: 'amazon.com.br', categoria: 'compras' },
    magalu: { nome: 'Magalu', sigla: 'M', fundo: '#0086FF', cor: '#FFFFFF', re: /magalu|magazine luiza/, grupo: 'loja', dominio: 'magazineluiza.com.br', categoria: 'compras' },
    mercadolivre: { nome: 'Mercado Livre', sigla: 'ML', fundo: '#FFE600', cor: '#2D3277', re: /mercado ?livre|mercadolivre/, grupo: 'loja', dominio: 'mercadolivre.com.br', categoria: 'compras' },
    americanas: { nome: 'Americanas', sigla: 'a', fundo: '#E60014', cor: '#FFFFFF', re: /americanas/, grupo: 'loja', dominio: 'americanas.com.br', categoria: 'compras' },
    casasbahia: { nome: 'Casas Bahia', sigla: 'CB', fundo: '#0033C6', cor: '#FFFFFF', re: /casas bahia/, grupo: 'loja', dominio: 'casasbahia.com.br', categoria: 'compras' },
    renner: { nome: 'Renner', sigla: 'R', fundo: '#D2001F', cor: '#FFFFFF', re: /renner/, grupo: 'loja', dominio: 'lojasrenner.com.br', categoria: 'vestuario' },
    riachuelo: { nome: 'Riachuelo', sigla: 'Ri', fundo: '#111111', cor: '#FFFFFF', re: /riachuelo|midway/, grupo: 'loja', dominio: 'riachuelo.com.br', categoria: 'vestuario' },
    cea: { nome: 'C&A', sigla: 'C&A', fundo: '#00539F', cor: '#FFFFFF', re: /^c ?& ?a\b|^cea\b/, grupo: 'loja', dominio: 'cea.com.br', categoria: 'vestuario' },
    carrefour: { nome: 'Carrefour', sigla: 'C', fundo: '#004E9F', cor: '#FFFFFF', re: /carrefour|atacadao/, grupo: 'loja', dominio: 'carrefour.com.br', categoria: 'mercado' },
    pernambucanas: { nome: 'Pernambucanas', sigla: 'P', fundo: '#E30613', cor: '#FFFFFF', re: /pernambucanas/, grupo: 'loja', dominio: 'pernambucanas.com.br', categoria: 'compras' },
    marisa: { nome: 'Marisa', sigla: 'M', fundo: '#E6007E', cor: '#FFFFFF', re: /^marisa\b/, grupo: 'loja', dominio: 'marisa.com.br', categoria: 'vestuario' },
    havan: { nome: 'Havan', sigla: 'H', fundo: '#003DA5', cor: '#FFFFFF', re: /\bhavan\b/, grupo: 'loja', dominio: 'havan.com.br', categoria: 'compras' },
    shein: { nome: 'Shein', sigla: 'S', fundo: '#000000', cor: '#FFFFFF', re: /shein/, grupo: 'loja', dominio: 'shein.com', categoria: 'vestuario' },
    aliexpress: { nome: 'AliExpress', sigla: 'AE', fundo: '#E62E04', cor: '#FFFFFF', re: /aliexpress/, grupo: 'loja', dominio: 'aliexpress.com', categoria: 'compras' },
    banrisul: { nome: 'Banrisul', sigla: 'B', fundo: '#004B8D', cor: '#FFFFFF', re: /banrisul/, grupo: 'banco', dominio: 'banrisul.com.br' },
    brb: { nome: 'BRB', sigla: 'BRB', fundo: '#0B3B8C', cor: '#FFFFFF', re: /^brb\b|banco de brasilia/, grupo: 'banco', dominio: 'brb.com.br' },
    bancodaamazonia: { nome: 'Banco da Amazônia', sigla: 'BASA', fundo: '#006E3C', cor: '#FFFFFF', re: /amazonia|\bbasa\b/, grupo: 'banco', dominio: 'bancoamazonia.com.br' },
    bnb: { nome: 'Banco do Nordeste', sigla: 'BNB', fundo: '#A6192E', cor: '#FFFFFF', re: /banco do nordeste|\bbnb\b/, grupo: 'banco', dominio: 'bnb.gov.br' },
    banestes: { nome: 'Banestes', sigla: 'b', fundo: '#00529B', cor: '#FFFFFF', re: /banestes/, grupo: 'banco', dominio: 'banestes.com.br' },
    banese: { nome: 'Banese', sigla: 'b', fundo: '#005CA9', cor: '#FFFFFF', re: /banese/, grupo: 'banco', dominio: 'banese.com.br' },
    banpara: { nome: 'Banpará', sigla: 'b', fundo: '#0067B1', cor: '#FFFFFF', re: /banpara/, grupo: 'banco', dominio: 'banpara.b.br' },
    citi: { nome: 'Citibank', sigla: 'citi', fundo: '#056DAE', cor: '#FFFFFF', re: /\bciti(bank)?\b/, grupo: 'banco', dominio: 'citi.com' },
    daycoval: { nome: 'Daycoval', sigla: 'D', fundo: '#00205B', cor: '#FFFFFF', re: /daycoval/, grupo: 'banco', dominio: 'daycoval.com.br' },
    sofisa: { nome: 'Sofisa', sigla: 'S', fundo: '#0A2240', cor: '#F5A800', re: /sofisa/, grupo: 'banco', dominio: 'sofisa.com.br' },
    willbank: { nome: 'Will Bank', sigla: 'will', fundo: '#FFD400', cor: '#1A1A1A', re: /will ?bank/, grupo: 'banco', dominio: 'willbank.com.br' },
    bancopine: { nome: 'Banco Pine', sigla: 'P', fundo: '#F26F21', cor: '#FFFFFF', re: /banco pine|^pine\b/, grupo: 'banco', dominio: 'pine.com' },
    modal: { nome: 'Modal', sigla: 'M', fundo: '#111111', cor: '#FFFFFF', re: /modal(mais)?\b/, grupo: 'banco', dominio: 'modal.com.br' },
    genial: { nome: 'Genial', sigla: 'G', fundo: '#1B2A4A', cor: '#FFFFFF', re: /genial/, grupo: 'banco', dominio: 'genialinvestimentos.com.br' },
    toro: { nome: 'Toro', sigla: 'T', fundo: '#5A2D82', cor: '#FFFFFF', re: /^toro\b|toro invest/, grupo: 'banco', dominio: 'toroinvestimentos.com.br' },
    warren: { nome: 'Warren', sigla: 'W', fundo: '#E02B56', cor: '#FFFFFF', re: /warren/, grupo: 'banco', dominio: 'warren.com.br' },
    ailos: { nome: 'Ailos', sigla: 'A', fundo: '#00A859', cor: '#FFFFFF', re: /ailos/, grupo: 'banco', dominio: 'ailos.coop.br' },
    cresol: { nome: 'Cresol', sigla: 'C', fundo: '#00843D', cor: '#FFFFFF', re: /cresol/, grupo: 'banco', dominio: 'cresol.com.br' },
    unicred: { nome: 'Unicred', sigla: 'U', fundo: '#004C3F', cor: '#FFFFFF', re: /unicred/, grupo: 'banco', dominio: 'unicred.com.br' },
    portobank: { nome: 'Porto Bank', sigla: 'P', fundo: '#0046C0', cor: '#FFFFFF', re: /porto ?(seguro|bank)/, grupo: 'banco', dominio: 'portoseguro.com.br' },
    credicard: { nome: 'Credicard', sigla: 'cc', fundo: '#00205B', cor: '#FFFFFF', re: /credicard/, grupo: 'banco', dominio: 'credicard.com.br' },
    superdigital: { nome: 'Superdigital', sigla: 'S', fundo: '#E2001A', cor: '#FFFFFF', re: /superdigital/, grupo: 'banco', dominio: 'superdigital.com.br' },
    recargapay: { nome: 'RecargaPay', sigla: 'R', fundo: '#00C08B', cor: '#FFFFFF', re: /recarga ?pay/, grupo: 'banco', dominio: 'recargapay.com.br' },
    ame: { nome: 'Ame Digital', sigla: 'ame', fundo: '#E60014', cor: '#FFFFFF', re: /\bame\b/, grupo: 'banco', dominio: 'amedigital.com' },
    tribanco: { nome: 'Tribanco', sigla: 'T', fundo: '#003D7C', cor: '#FFFFFF', re: /tribanco/, grupo: 'banco', dominio: 'tribanco.com.br' }
  };

  /* Marcas de lançamento (assinaturas, serviços, delivery, transporte).
     Só entram no casamento de DESCRIÇÃO de lançamento, nunca no de banco
     do cartão: "Vivo" num cartão não é um banco. */
  const LANCAMENTO = {
    netflix: { nome: 'Netflix', sigla: 'N', fundo: '#E50914', cor: '#FFFFFF', re: /\bnetflix\b/, grupo: 'assinatura', dominio: 'netflix.com', categoria: 'assinaturas' },
    spotify: { nome: 'Spotify', sigla: 'S', fundo: '#1DB954', cor: '#000000', re: /\bspotify\b/, grupo: 'assinatura', dominio: 'spotify.com', categoria: 'assinaturas' },
    disneyplus: { nome: 'Disney+', sigla: 'D+', fundo: '#16294C', cor: '#FFFFFF', re: /\bdisney\s*(?:plus|\+)?|\bdisneyplus\b/, grupo: 'assinatura', dominio: 'disneyplus.com', categoria: 'assinaturas' },
    primevideo: { nome: 'Prime Video', sigla: 'P', fundo: '#00A8E1', cor: '#FFFFFF', re: /prime ?video|amazon prime/, grupo: 'assinatura', dominio: 'primevideo.com', categoria: 'assinaturas' },
    max: { nome: 'Max', sigla: 'max', fundo: '#002BE7', cor: '#FFFFFF', re: /\bhbo ?max\b|\bmax\.com\b|\bwbd\b/, grupo: 'assinatura', dominio: 'max.com', categoria: 'assinaturas' },
    globoplay: { nome: 'Globoplay', sigla: 'g', fundo: '#FF3B1F', cor: '#FFFFFF', re: /globo ?play/, grupo: 'assinatura', dominio: 'globoplay.globo.com', categoria: 'assinaturas' },
    youtube: { nome: 'YouTube Premium', sigla: 'YT', fundo: '#FF0000', cor: '#FFFFFF', re: /youtube/, grupo: 'assinatura', dominio: 'youtube.com', categoria: 'assinaturas' },
    apple: { nome: 'Apple', sigla: '', fundo: '#111111', cor: '#FFFFFF', re: /\bapple\.com|\bapple ?(bill|music|tv|one)|\bitunes\b/, grupo: 'assinatura', dominio: 'apple.com', categoria: 'assinaturas' },
    google: { nome: 'Google', sigla: 'G', fundo: '#FFFFFF', cor: '#4285F4', re: /\bgoogle\b/, grupo: 'assinatura', dominio: 'google.com', categoria: 'assinaturas' },
    vivo: { nome: 'Vivo', sigla: 'V', fundo: '#660099', cor: '#FFFFFF', re: /\bvivo\b|telefonica/, grupo: 'servico', dominio: 'vivo.com.br', categoria: 'celular' },
    claro: { nome: 'Claro', sigla: 'claro', fundo: '#E32620', cor: '#FFFFFF', re: /\bclaro\b/, grupo: 'servico', dominio: 'claro.com.br', categoria: 'celular' },
    tim: { nome: 'TIM', sigla: 'TIM', fundo: '#004691', cor: '#FFFFFF', re: /\btim\b/, grupo: 'servico', dominio: 'tim.com.br', categoria: 'celular' },
    oi: { nome: 'Oi', sigla: 'oi', fundo: '#FFD200', cor: '#000000', re: /^oi\b|\boi fibra|\boi s ?a\b/, grupo: 'servico', dominio: 'oi.com.br', categoria: 'celular' },
    uber: { nome: 'Uber', sigla: 'U', fundo: '#000000', cor: '#FFFFFF', re: /\buber\b(?! ?eats)/, grupo: 'servico', dominio: 'uber.com', categoria: 'transporte' },
    noventaenove: { nome: '99', sigla: '99', fundo: '#FFDD00', cor: '#111111', re: /\b99 ?(app|pop|taxi|viagem|food)?\b|\b99app\b/, grupo: 'servico', dominio: '99app.com', categoria: 'transporte' },
    ifood: { nome: 'iFood', sigla: 'iF', fundo: '#EA1D2C', cor: '#FFFFFF', re: /\bifood\b|\bifd\b/, grupo: 'servico', dominio: 'ifood.com.br', categoria: 'alimentacao' },
    rappi: { nome: 'Rappi', sigla: 'R', fundo: '#FF441F', cor: '#FFFFFF', re: /\brappi\b/, grupo: 'servico', dominio: 'rappi.com.br', categoria: 'alimentacao' },
    airbnb: { nome: 'Airbnb', sigla: 'A', fundo: '#FF5A5F', cor: '#FFFFFF', re: /\bairbnb\b/, grupo: 'servico', dominio: 'airbnb.com.br', categoria: 'viagem' },
    smartfit: { nome: 'Smart Fit', sigla: 'SF', fundo: '#FFD100', cor: '#111111', re: /smart ?fit/, grupo: 'servico', dominio: 'smartfit.com.br', categoria: 'saude' }
  };

  /* Os desenhos herdados ficam presos ao item certo. */
  for (const k in LANCAMENTO) if (SVG[k]) LANCAMENTO[k].svg = SVG[k];
  for (const k in EXTRAS) if (SVG[k]) EXTRAS[k].svg = SVG[k];

  /* ---------- logo remota ---------- */
  function logoUrl(item, px) {
    if (!CLIENT_ID || !item || !item.dominio) return '';
    const t = Math.max(32, Math.min(256, Math.round((px || 64) * 2)));
    return 'https://cdn.brandfetch.io/' + encodeURIComponent(item.dominio) + '/w/' + t + '/h/' + t + '/fallback/404?c=' + encodeURIComponent(CLIENT_ID);
  }

  /* ---------- busca ---------- */
  function item(chave) {
    if (!chave) return null;
    if (BR.PRESETS[chave] || BR.ICONES[chave]) {
      const p = BR.PRESETS[chave] || {};
      const [nome, dominio] = BANCOS_DOMINIO[chave] || [chave, ''];
      return { chave, nome, dominio, grupo: 'banco', fundo: p.fundo, cor: p.cor, local: true };
    }
    const e = EXTRAS[chave] || LANCAMENTO[chave];
    return e ? Object.assign({ chave }, e) : null;
  }

  /** Estabelecimento de um lançamento ("PG *NETFLIX.COM 0800", "99APP *VIAGEM").
      Marcas de consumo primeiro; depois lojas, vales e bancos. */
  function porDescricao(texto) {
    const n = norm(texto);
    if (!n) return null;
    for (const k in LANCAMENTO) if (LANCAMENTO[k].re.test(n)) return item(k);
    for (const k in EXTRAS) if (EXTRAS[k].grupo === 'loja' && EXTRAS[k].re.test(n)) return item(k);
    return null;
  }

  const MarcasCentral = Object.freeze({
    CLIENT_ID, EXTRAS, LANCAMENTO, BANCOS_DOMINIO,
    item, porDescricao, logoUrl, normalizar: norm,
    /** Quantas marcas a central conhece, por grupo (para conferência). */
    resumo() {
      const r = { banco: Object.keys(BR.ICONES).length };
      for (const e of Object.values(EXTRAS).concat(Object.values(LANCAMENTO))) r[e.grupo] = (r[e.grupo] || 0) + 1;
      return r;
    }
  });
  global.MarcasCentral = MarcasCentral;

  /* ---------- compatibilidade ----------
     app.js chama MarcasOAZE.forName(descricao) e espera
     { key, svg, bg, fg, kind, url }. Sem desenho local, o svg vira a
     sigla nas cores da marca; url traz a logo remota quando houver. */
  function sigla(texto, cor) {
    const t = String(texto || '?'), fs = t.length <= 1 ? 62 : t.length === 2 ? 48 : t.length === 3 ? 40 : t.length === 4 ? 31 : 25;
    return '<svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="' + fs + '" font-weight="800" fill="' + (cor || 'currentColor') + '">' + t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text></svg>';
  }
  global.MarcasOAZE = Object.freeze({
    forName(name) {
      const m = porDescricao(name);
      if (!m) return null;
      return {
        key: m.chave, nome: m.nome, bg: m.fundo, fg: m.cor, kind: m.grupo, categoria: m.categoria || null,
        svg: m.svg || sigla(m.sigla || m.nome.charAt(0), 'currentColor'),
        url: logoUrl(m, 40)
      };
    }
  });
})(window);

/* Logo remota no selo do lançamento (app.js): se a imagem falhar, ela sai
   e a sigla escondida ao lado aparece. Um ouvinte só, na fase de captura,
   porque "error" de imagem não sobe pela árvore. Sem atributo onerror:
   a política de segurança do app bloqueia script em linha. */
document.addEventListener('error', function (e) {
  const img = e.target;
  if (!img || !img.classList || !img.classList.contains('v3-merchant-img')) return;
  const irmao = img.nextElementSibling;
  if (irmao) irmao.removeAttribute('hidden');
  img.remove();
}, true);
