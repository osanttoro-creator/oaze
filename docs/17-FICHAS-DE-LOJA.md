# Fichas de loja — Google Play e Microsoft Store

Material pronto para colar nos dois painéis, escrito a partir do que o código
faz em 25/10/2026, não do que o produto pretende fazer. Onde um campo depende de
decisão ou de dado que só o Jonatham tem, está marcado **🟡 falta decidir** — não
preencher por suposição: formulário de dados errado numa loja de app financeiro
é motivo de suspensão, não de correção.

Uma advertência que vale para os dois formulários de privacidade: **a resposta
muda conforme a sincronização esteja ligada ou desligada no build enviado.**
Hoje `VITE_OAZE_SYNC_ENABLED=false`, e com ela desligada nenhum dado financeiro
sai do aparelho. As respostas abaixo estão escritas para esse build. Ao ligar a
sincronização, voltar aqui e refazer a seção de dados antes de enviar.

## 1. Identificação comum

| Campo | Valor |
| --- | --- |
| Nome | OAZE |
| Identificador Android | `site.oaze.app` |
| Identificador desktop | `site.oaze.app` |
| Categoria | Finanças |
| Classificação pretendida | livre para todos os públicos |
| Política de privacidade | https://oaze.site/privacidade |
| Termos | https://oaze.site/termos |
| Suporte | https://oaze.site/suporte |
| E-mail de contato | 🟡 falta decidir — o endereço que vai aparecer público na ficha |

## 2. Textos

**Nome curto (Play, até 30 caracteres)**

```
OAZE — finanças pessoais
```

**Descrição curta (Play, até 80 caracteres)**

```
Contas, cartões, faturas, metas e investimentos numa visão só.
```

**Descrição completa (Play, até 4000 caracteres; serve também para a Microsoft Store)**

```
O OAZE reúne num só lugar o que normalmente fica espalhado: saldo das contas,
faturas dos cartões, lançamentos fixos, metas e investimentos.

O que você encontra
• Carteira com contas e cartões, fatura por fatura, sem somar duas vezes o que
  já foi pago.
• Agenda financeira em ano, mês e semana, com vencimentos e recorrências.
• Metas com acompanhamento de depósitos e progresso.
• Categorias de despesa e de receita, com o mês comparado ao anterior.
• Lembretes locais de fatura e de lançamento fixo.
• Relatórios e o OAZE Score.

Funciona sem conta
Você pode organizar seus dados neste aparelho sem criar uma conta.
O login com sua conta OAZE está disponível, mas a sincronização dos dados
financeiros entre aparelhos ainda não está ativa nesta versão de teste.

Onde seus dados ficam
No Android, o conteúdo fica cifrado com chave guardada no Keystore do aparelho.
No Windows, cifrado com chave no Gerenciador de Credenciais. Se o cofre do
sistema não abrir, o app para e explica em vez de guardar seus dados sem
proteção.

Acessibilidade
Navegação por teclado, foco visível, alvos de toque de 44 px, respeito às
preferências de movimento reduzido e de contraste, e tipografia que acompanha o
tamanho de fonte do sistema. Nenhuma informação depende só de cor.

Você pode apagar sua conta e todos os dados dela de dentro do aplicativo, em
Conta → Excluir conta.
```

🟡 falta decidir: se a ficha vai mencionar plano pago. A tela Plano existe no
app, mas a cobrança dentro do aplicativo **não foi validada** em nenhuma das
duas lojas. Anunciar assinatura na ficha sem o fluxo de compra da loja
funcionando é declaração falsa. Enquanto isso, a ficha fala do produto, não do
preço.

## 3. Play Console — formulário de Segurança de dados

Respostas para o build com sincronização **desligada**.

### Coleta e compartilhamento

| Tipo de dado | Coletado? | Compartilhado? | Obrigatório? | Finalidade |
| --- | --- | --- | --- | --- |
| E-mail | **sim** | não | **opcional** — o app funciona sem conta | gerenciamento da conta |
| Nome | sim, se o provedor de login enviar | não | opcional | gerenciamento da conta |
| Informações financeiras do usuário | **não** | não | — | ficam no aparelho; nada sai com a sincronização desligada |
| Forma de pagamento | não | não | — | o app não recebe dado de cartão de pagamento |
| ID do dispositivo | **sim, só se a pessoa ligar lembretes por push** | não | opcional | o token de push, para entregar o aviso |
| Registros de erro | **não** | não | — | o envio existe no código mas nasce desligado e exige consentimento |
| Localização, contatos, fotos, áudio, arquivos | não | não | — | o app não pede nenhuma dessas permissões |

