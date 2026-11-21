# Ficha da Google Play (Play Console)

Campo por campo da **Ficha da loja principal**. Os limites de caracteres foram contados por
script em 17/09/2026. Os textos longos são iguais nas três lojas: se mudar um, mude nos outros.

> **Antes de colar:** as linhas da seção "NO CELULAR" e a frase sobre autorizar a UGLEZ só
> valem se essas funções estiverem no build enviado.

## Detalhes do app

| Campo | Valor | Limite |
|---|---|---|
| Nome do app | `OAZE — organize seu dinheiro` | 28 de 30 |
| Descrição curta | `Contas, cartões, faturas, orçamento e metas num só lugar, com a UGLEZ ao lado.` | 78 de 80 |
| Categoria | Finanças | — |
| Tags | Escolha até 5 da lista da Google que descrevam controle de gastos, orçamento e finanças pessoais | — |
| E-mail de contato | `suporte@oaze.site` | — |
| Site | `https://oaze.site` | — |
| Telefone | Opcional. Se preencher, use um número da empresa | — |

### Descrição completa (1.586 de 4.000)

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
• Bloqueio com a biometria do aparelho
• Lembretes de vencimento de fatura e de contas previstas, calculados no próprio aparelho
• Atalhos no ícone para lançar uma despesa ou uma receita

SEUS DADOS
• Use sem criar conta: os dados ficam só no aparelho
• Com conta, tudo sincroniza entre celular, tablet e computador
• Tema claro, escuro ou o do sistema
• A conta pode ser excluída pelo próprio app
```

**O que não pode aparecer na ficha:**

- preço, nome de plano pago, "assine" ou link de compra: o app Android não vende nada e não
  leva a compra fora da Google Play;
- depoimento, número de usuários, "o melhor" ou "nº 1": a política de metadados da Google
  proíbe, e o OAZE não inventa prova social.

## Notas da versão (212 de 500)

Vão em Teste e lançamento → Produção → Criar versão.

```text
Primeira versão do OAZE para Android: contas, cartões, faturas, orçamento, metas, investimentos e calendário, com bloqueio por biometria, lembretes de vencimento, atalhos no ícone e sincronização com a sua conta.
```

## Gráficos

| Item | Especificação | Quantidade |
|---|---|---|
| Ícone do app | 512 × 512, PNG de 32 bits, até 1 MB. Base: `assets/img/oaze-512.png` | 1 |
| Gráfico de destaque | 1024 × 500, JPG ou PNG de 24 bits, sem transparência | 1, obrigatório |
| Capturas do celular | Retrato 9:16. Cada lado entre 320 e 3.840 px. JPG ou PNG de 24 bits. Para aparecer em recomendações: pelo menos 4, com no mínimo 1080 px | 2 a 8 |
| Capturas de tablet de 7" e 10" | Opcionais. Recomendadas, porque o layout do OAZE responde à largura | até 8 cada |
| Vídeo | Opcional, link do YouTube | 1 |

### Gráfico de destaque (1024 × 500)

- O medalhão do coqueiro sobre o fundo petróleo `#071822`, com "OAZE" e a frase "Seu mês inteiro
  num só lugar".
- Sem captura de tela dentro, sem ouro fora do acento e sem brilho: a identidade v1 guarda a luz
  para a UGLEZ.
- A Google corta as bordas em alguns lugares. Deixe o texto no centro, longe das margens.

### Sequência sugerida de capturas

A mesma da Apple, com dados de demonstração e nunca dados reais de alguém. Legendas com a
identidade v1: tokens de `DESIGN.md`, Newsreader nos títulos e IBM Plex Sans no texto.

| # | Tela | Legenda |
|---|---|---|
| 1 | Início: saldo total e a curva do ano | O mês inteiro num só lugar |
| 2 | Carteira: cartões com a fatura aberta | Cartões e faturas sem surpresa |
| 3 | Financeiro: débito e crédito separados | Débito e crédito, cada um no seu lugar |
| 4 | Calendário do mês | O que vence e o que entra |
| 5 | UGLEZ: uma pergunta e a resposta | Pergunte à UGLEZ sobre o seu mês |
| 6 | Metas e orçamento | Metas e orçamento do seu jeito |
| 7 | Pedido de biometria sobre o medalhão | Protegido pela sua biometria |
