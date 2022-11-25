import { PaymentMethodType } from '@prisma/client';
import { DEFAULT_PAGE_SIZE } from 'utils/pagination';
import { z } from 'zod';
import { createRouter } from './context';

export const teacherPaymentRouter = createRouter()
  .query('all', {
    input: z.object({
      page: z.number(),
      size: z.number().optional(),
      teacherId: z.string().optional(),
    }),
    async resolve({
      ctx,
      input: { page, size = DEFAULT_PAGE_SIZE, teacherId },
    }) {
      const totalRecords = await ctx.prisma.teacherPayment.count({
        where: {
          teacherId,
        },
      });
      const payments = await ctx.prisma.teacherPayment.findMany({
        where: teacherId
          ? {
              teacherId,
            }
          : undefined,
        orderBy: {
          date: 'desc',
        },
        skip: (page - 1) * size,
        take: size,
        select: {
          publicId: true,
          paymentMethod: true,
          date: true,
          teacher: teacherId ? undefined : true,
          value: true,
        },
      });

      return {
        page,
        count: totalRecords,
        totalPages: Math.ceil(totalRecords / size),
        nextPage: (page + 1) * size > totalRecords ? null : page + 1,
        previousPage: page - 1 === 0 ? null : page - 1,
        results: payments.map((p) => ({
          id: p.publicId,
          paymentMethod: p.paymentMethod,
          date: p.date,
          teacher: p.teacher,
          value: p.value.toNumber(),
        })),
      };
    },
  })
  .mutation('create', {
    input: z.object({
      teacherId: z.string(),
      value: z.number(),
      paymentMethod: z.nativeEnum(PaymentMethodType),
      date: z.date(),
      classSessionIds: z.array(z.string()),
    }),
    async resolve({
      ctx,
      input: { paymentMethod, teacherId, value, date, classSessionIds },
    }) {
      //TODO: check whether we can remove balance from teacher. Balance should be the sum of all the classes that are unpaid under their name
      //? What's the point of this transaction if we only have a single thing doing?
      return ctx.prisma.$transaction([
        ctx.prisma.teacherPayment.create({
          data: {
            paymentMethod,
            value,
            teacherId,
            date,
            classSessions: {
              connect: classSessionIds.map((id) => ({ id })),
            },
          },
        }),
      ]);
    },
  });
