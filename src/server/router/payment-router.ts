import { PaymentMethodType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { paginationZod } from 'utils/pagination';
import { identifiableZod } from 'utils/server-zods';
import { z } from 'zod';
import { createRouter } from './context';

export const paymentRouter = createRouter()
  .query('byStudent', {
    input: paginationZod.merge(identifiableZod),
    async resolve({ ctx, input: { page, size, id } }) {
      const paymentsByStudent = await ctx.prisma.payment.findMany({
        orderBy: {
          date: 'desc',
        },
        where: {
          studentId: id,
        },
      });

      return paymentsByStudent.map((pmbs) => ({
        ...pmbs,
        value: pmbs.value.toNumber(),
        hourValue: pmbs.hours.toNumber(),
      }));
    },
  })
  .mutation('payDebtTotal', {
    input: z.object({
      date: z.date(),
      studentId: z.string(),
      paymentMethod: z.enum([
        PaymentMethodType.CASH,
        PaymentMethodType.TRANSFER,
      ]),
    }),
    async resolve({ ctx, input: { date, paymentMethod, studentId } }) {
      const debtsToBePaid = await ctx.prisma.studentDebt.findMany({
        where: { studentId },
      });

      if (!debtsToBePaid?.length)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This student has no debts',
        });

      // Each of the debts should have its own payment (may change this in the future if this becomes an unnecessary complexity)
      await Promise.all(
        debtsToBePaid.map(async (d) => {
          return ctx.prisma.$transaction(async ($tsx) => {
            const paymentResult = await $tsx.payment.create({
              data: {
                date,
                studentId,
                value: d.hours.times(d.rate).toNumber(),
                hours: d.hours.toNumber(),
                paymentMethod: paymentMethod,
              },
            });
            await $tsx.studentDebt.update({
              where: {
                id: d.id,
              },
              data: {
                paymentId: paymentResult.id,
              },
            });
          });
        })
      );
    },
  })
  .mutation('create', {
    input: z.object({
      date: z.date(),
      studentId: z.string(),
      hours: z.number(),
      value: z.number(),
      paymentMethod: z.enum([
        PaymentMethodType.CASH,
        PaymentMethodType.TRANSFER,
      ]),
    }),
    async resolve({
      ctx,
      input: { date, studentId, hours, value, paymentMethod },
    }) {
      //! this is not fully transactional. But I don't seem to be able to do the creating on the fly rather than do it sequentially
      const [createdPayment] = await ctx.prisma.$transaction([
        ctx.prisma.payment.create({
          data: {
            date,
            value,
            studentId,
            hours,
            paymentMethod: paymentMethod,
          },
        }),
        ctx.prisma.student.update({
          where: { id: studentId },
          data: {
            hourBalance: {
              increment: hours,
            },
          },
        }),
      ]);
      return createdPayment;
    },
  });
