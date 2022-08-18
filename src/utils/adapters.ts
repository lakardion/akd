import { PaymentMethodType } from '@prisma/client';

export const mapPaymentTypeToLabel: Record<PaymentMethodType, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
};
