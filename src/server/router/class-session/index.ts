import { StudentDebt } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { diffStrArraysImproved } from 'utils';
import { DEFAULT_PAGE_SIZE } from 'utils/pagination';
import { identifiableZod, infiniteCursorZod } from 'utils/server-zods';
import { z } from 'zod';
import { createRouter } from '../context';
import {
  addressDebt,
  calculatedDebtZod,
  updateDebtorsHourBalance,
} from './helpers';

export const classSessionRouter = createRouter()
  .query('paginated', {
    input: z.object({
      studentId: z.string().optional(),
      teacherId: z.string().optional(),
      page: z.number(),
      size: z.number().optional(),
    }),
    async resolve({
      ctx,
      input: { page, size = DEFAULT_PAGE_SIZE, studentId, teacherId },
    }) {
      const classSessionSubQuery = teacherId
        ? {
            teacherId,
          }
        : undefined;
      const classSessionStudentQuery = {
        some:
          teacherId || studentId
            ? {
                classSession: classSessionSubQuery,
                studentId,
              }
            : undefined,
      };
      const totalRecords = await ctx.prisma.classSession.count({
        where: {
          classSessionStudent: classSessionStudentQuery,
        },
        orderBy: {
          date: 'desc',
        },
      });

      const results = await ctx.prisma.classSession.findMany({
        where: {
          classSessionStudent: classSessionStudentQuery,
        },
        orderBy: {
          date: 'desc',
        },
        skip: (page - 1) * size,
        take: size,
        include: {
          _count: {
            select: { classSessionStudent: true },
          },
          teacher: {
            select: {
              name: true,
              lastName: true,
            },
          },
        },
      });

      return {
        page,
        count: totalRecords,
        totalPages: Math.ceil(totalRecords / size),
        nextPage: (page + 1) * size > totalRecords ? null : page + 1,
        previousPage: page - 1 === 0 ? null : page - 1,
        results: results.map((r) => ({
          ...r,
          hours: r.hours.toNumber(),
        })),
      };
    },
  })
  .query('byDate', {
    input: z.object({ from: z.date(), to: z.date() }),
    async resolve({ ctx, input: { from, to } }) {
      return ctx.prisma.classSession.findMany({
        where: {
          date: {
            gte: from,
            lte: to,
          },
        },
        include: {
          teacher: {
            select: {
              name: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      });
    },
  })
  .query('all', {
    input: z.object({
      cursor: infiniteCursorZod,
    }),
    async resolve({
      ctx,
      input: {
        cursor: { page = 1, size = DEFAULT_PAGE_SIZE },
      },
    }) {
      const classSessions = await ctx.prisma.classSession.findMany({
        orderBy: {
          date: 'desc',
        },
        skip: (page - 1) * size,
        take: size,
        include: {
          teacher: true,
          _count: {
            select: {
              classSessionStudent: true,
            },
          },
        },
      });
      return {
        nextCursor: classSessions.length === size ? page + 1 : null,
        classSessions,
      };
    },
  })
  .query('single', {
    input: identifiableZod,
    async resolve({ ctx, input: { id } }) {
      const classSession = await ctx.prisma.classSession.findUnique({
        where: { id },
        include: {
          classSessionStudent: {
            include: {
              student: true,
            },
          },
          teacher: true,
          teacherHourRate: true,
        },
      });
      if (!classSession) return null;
      return {
        id: classSession?.id,
        teacherOption: classSession?.teacher
          ? {
              value: classSession?.teacher.id,
              label: `${classSession?.teacher?.name} ${classSession?.teacher?.lastName}`,
            }
          : undefined,
        date: classSession?.date,
        teacherHourRateOption: classSession?.teacherHourRate
          ? {
              value: classSession?.teacherHourRate.id,
              label: `${classSession?.teacherHourRate.description} (${classSession?.teacherHourRate.rate})`,
            }
          : undefined,
        hour: classSession?.hours.toNumber(),
        studentOptions: classSession?.classSessionStudent?.map((css) => ({
          value: css.studentId,
          label: `${css.student.name} ${css.student.lastName}`,
        })),
      };
    },
  })
  .query('unpaid', {
    input: z.object({ teacherId: z.string() }),
    async resolve({ ctx, input: { teacherId } }) {
      const unpaidClasssSession = await ctx.prisma.classSession.findMany({
        where: {
          teacherPaymentId: null,
          teacherId,
        },
        include: {
          teacher: {
            select: {
              name: true,
              lastName: true,
            },
          },
          teacherHourRate: true,
          _count: {
            select: {
              classSessionStudent: true,
            },
          },
        },
      });

      return unpaidClasssSession.flatMap((ucs) => {
        if (!ucs._count.classSessionStudent) return [];
        return [
          {
            ...ucs,
            teacherHourRate: {
              ...ucs.teacherHourRate,
              rate: ucs.teacherHourRate.rate.toNumber(),
            },
            hours: ucs.hours.toNumber(),
            total: ucs.hours
              .times(ucs._count.classSessionStudent)
              .times(ucs.teacherHourRate.rate)
              .toNumber(),
          },
        ];
      });
    },
  })
  .query('byStudent', {
    input: identifiableZod,
    async resolve({ ctx, input: { id } }) {
      const classSessions = await ctx.prisma.classSession.findMany({
        where: {
          classSessionStudent: {
            some: {
              studentId: id,
            },
          },
        },
        include: {
          teacher: true,
        },
      });
      return classSessions;
    },
  })
  .mutation('update', {
    input: identifiableZod.merge(
      z.object({
        oldStudentIds: z.array(z.string()),
        studentIds: z.array(z.string()),
        date: z.date(),
        teacherId: z.string(),
        teacherHourRateId: z.string(),
        hours: z.number(),
        oldHours: z.number(),
        debts: z.array(calculatedDebtZod).optional(),
      })
    ),
    async resolve({
      ctx,
      input: {
        id,
        studentIds,
        date,
        teacherId,
        teacherHourRateId,
        hours,
        oldHours,
        oldStudentIds,
        debts,
      },
    }) {
      //TODO: idea: remove asking for whole debt and instead request only rates, and merge those in the debts here by calculatin them
      /**
       TODO:do some checking here so that we don't swallow this as total truth.
       The verification should do calculateDebts and verify everything mainly
       */

      //Manage student list change
      const { added, removed } = diffStrArraysImproved(
        studentIds,
        oldStudentIds
      );

      //TODO: Remove hours table which does not make much sense.
      return ctx.prisma.$transaction(async (tsx) => {
        //update hour field
        const haveHoursUpdated = hours !== oldHours;
        if (haveHoursUpdated) {
          await tsx.classSession.update({
            where: {
              id,
            },
            data: {
              hours,
            },
          });
        }
        // update the rest of fields
        await tsx.classSession.update({
          where: {
            id,
          },
          data: {
            teacherId,
            teacherHourRateId,
            date,
            // connect-disconnect students to class
            classSessionStudent: {
              createMany: added.length
                ? { data: added.map((id) => ({ studentId: id })) }
                : undefined,
              deleteMany: removed.length
                ? removed.map((id) => ({ studentId: id }))
                : undefined,
            },
          },
        });

        // Address debts.
        debts &&
          (await Promise.all(
            debts.map(async (d) => {
              d.studentBalanceAction &&
                (await tsx.student.update({
                  where: {
                    id: d.studentId,
                  },
                  data: {
                    hourBalance: d.studentBalanceAction,
                  },
                }));
              await addressDebt(tsx)({
                debtAction: d.debt,
                classSessionId: id,
                studentId: d.studentId,
              });
            })
          ));
      });
    },
  })
  .mutation('create', {
    input: z.object({
      studentIds: z.array(z.string()),
      teacherId: z.string(),
      teacherHourRateId: z.string(),
      date: z.date(),
      hours: z.number(),
      debts: z.array(calculatedDebtZod).optional(),
    }),
    async resolve({
      ctx,
      input: { studentIds, teacherId, teacherHourRateId, date, hours, debts },
    }) {
      //TODO: check debtors somehow
      // if (debtorStudents.length !== 0 && debtCheckedStudents.length !== 0)
      //   throw new TRPCError({
      //     code: 'BAD_REQUEST',
      //     message:
      //       'Some of the students are not debtors and would have gotten debts created',
      //   });

      return await ctx.prisma.$transaction(async (tsx) => {
        //1- Create hour
        //TODO: this will luckily change after we remove th ehour entity
        const classSessionStudent = studentIds.length
          ? {
              createMany: {
                data: studentIds.map((sids) => ({ studentId: sids })),
              },
            }
          : undefined;
        //2 Create class sesssion
        const newClassSession = await ctx.prisma.classSession.create({
          data: {
            date,
            classSessionStudent,
            hours,
            teacherId,
            teacherHourRateId,
          },
        });
        // 3- handle debtors
        // 3- If students were selected in the class then substract from their hours
        if (classSessionStudent) {
          debts &&
            (await Promise.all(
              debts.map(async (d) => {
                //TODO: On create there will only be create actions, no way to update remove or keep. How can I fence this with TS?
                d.studentBalanceAction &&
                  (await tsx.student.update({
                    where: {
                      id: d.studentId,
                    },
                    data: {
                      hourBalance: d.studentBalanceAction,
                    },
                  }));
                await addressDebt(tsx)({
                  debtAction: d.debt,
                  classSessionId: newClassSession.id,
                  studentId: d.studentId,
                });
              })
            ));
        }
        return newClassSession;
      });
    },
  })
  .mutation('delete', {
    input: identifiableZod,
    async resolve({ ctx, input: { id } }) {
      // this must restore hours and remove unpaid debts
      const classSessionStudent =
        (await ctx.prisma.classSessionStudent.findMany({
          where: {
            classSessionId: id,
          },
          include: {
            student: {
              select: {
                id: true,
                //? not sure whether I want to do this here actually...
                debts: {
                  where: {
                    classSessionId: id,
                  },
                },
              },
            },
            classSession: true,
          },
        })) ?? [];
      const [first] = classSessionStudent;
      const hours = first ? first.classSession.hours : new Decimal(0);
      const paidDebtIds: string[] = [];
      const studentsInfo = classSessionStudent.reduce<{
        fresh: string[];
        debtors: { id: string; debt: StudentDebt }[];
      }>(
        (res, curr) => {
          const [debt] = curr.student.debts;
          if (debt) {
            if (debt.paymentId) paidDebtIds.push(debt.id);
            res.debtors.push({ id: curr.studentId, debt });
          } else {
            res.fresh.push(curr.student.id);
          }
          return res;
        },
        { fresh: [], debtors: [] }
      );
      // debtors should be treated the same way.
      const tx = await ctx.prisma.$transaction(async (tsx) => {
        await ctx.prisma.student.updateMany({
          where: {
            id: {
              in: studentsInfo.fresh,
            },
          },
          data: {
            hourBalance: {
              increment: hours,
            },
          },
        });
        //address debt transactions
        await Promise.all(
          updateDebtorsHourBalance(ctx)(studentsInfo.debtors, hours)
        );

        if (paidDebtIds.length) {
          // when there are paid debts, we want to have a registry of them so we should keep the classSession entity
          const updates = await ctx.prisma.classSession.update({
            where: { id },
            data: {
              isActive: false,
              // must also remove the relations so that we don't leave students with this hanging around
              classSessionStudent: {
                disconnect: classSessionStudent.map((css) => ({
                  classSessionId_studentId: {
                    classSessionId: id,
                    studentId: css.studentId,
                  },
                })),
              },
              teacherId: null,
            },
          });
          // unpaid debts have no reason to exist
          const deleteUnpaidDebts = await ctx.prisma.studentDebt.deleteMany({
            where: {
              id: {
                notIn: paidDebtIds,
              },
            },
          });
        } else {
          await ctx.prisma.classSession.delete({
            where: { id },
          });
        }
      });
    },
  })
  .mutation('addStudent', {
    input: z.object({ studentId: z.string(), classSessionId: z.string() }),
    async resolve({ ctx, input: { studentId, classSessionId } }) {
      const classSession = await ctx.prisma.classSession.findUnique({
        where: { id: classSessionId },
      });
      return ctx.prisma.$transaction([
        ctx.prisma.classSessionStudent.create({
          data: {
            classSessionId,
            studentId,
          },
        }),
        ctx.prisma.student.update({
          where: {
            id: studentId,
          },
          data: {
            hourBalance: {
              decrement: classSession?.hours,
            },
          },
        }),
      ]);
    },
  });
