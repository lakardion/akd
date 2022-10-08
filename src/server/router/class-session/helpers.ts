import { Prisma, StudentDebt } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { Context } from '../context';

const studentBalanceActionZod = z
  .object({ increment: z.number() })
  .or(z.object({ decrement: z.number() }))
  .or(z.object({ set: z.number() }))
  .optional();

const debtActionZod = z
  .object({
    action: z.literal('create'),
    hours: z.number(),
    rate: z.number().optional(),
  })
  .or(
    z
      .object({
        id: z.string(),
      })
      .and(
        z
          .object({ action: z.literal('keep') })
          .or(z.object({ action: z.literal('remove') }))
          .or(
            z.object({
              action: z.literal('update'),
              hours: z.number(),
              rate: z.number(),
            })
          )
      )
  );
export const calculatedDebtZod = z.object({
  studentId: z.string(),
  studentFullName: z.string(),
  studentBalanceAction: studentBalanceActionZod,
  debt: debtActionZod.optional(),
});

export type StudentBalanceAction = z.infer<typeof studentBalanceActionZod>;
export type DebtAction = z.infer<typeof debtActionZod>;
export type CalculatedDebt = z.infer<typeof calculatedDebtZod>;

export const debtorZod = z.object({
  studentId: z.string(),
  hours: z.number(),
  rate: z.number(),
});

export const debtsZod = z.array(debtorZod);

export const validateDebtors =
  (ctx: Context) =>
  async ({
    debts,
    hours,
  }: {
    debts?: z.infer<typeof debtsZod>;
    hours: number;
  }) => {
    const debtorStudentIds = debts?.map((d) => d.studentId) ?? [];
    const debtCheckedStudents = await ctx.prisma.student.findMany({
      where: {
        id: {
          in: debtorStudentIds,
        },
        hourBalance: {
          gte: hours,
        },
      },
    });
    if (debtorStudentIds.length !== 0 && debtCheckedStudents.length !== 0)
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

export const addressDebt =
  (tsx: Prisma.TransactionClient) =>
  async ({
    debtAction,
    classSessionId,
    studentId,
  }: {
    debtAction?: DebtAction;
    classSessionId: string;
    studentId: string;
  }) => {
    if (debtAction) {
      switch (debtAction.action) {
        case 'create': {
          await tsx.studentDebt.create({
            data: {
              hours: debtAction.hours,
              rate: debtAction.rate ?? 0,
              classSessionId,
              studentId,
            },
          });
          break;
        }
        case 'update': {
          await tsx.studentDebt.update({
            where: {
              id: debtAction.id,
            },
            data: {
              hours: debtAction.hours,
              rate: debtAction.rate,
            },
          });
          break;
        }
        case 'remove': {
          await tsx.studentDebt.delete({
            where: {
              id: debtAction.id,
            },
          });
          break;
        }
        case 'keep': {
          await tsx.studentDebt.update({
            where: {
              id: debtAction.id,
            },
            data: {
              restored: true,
            },
          });
          break;
        }
        default: {
          const neverish: never = debtAction;
        }
      }
    }
  };
