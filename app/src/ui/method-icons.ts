import type { Method } from '../domain/types';
import type { IconName } from './Icon';

export const METHOD_ICON: Record<Method, IconName> = {
  pix: 'qr-code', cartao_fisico: 'credit-card', cartao_virtual: 'smartphone', dinheiro: 'banknote',
  boleto: 'barcode', debito_automatico: 'refresh-cw', transferencia: 'landmark', deposito: 'piggy-bank',
  nao_informado: 'circle-ellipsis',
};
