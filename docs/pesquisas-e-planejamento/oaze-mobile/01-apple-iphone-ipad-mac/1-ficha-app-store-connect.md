# Ficha da App Store (App Store Connect)

Campo por campo, na ordem das telas. Os limites de caracteres foram contados por script em
17/09/2026. Os textos longos são iguais nas três lojas: se mudar um, mude nos outros.

> **Antes de colar:** as linhas da seção "NO CELULAR" e a frase sobre autorizar a UGLEZ só
> valem se essas funções estiverem no build enviado. O revisor confere.

## Informações do app

| Campo | Valor | Limite |
|---|---|---|
| Nome | `OAZE — organize seu dinheiro` | 28 de 30 |
| Subtítulo | `Finanças pessoais sem planilha` | 30 de 30 |
| Subtítulo, alternativa 1 | `Contas, cartões, metas e IA` | 27 de 30 |
| Subtítulo, alternativa 2 | `Seu mês inteiro num só lugar` | 28 de 30 |
| Categoria principal | Finanças | — |
| Categoria secundária | Produtividade | — |
| Contrato de licença | Contrato padrão da Apple | — |

> Se o campo do subtítulo recusar os 30 caracteres, use a alternativa 2.

### Direitos de conteúdo: pergunta que pede decisão sua

A Apple pergunta se o app contém, mostra ou acessa conteúdo de terceiros. **Resposta honesta:
sim.** A carteira mostra a silhueta e a cor da marca de 41 bancos, do pacote
`@edusites/bancos-brasil`, só para a pessoa reconhecer as próprias contas. A licença MIT do
pacote cobre o código, não as marcas dos bancos (diretriz 5.2.1).

Decida com a revisão jurídica entre:

- manter, como uso para identificar as contas; ou
- trocar pelo ícone genérico de instituição só nos apps.

## Preço e disponibilidade

| Campo | Valor |
|---|---|
| Preço | Gratuito |
| Países | Brasil |
| Apps para iPhone e iPad em Macs com chip Apple | Disponível, depois de testar no Mac |
| Pré-venda | Não |

## Página da versão 1.0.0

### Texto promocional (150 de 170)

```text
Veja o mês inteiro num só lugar: contas, cartões, faturas, metas e investimentos. Use sem cadastro ou entre na conta para sincronizar entre aparelhos.
```

### Descrição (1.582 de 4.000)

```text
O OAZE organiza o seu dinheiro sem planilha. Ele junta o que já aconteceu, o que ainda vai acontecer e o que isso significa para o seu mês.

O QUE VOCÊ ACOMPANHA
• Contas e cartões numa carteira só, com saldo, limite livre e a fatura de cada cartão
• Receitas e despesas separadas em débito e crédito, com o que já foi confirmado e o que ainda está previsto
• Despesas e receitas fixas que se repetem todo mês sem cadastrar de novo
• Faturas com pagamento parcial e compra adiantada
• Orçamento por categoria e metas com aportes
• Investimentos com valor estimado e evolução do patrimônio
• Calendário por semana, mês e ano com o que vence e o que entra
• Categorias com ícone e cor, e análises do período

A CONTA DO MÊS, SEM AMBIGUIDADE
O OAZE separa o saldo do mês, o saldo acumulado e o dinheiro que está de fato nas contas. A compra no cartão entra na data da compra, e pagar a fatura não vira uma despesa a mais.

UGLEZ
Pergunte à UGLEZ sobre o seu mês ou o seu ano. Ela recebe só totais e categorias: nenhuma descrição de lançamento, nome de conta ou de cartão, e-mail ou identificador. Você vê exatamente o que é enviado, e a UGLEZ só é usada depois que você autoriza.

NO CELULAR
• Bloqueio com Face ID ou Touch ID
• Lembretes de vencimento de fatura e de contas previstas, calculados no próprio aparelho
• Atalhos no ícone para lançar uma despesa ou uma receita

SEUS DADOS
• Use sem criar conta: os dados ficam só no aparelho
• Com conta, tudo sincroniza entre celular, tablet e computador
• Tema claro, escuro ou o do sistema
• A conta pode ser excluída pelo próprio app
```

**O que não pode aparecer na ficha nem no app** (diretriz 3.1.3(f)): preço, nome de plano pago,
"assine", "assinatura no site" ou link de compra.

### Palavras-chave (90 de 100)

```text
orçamento,gastos,despesas,cartão de crédito,fatura,metas,investimentos,controle financeiro
```

- Sem espaço depois da vírgula.
- Sem repetir as palavras do nome e do subtítulo, que a Apple já indexa.
- Cabe também se a Apple contar bytes: são 93.

### Outros campos

| Campo | Valor |
|---|---|
| URL de suporte | `https://oaze.site/suporte` |
| URL de marketing | `https://oaze.site` |
| URL da Política de Privacidade (em Privacidade do app) | `https://oaze.site/privacidade` |
| Versão | `1.0.0` |
| Direitos autorais | `2026 RAZÃO SOCIAL DA LTDA` (sem o símbolo ©, que a Apple já exibe) |
| Novidades desta versão | Não existe na primeira versão |

## Imagens

| Item | Especificação oficial | Quantidade |
|---|---|---|
| Ícone | 1024 × 1024, PNG, sem transparência. Vai dentro do build (AppIcon) | 1 |
| Capturas do iPhone 6.9" | 1320 × 2868 (ou 1290 × 2796, ou 1260 × 2736) em retrato. JPG ou PNG, sem transparência | 1 a 10 |
| Capturas do iPad 13" | 2064 × 2752 (ou 2048 × 2732) em retrato | 1 a 10, obrigatório porque o app roda no iPad |
| Vídeo de prévia | Opcional | até 3 |

A Apple reduz sozinha as capturas desses dois tamanhos para os aparelhos menores.

### Sequência sugerida de capturas

Todas com dados de demonstração, nunca dados reais de alguém. Legenda no topo, com a
identidade v1: tokens de `DESIGN.md`, Newsreader nos títulos e IBM Plex Sans no texto.

| # | Tela | Legenda |
|---|---|---|
| 1 | Início: saldo total e a curva do ano | O mês inteiro num só lugar |
| 2 | Carteira: cartões com a fatura aberta | Cartões e faturas sem surpresa |
| 3 | Financeiro: débito e crédito separados | Débito e crédito, cada um no seu lugar |
| 4 | Calendário do mês | O que vence e o que entra |
| 5 | UGLEZ: uma pergunta e a resposta | Pergunte à UGLEZ sobre o seu mês |
| 6 | Metas e orçamento | Metas e orçamento do seu jeito |
| 7 | Tela do Face ID sobre o medalhão | Protegido com Face ID |
