import { PaymentMethodType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { includeInactiveFlagZod, studentFormZod } from 'common';
import { isMatch } from 'date-fns';
import { getMonthEdges } from 'utils/date';
import {
  DEFAULT_PAGE_SIZE,
  getPagination,
  paginationZod,
} from 'utils/pagination';
import { infiniteCursorZod } from 'utils/server-zods';
import { z } from 'zod';
import { createRouter } from './context';

export const studentRouter = createRouter()
  .query('checkDebtors', {
    input: z.object({
      students: z.array(z.string()),
      hours: z.number(),
    }),
    async resolve({ ctx, input: { hours, students } }) {
      // should I check each student individually?.
      const debtors = await ctx.prisma.student.findMany({
        where: {
          AND: [
            {
              id: {
                in: students,
              },
            },
            {
              hourBalance: {
                lt: hours,
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          lastName: true,
          hourBalance: true,
        },
      });

      const decimalHours = new Decimal(hours);

      return debtors.map((d) => ({
        studentId: d.id,
        studentFullName: `${d.name} ${d.lastName}`,
        hours: decimalHours.minus(d.hourBalance).toNumber(),
      }));
    },
  })
  .query('history', {
    input: z.object({
      studentId: z.string(),
      month: z.string().refine((value) => {
        return isMatch(value, 'yy-MM');
      }),
    }),
    async resolve({ ctx, input: { studentId, month } }) {
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

          date: true,
          hour: {
            select: {
              value: true,
            },
          },
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
            hours: cs.hour.value.toNumber(),
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
          hour: { select: { value: true } },
          paymentMethod: true,
          value: true,
        },
      });
      const paymentsMapped = payments.map<StudentHistoryEntry>((p) => ({
        date: p.date,
        payment: {
          amount: p.value.toNumber(),
          hours: p.hour.value.toNumber(),
          id: p.id,
          type: p.paymentMethod,
        },
      }));
      const merged = classSessionsMapped.concat(paymentsMapped);
      merged.sort((a, b) => (a > b ? -1 : 1));
      return merged;
    },
  })
  .query('single', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ ctx, input: { id } }) {
      const student = await ctx.prisma.student.findUnique({
        where: { id },
        include:{
          debts:{
            where:{
              payment:{
                is:null
              }
            }
          }
        }
      });
      const totalDebt = student?.debts.reduce<Decimal>((res,curr)=>{
        res.plus(curr.hours.times(curr.rate))
        return res
      },new Decimal(0))
      return { ...student,debts:totalDebt?.toNumber() ,hourBalance: student?.hourBalance.toNumber() };
    },
  })
  .query('allSearch', {
    input: z.object({
      query: z.string().optional(),
      cursor: infiniteCursorZod,
    }),
    async resolve({
      ctx,
      input: {
        cursor: { page = 1, size = DEFAULT_PAGE_SIZE },
        query,
      },
    }) {
      const whereClause: Prisma.StudentWhereInput | undefined = query
        ? {
            OR: [
              {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: query,
                  mode: 'insensitive',
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
      });
      return {
        size,
        nextCursor: studentsResult.length === size ? page + 1 : null,
        students: studentsResult.map((s) => ({
          ...s,
          hourBalance: s.hourBalance.toNumber(),
        })),
      };
    },
  })
  .query('all', {
    input: includeInactiveFlagZod.merge(paginationZod).default({}),
    async resolve({
      ctx,
      input: { page = 1, size = DEFAULT_PAGE_SIZE, includeInactive = false },
    }) {
      const totalPages = await ctx.prisma.student.count();
      const { count, next, previous } = getPagination({
        count: totalPages,
        size,
        page,
      });
      const students = await ctx.prisma.student.findMany({
        orderBy: { lastName: 'asc' },
        take: size,
        skip: (page - 1) * size,
        where: includeInactive
          ? undefined
          : {
              isActive: true,
            },
      });
      return {
        count,
        next,
        previous,
        students: students.map((s) => ({
          ...s,
          hourBalance: s.hourBalance.toNumber(),
        })),
      };
    },
  })
  .mutation('create', {
    input: studentFormZod,
    async resolve({
      ctx,
      input: { course, faculty, lastName, name, university },
    }) {
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
    },
  })
  .mutation('delete', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ ctx, input: { id } }) {
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
      return ctx.prisma.student.delete({ where: { id } });
    },
  })
  .mutation('edit', {
    input: z
      .object({
        id: z.string(),
      })
      .merge(studentFormZod),
    async resolve({
      ctx,
      input: { course, faculty, lastName, name, id, university },
    }) {
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
    },
  })
