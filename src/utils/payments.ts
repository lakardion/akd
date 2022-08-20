import { BsCash } from 'react-icons/bs';
import { MdPayment } from 'react-icons/md';
import { IconType } from 'react-icons';
import { PaymentMethodType } from '@prisma/client';

export const iconByPaymentType: Record<PaymentMethodType, IconType> = {
  CASH: BsCash,
  TRANSFER: MdPayment,
};
