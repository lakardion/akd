import { PaymentMethodType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { studentFormZod } from 'common';
import { isMatch } from 'date-fns';
import { getMonthEdges } from 'utils/date';
import { DEFAULT_PAGE_SIZE } from 'utils/pagination';
import { infiniteCursorZod } from 'utils/server-zods';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { calculateDebt, calculateDebtNewClass } from './helpers';

export const studentRouter = router({
  calculateDebts: publicProcedure
    .input(
      z.object({
        studentIds: z.array(z.string()),
        hours: z.number(),
        classSessionId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input: { hours, studentIds, classSessionId } }) => {
      return classSessionId
        ? calculateDebt(ctx)({ hours, studentIds, classSessionId })
        : calculateDebtNewClass(ctx)({ hours, studentIds });
    }),
  history: publicProcedure
    .input(
      z.object({
        studentId: z.string(),
        month: z.string().refine((value) => {
          return isMatch(value, 'yy-MM');
        }),
      })
    )
    .query(async ({ ctx, input: { studentId, month } }) => {
      const [firstDayOfMonth, lastDayOfMonth] = getMonthEdges(month);
      const classSessions = await ctx.prisma.classSession.findMany({
        where: {
          classSessionStudent: {
            some: {
              studentId,
            },
          },
          date: {
            lte: lastDayOfMonth,
            gte: firstDayOfMonth,
          },
        },
        select: {
          id: true,
          teacher: {
            select: {
              name: true,
              lastName: true,
            },
          },
          hours: true,
          date: true,
        },
      });

      type StudentHistoryEntry =
        | {
            date: Date;
            payment: {
              id: string;
              type: PaymentMethodType;
              amount: number;
              hours: number;
            };
          }
        | {
            date: Date;

            classSession: {
              id: string;
              teacherFullName: string;
              hours: number;
            };
          };
      const classSessionsMapped = classSessions.map<StudentHistoryEntry>(
        (cs) => ({
          date: cs.date,
          classSession: {
            hours: cs.hours.toNumber(),
            id: cs.id,
            teacherFullName: `${cs.teacher?.name} ${cs.teacher?.lastName}`,
          },
        })
      );

      const payments = await ctx.prisma.payment.findMany({
        where: {
          studentId,
          date: {
            lte: lastDayOfMonth,
            gte: firstDayOfMonth,
          },
        },
        select: {
          date: true,
          id: true,
          hours: true,
          paymentMethod: true,
          value: true,
        },
      });
      const paymentsMapped = payments.map<StudentHistoryEntry>((p) => ({
        date: p.date,
        payment: {
          amount: p.value.toNumber(),
          hours: p.hours.toNumber(),
          id: p.id,
          type: p.paymentMethod,
        },
      }));
      const merged = classSessionsMapped.concat(paymentsMapped);
      merged.sort((a, b) => (a > b ? -1 : 1));
      return merged;
    }),
  single: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input: { id } }) => {
      const student = await ctx.prisma.student.findUnique({
        where: { id },
        include: {
          debts: {
            where: {
              payment: {
                is: null,
              },
            },
          },
        },
      });
      const result = student?.debts.reduce<[Decimal, Decimal]>(
        (res, curr) => {
          const [debtAmount, debtHours] = res;
          return [
            debtAmount.plus(curr.hours.times(curr.rate)),
            debtHours.plus(curr.hours),
          ];
        },
        [new Decimal(0), new Decimal(0)]
      );

      return {
        ...student,
        debts:
          result && result?.[0]?.toNumber()
            ? {
                amount: result[0].toNumber(),
                hours: result[1].toNumber(),
              }
            : undefined,
        hourBalance: student?.hourBalance.toNumber(),
      };
    }),
  allSearch: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        cursor: infiniteCursorZod,
      })
    )
    .query(
      async ({
        ctx,
        input: {
          cursor: { page = 1, size = DEFAULT_PAGE_SIZE },
          query,
        },
      }) => {
        const whereClause: Prisma.StudentWhereInput | undefined = query
          ? {
              OR: [
                {
                  name: {
                    contains: query,
                  },
                },
                {
                  lastName: {
                    contains: query,
                  },
                },
              ],
            }
          : undefined;
        const studentsResult = await ctx.prisma.student.findMany({
          where: whereClause,
          skip: (page - 1) * size,
          take: size,
          orderBy: { lastName: 'asc' },
          include: {
            debts: {
              where: {
                payment: {
                  is: null,
                },
              },
              select: {
                hours: true,
                rate: true,
              },
            },
          },
        });
        return {
          size,
          nextCursor: studentsResult.length === size ? page + 1 : null,
          students: studentsResult.map((s) => ({
            ...s,
            totalDebt: s.debts
              .reduce((res, curr) => {
                res = res.plus(curr.hours.times(curr.rate));
                return res;
              }, new Decimal(0))
              .toNumber(),
            hourBalance: s.hourBalance.toNumber(),
          })),
        };
      }
    ),
  create: publicProcedure
    .input(studentFormZod)
    .mutation(
      async ({
        ctx,
        input: { course, faculty, lastName, name, university },
      }) => {
        const newStudent = await ctx.prisma.student.create({
          data: {
            course,
            faculty,
            lastName,
            name,
            university,
          },
        });
        return newStudent;
      }
    ),
  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input: { id } }) => {
      //! must be careful on trying to delete students, since they usually hold a lot of relationships, we might as well allow delete these logically rather than physically.
      const student = await ctx.prisma.student.findUnique({
        where: { id },
        select: {
          _count: {
            select: {
              classSessionStudent: true,
              payments: true,
            },
          },
        },
      });
      if (student?._count.classSessionStudent || student?._count.payments) {
        return ctx.prisma.student.update({
          where: { id },
          data: {
            isActive: false,
          },
        });
      }
      const deleteOperation = await ctx.prisma.student.delete({
        where: { id },
      });

      return deleteOperation;
    }),
  edit: publicProcedure
    .input(
      z
        .object({
          id: z.string(),
        })
        .merge(studentFormZod)
    )
    .mutation(
      async ({
        ctx,
        input: { course, faculty, lastName, name, id, university },
      }) => {
        const editedUser = await ctx.prisma.student.update({
          where: { id },
          data: {
            course,
            faculty,
            lastName,
            name,
            university,
          },
        });
        return editedUser;
      }
    ),
});
