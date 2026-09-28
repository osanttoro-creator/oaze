/** Valores monetários são sempre centavos inteiros: float não guarda dinheiro. */
export type Cents = number;
/** YYYY-MM-DD */
export type ISODate = string;
/** YYYY-MM */
export type YM = string;
export type ID = string;

export type Kind = 'income' | 'expense' | 'transfer';

export type Method =
  | 'pix'
  | 'cartao_fisico'
  | 'cartao_virtual'
  | 'dinheiro'
  | 'boleto'
  | 'debito_automatico'
  | 'transferencia'
  | 'deposito'
  /** Vindo do OAZE 1, que não registrava a forma de pagamento. */
  | 'nao_informado';

export type Network = 'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Hipercard';

export interface Account {
  id: ID;
  name: string;
  bank: string;
  /** Conta corrente com cartão de débito vira um cartão na carteira. */
  debitCard?: { last4: string; network: Network | ''; validThru: string };
  /** Índice em CARD_GRADIENTS. */
  tint?: number;
  openingBalance: Cents;
  openedAt: ISODate;
  archived?: boolean;
  /** false = conta de terceiros/empresa: tem extrato, mas fica fora dos totais. */
  counted?: boolean;
}

export interface Card {
  id: ID;
  name: string;
  bank: string;
  last4: string;
  /** Vazio quando veio do OAZE 1, que não guardava bandeira. */
  network: Network | '';
  validThru: string;
  holder: string;
  tint?: number;
  limit: Cents;
  closingDay: number;
  dueDay: number;
  /** Conta de onde a fatura costuma ser paga. */
  accountId?: ID;
  counted?: boolean;
  archived?: boolean;
}

export interface Category {
  id: ID;
  name: string;
  kind: 'income' | 'expense';
  icon: string;
}

export interface Occurrence {
  confirmed?: boolean;
  amount?: Cents;
  skipped?: boolean;
}

export interface Transaction {
  id: ID;
  kind: Kind;
  description: string;
  amount: Cents;
  date: ISODate;
  categoryId?: ID;
  method: Method;
  /** Débito: conta de onde saiu. Receita: conta onde entrou. Transferência: origem. */
  accountId?: ID;
  toAccountId?: ID;
  /** Presente só quando a compra foi no crédito. */
  cardId?: ID;
  confirmed: boolean;
  /** Lançamento fixo: um molde que gera uma ocorrência por mês. */
  recurring?: { endYM?: YM; occ: Record<YM, Occurrence> };
  installment?: { index: number; total: number; groupId: ID };
  origin: 'manual' | 'coco' | 'importado';
  createdAt: string;
}

export interface InvoicePayment {
  id: ID;
  at: ISODate;
  amount: Cents;
  accountId?: ID;
}

export interface InvoiceRecord {
  payments: InvoicePayment[];
  settled?: boolean;
}

export type InvestmentType = 'tesouro' | 'cdb' | 'fii' | 'acoes' | 'outros';

export interface Investment {
  id: ID;
  name: string;
  type: InvestmentType;
  amount: Cents;
  date: ISODate;
  /** % ao ano */
  annualRate: number;
  currentValue?: Cents;
  accountId?: ID;
}

export interface GoalDeposit {
  id: ID;
  at: ISODate;
  amount: Cents;
  accountId?: ID;
}

export interface Goal {
  id: ID;
  name: string;
  target: Cents;
  startedAt: ISODate;
  deadline: YM;
  icon: string;
  deposits: GoalDeposit[];
}

export interface CategoryRule {
  id: ID;
  merchantKey: string;
  kind: 'income' | 'expense';
  categoryId: ID;
  confirmedAt: string;
}

export interface MemoryItem {
  id: ID;
  title: string;
  detail: string;
  source: 'regra' | 'padrao' | 'voce-disse';
  createdAt: string;
}

export type RecurrenceDecision = 'accepted' | 'dismissed';

export interface Workspace {
  id: ID;
  name: string;
  /** Espaço de exemplo: nunca sincroniza nem mistura com dado real. */
  demo?: boolean;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  invoices: Record<string, InvoiceRecord>;
  investments: Investment[];
  goals: Goal[];
  budgets: Record<ID, Cents>;
  automation: {
    categoryRules: CategoryRule[];
    recurrenceDecisions: Record<string, RecurrenceDecision>;
  };
  /** Memória explícita da Coco neste espaço: cada item mostra origem e pode ser esquecido. */
  coco: { memory: MemoryItem[] };
}
