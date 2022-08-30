import { PaymentMethodType, Student, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { includeInactiveFlagZod, studentFormZod } from 'common';
import { isMatch } from 'date-fns';
import { removeFromArray, removeFromArrayStr } from 'utils';
import { getMonthEdges } from 'utils/date';
import {
  DEFAULT_PAGE_SIZE,
  getPagination,
  paginationZod,
} from 'utils/pagination';
import { infiniteCursorZod } from 'utils/server-zods';
import { z } from 'zod';
import { createRouter } from '../context';
import { getDebtorsStudents } from './helpers';

export const studentRouter = createRouter()
  .query('checkDebtors', {
    input: z.object({
      studentIds: z.array(z.string()),
      hours: z.number(),
      classSessionId: z.string().optional(),
    }),
    async resolve({ ctx, input: { hours, studentIds, classSessionId } }) {
      const decimalHours = new Decimal(hours);
      if (classSessionId) {
        //get classSession
        const classSession = await ctx.prisma.classSession.findUnique({
          where: { id: classSessionId },
          include: {
            hour: { select: { value: true } },
            classSessionStudent: {
              select: {
                student: true,
              },
            },
            studentDebts: true,
          },
        });
        const previousStudentsLookup =
          classSession?.classSessionStudent?.reduce<Record<string, Student>>(
            (res, curr) => {
              res[curr.student.id] = curr.student;
              return res;
            },
            {}
          );

        const realHours = classSession?.hour?.value?.toNumber() ?? 0;
        if (realHours !== hours) {
          //reevaluate with new hours whether they'll still be debtors or not
          const stillDebtors =
            classSession?.studentDebts.flatMap((sd) => {
              //not interested in the previous debtors from class, only the ones we're asking for
              const student = previousStudentsLookup?.[sd.studentId];
              if (!student) return [];
              // this is not precisely the hour balance but instead how many hours can be restored if this debt were to be nullified
              const previousExceedingBalance = classSession.hour.value.minus(
                sd.hours
              );
              const buffedHourBalance = student.hourBalance.plus(
                previousExceedingBalance
              );
              if (buffedHourBalance.lessThan(hours)) {
                //remap the hourBalance so we properly report of how much the debt is going to be for the student
                return [
                  {
                    ...student,
                    hourBalance: buffedHourBalance,
                    previousRate: sd.rate,
                  },
                ];
              }
              return [];
            }) ?? [];
          const previousDebtors =
            classSession?.studentDebts.map((sd) => sd.studentId) ?? [];
          const previousStudents =
            classSession?.classSessionStudent.map((css) => css.student.id) ??
            [];
          const studentsThatUsedHours = removeFromArrayStr(
            previousStudents,
            previousDebtors
          ).flatMap((s) => {
            //we know for sure that it has to exist bc we took it from there
            const student = previousStudentsLookup?.[s];
            if (!student) return [];
            const buffedHourBalance = student?.hourBalance.plus(
              classSession?.hour.value ?? 0
            );

            return buffedHourBalance?.lessThan(hours)
              ? [
                  {
                    ...student,
                    hourBalance: buffedHourBalance,
                  },
                ]
              : [];
          });
          const newStudents = removeFromArrayStr(studentIds, [
            ...previousDebtors,
            ...previousStudents,
          ]);
          const newStudentDebtors = await getDebtorsStudents(ctx)({
            studentIds: newStudents,
            hours,
          });
          const merged: {
            id: string;
            name: string;
            lastName: string;
            hourBalance: Decimal;
            previousRate?: Decimal;
          }[] = [
            ...stillDebtors,
            ...newStudentDebtors,
            ...studentsThatUsedHours,
          ];

          return merged.map((d) => ({
            studentId: d.id,
            studentFullName: `${d.name} ${d.lastName}`,
            hours: decimalHours.minus(d.hourBalance),
            previousRate: d?.previousRate?.toNumber(),
          }));
        }
      }
      // should I check each student individually?.
      const debtors = await getDebtorsStudents(ctx)({ studentIds, hours });

      return debtors.map((d) => ({
        studentId: d.id,
        studentFullName: `${d.name} ${d.lastName}`,
        hours: decimalHours.minus(d.hourBalance).toNumber(),
        previousRate: undefined,
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
      const totalDebt = student?.debts.reduce<Decimal>((res, curr) => {
        res = res.plus(curr.hours.times(curr.rate));
        return res;
      }, new Decimal(0));

      return {
        ...student,
        debts: totalDebt?.toNumber(),
        hourBalance: student?.hourBalance.toNumber(),
      };
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
        include: {
          debts: {
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
  });