### Práticas de segurança

- **Dados cifrados em trânsito:** sim — todo tráfego é HTTPS/WSS para o Supabase.
- **Jeito de pedir exclusão dos dados:** dentro do app, em Conta → Excluir
  conta. Confirmar o resultado no ambiente de produção antes de preencher a
  declaração da loja.
- **URL de exclusão de conta:** 🟡 falta decidir — o Play pede uma página web
  para quem já desinstalou. Hoje a exclusão só existe dentro do app e em
  `oaze.site`; confirmar qual endereço informar.
- **Dados retidos após exclusão:** não, exceto o registro de trava de exclusão
  que o próprio processo grava para impedir reentrada.
- **Compromisso com a política de famílias:** não se aplica — o app não é
  dirigido a crianças.

### Declaração de recursos financeiros

🟡 falta decidir. O Play exige a declaração de "Financial features" para apps da
categoria Finanças. O OAZE organiza dados que a própria pessoa informa: não
empresta dinheiro, não intermedia pagamento, não negocia cripto e não é
instituição financeira. A resposta provável é **nenhuma das categorias**, mas a
tela Investimentos lê cotações e a tela Plano fala de assinatura — confirmar as
duas antes de marcar, porque esta declaração é verificada.

## 4. Play Console — classificação de conteúdo (IARC)

| Pergunta | Resposta |
| --- | --- |
| Violência, sexo, linguagem, drogas, terror | não para todas |
| Jogos de azar ou simulação de aposta | não |
| Compartilha conteúdo criado por usuários | não |
| Permite comunicação entre usuários | não |
| Compartilha localização | não |
| Permite compras digitais | 🟡 falta decidir — depende da decisão sobre plano |
| Coleta dado pessoal | sim: e-mail, e só com conta |

## 5. Microsoft Store — ficha do produto

| Campo | Valor |
| --- | --- |
| Nome do produto | OAZE |
| Tipo de produto | aplicativo empacotado (MSIX) |
| Categoria | Finanças |
| Idioma da ficha | Português (Brasil) |
| Classificação etária | responder o questionário da IARC igual ao do Play |
| Requisitos de sistema | Windows 10 versão 1809 (build 17763) ou mais novo, 64 bits |

**Dependência que o manifesto não declara: WebView2.** O pacote conta com o
WebView2 Evergreen, que já vem no Windows 11 e chega ao Windows 10 pelo Edge.
Num Windows 10 sem ele, o app abre e fecha sem mensagem. Se isso aparecer em
teste, a saída é embutir o WebView2 de versão fixa no pacote — é troca de
configuração, não reescrita.

Os três valores de identidade do pacote (`MSSTORE_IDENTITY_NAME`,
`MSSTORE_IDENTITY_PUBLISHER`, `MSSTORE_PUBLISHER_DISPLAY_NAME`) saem do próprio
Partner Center, em **o produto → Product management → Product identity**, e vão
para as variáveis do repositório. O Partner Center compara o manifesto caractere
por caractere: maiúscula e pontuação contam.

## 6. Capturas de tela

Nenhuma das duas lojas aceita arte promocional no lugar de captura real.

| Loja | O que é exigido |
| --- | --- |
| Play | ao menos 2 capturas de telefone, 16:9 ou 9:16, lado maior entre 320 e 3840 px; ícone 512×512 PNG; banner 1024×500 |
| Microsoft Store | ao menos 1 captura 1366×768 ou maior, PNG |

Telas que mostram o produto sem expor número real: Início, Carteira, Agenda,
Metas, Relatórios. **Capturar com os dados de exemplo, nunca com dados reais de
pessoa.** A entrada "Ver com dados de exemplo" não aparece em build de
produção; para capturar, usar `npm run dev` com `?demo`.

## 7. Ordem de envio

1. Criar o produto nos dois painéis e reservar o nome. Só então existem os
   valores de identidade da Microsoft e a chave de assinatura do Play.
2. Gerar a chave de upload do Android e cadastrar os quatro segredos
   (`docs/12-PUBLICACAO.md`).
3. Rodar `App · Android (Google Play)` e `App · Windows (Microsoft Store)` no
   canal **teste**.
4. Instalar os dois pacotes em aparelho e máquina reais e percorrer: primeira
   abertura, PIN, login com e-mail, login com Google voltando por `oaze://auth`,
   lançamento, fatura, agenda, lembrete, exclusão de conta.
5. Capturar as telas a partir do build instalado.
6. Preencher os formulários acima com o que o build instalado realmente faz.
7. Enviar pelo canal de testes de cada loja antes de qualquer envio público.
