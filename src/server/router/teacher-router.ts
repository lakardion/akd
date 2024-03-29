import { PaymentMethodType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { includeInactiveFlagZod, teacherFormZod } from 'common';
import { isMatch } from 'date-fns';
import { getMonthEdges } from 'utils/date';
import { DEFAULT_PAGE_SIZE } from 'utils/pagination';
import { identifiableZod, infiniteCursorZod } from 'utils/server-zods';
import { z } from 'zod';
import { privateProcedure, router } from './trpc';

export const teacherRouter = router({
  history: privateProcedure
    .input(
      //lets actually allow only to query by month. It is always going to be a limited amount and we can definitely get that going on the frontend
      z.object({
        teacherId: z.string(),
        month: z.string().refine((value) => {
          return isMatch(value, 'yy-MM');
        }),
      })
    )
    .query(async ({ ctx, input: { teacherId, month } }) => {
      //get all for the month
      const [firstDayOfMonth, lastDayOfMonth] = getMonthEdges(month);
      type TeacherHistoryEntry =
        | {
            date: Date;
            payment: {
              id: string;
              type: PaymentMethodType;
              amount: number;
            };
          }
        | {
            date: Date;

            classSession: {
              id: string;
              studentId: string;
              studentFullName: string;
              hours: number;
            };
          };

      const classSessions = await ctx.prisma.classSession.findMany({
        where: {
          classSessionStudent: {
            some: {
              classSession: {
                teacherId,
                date: {
                  lte: lastDayOfMonth,
                  gte: firstDayOfMonth,
                },
              },
            },
          },
        },
        select: {
          id: true,
          date: true,
          hours: true,
          classSessionStudent: {
            select: {
              student: {
                select: {
                  name: true,
                  lastName: true,
                  id: true,
                },
              },
            },
          },
        },
      });

      const classSessionsResult = classSessions.flatMap<TeacherHistoryEntry>(
        (cs) =>
          cs.classSessionStudent.map((css) => ({
            date: cs.date,
            classSession: {
              id: cs.id,
              hours: cs.hours.toNumber(),
              studentId: css.student.id,
              studentFullName: `${css.student.name} ${css.student.lastName}`,
            },
          }))
      );

      const payments = await ctx.prisma.teacherPayment.findMany({
        where: {
          teacherId,
          date: {
            lte: lastDayOfMonth,
            gte: firstDayOfMonth,
          },
        },
        select: {
          id: true,
          paymentMethod: true,
          value: true,
          date: true,
        },
      });
      const paymentResults = payments.map<TeacherHistoryEntry>((p) => ({
        date: p.date,
        payment: {
          id: p.id,
          amount: p.value.toNumber(),
          type: p.paymentMethod,
        },
      }));
      const merged = [...classSessionsResult, ...paymentResults];
      merged.sort((a, b) => (a.date > b.date ? -1 : 1));
      return merged;
    }),
  count: privateProcedure
    .input(includeInactiveFlagZod.default({}))
    .query(async ({ ctx, input: { includeInactive } }) => {
      return ctx.prisma.teacher.count({
        where: {
          isActive: includeInactive ? undefined : true,
        },
      });
    }),
  search: privateProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input: { query } }) => {
      if (!query)
        return ctx.prisma.teacher.findMany({
          orderBy: { lastName: 'asc' },
          take: 5,
        });
      const foundTeachers = await ctx.prisma.teacher.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query.toLowerCase(),
              },
            },
            {
              lastName: {
                contains: query.toLowerCase(),
              },
            },
          ],
        },
      });
      return foundTeachers;
    }),
  single: privateProcedure
    .input(identifiableZod)
    .query(async ({ ctx, input: { id } }) => {
      const teacher = await ctx.prisma.teacher.findUnique({
        where: { id },
        include: {
          //? not sure whether I should actually move this away to another ep and get the calculation there... doing here for now
          classSessions: {
            where: {
              teacherPaymentId: null,
            },
            include: {
              teacherHourRate: true,
              _count: {
                select: {
                  classSessionStudent: true,
                },
              },
              teacherPayment: true,
            },
          },
        },
      });
      const currentTotal = teacher?.classSessions.reduce(
        (sum, curr) =>
          sum.plus(
            curr.hours
              .times(curr._count.classSessionStudent)
              .times(curr.teacherHourRate.rate)
          ),
        new Decimal(0)
      );
      return { ...teacher, balance: currentTotal?.toNumber() };
    }),
  allSearch: privateProcedure
    .input(
      z.object({
        query: z.string().optional(),
        cursor: infiniteCursorZod,
        size: z.number().optional(),
      })
    )
    .query(
      async ({
        ctx,
        input: {
          cursor: { page = 1, size },
          query,
          size: clientSize = DEFAULT_PAGE_SIZE,
        },
      }) => {
        const limit = size ? size : clientSize;
        const whereClause: Prisma.TeacherWhereInput | undefined = query
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
        const teachers = await ctx.prisma.teacher.findMany({
          where: whereClause,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { lastName: 'asc' },
        });
        return {
          nextCursor: {
            page: teachers.length === size ? page + 1 : null,
            size,
          },
          teachers,
        };
      }
    ),
  teacher: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input: { id } }) => {
      const teacher = await ctx.prisma.teacher.findUnique({ where: { id } });
      return teacher;
    }),
  edit: privateProcedure
    .input(z.object({ id: z.string() }).extend(teacherFormZod.shape))
    .mutation(async ({ ctx, input: { id, name, lastName } }) => {
      const updatedTeacher = await ctx.prisma.teacher.update({
        where: {
          id,
        },
        data: {
          name,
          lastName,
        },
      });
      return updatedTeacher;
    }),
  active: privateProcedure
    .input(z.object({ isActive: z.boolean() }).merge(identifiableZod))
    .mutation(async ({ ctx, input: { isActive, id } }) => {
      return ctx.prisma.teacher.update({
        where: {
          id,
        },
        data: {
          isActive,
        },
      });
    }),
  delete: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      //! dont delete if they have relations, set them inactive instead
      const teacher = await ctx.prisma.teacher.findUnique({
        where: { id },
        select: {
          _count: {
            select: {
              classSessions: true,
              teacherPayment: true,
            },
          },
        },
      });
      if (teacher?._count.teacherPayment || teacher?._count.classSessions) {
        return ctx.prisma.teacher.update({
          where: { id },
          data: { isActive: false },
        });
      }
      return ctx.prisma.teacher.delete({ where: { id } });
    }),
  create: privateProcedure
    .input(teacherFormZod)
    .mutation(async ({ ctx, input: { name, lastName } }) => {
      const created = await ctx.prisma.teacher.create({
        data: { name, lastName },
      });
      return created;
    }),
});
