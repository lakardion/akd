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
