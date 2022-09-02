import { StudentDebt } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { Context } from '../context';

export const debtsZod = z.array(
  z.object({
    studentId: z.string(),
    hours: z.number(),
    rate: z.number(),
  })
);

export const validateDebtors =
  (ctx: Context) =>
  async ({
    debts,
    hours,
  }: {
    debts?: z.infer<typeof debtsZod>;
    hours: number;
  }) => {
    const debtorStudents = debts?.map((d) => d.studentId) ?? [];
    const debtCheckedStudents = await ctx.prisma.student.findMany({
      where: {
        id: {
          in: debtorStudents,
        },
        hourBalance: {
          gte: hours,
        },
      },
    });
    if (debtorStudents.length !== 0 && debtCheckedStudents.length !== 0)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'Some of the students are not debtors and would have gotten debts created',
      });
    return;
  };

type Debtor = { id: string; debt: StudentDebt };

//! I dont think this is the way to do things actually
export const updateDebtorsHourBalance =
  (ctx: Context) => (debtors: Debtor[], hours: Decimal) => {
    const transactionPlaceholder = [...Array.from({ length: debtors.length })];
    return transactionPlaceholder.flatMap((_, idx) => {
      const debtor = debtors[idx];
      if (!debtor) return [];
      const { id, debt } = debtor;
      const hourDiff = hours.minus(debt.hours);
      if (hourDiff.equals(0) && !debt.paymentId) return [];
      return ctx.prisma.student.update({
        where: {
          id,
        },
        data: {
          hourBalance: {
            increment: debt.paymentId ? hours : hourDiff,
          },
        },
      });
    });
  };
