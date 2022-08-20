import { DEFAULT_PAGE_SIZE } from 'utils/pagination';
import { identifiableZod, infiniteCursorZod } from 'utils/server-zods';
import { z } from 'zod';
import { createRouter } from './context';

const diffStrArrays = (
  newValues: string[],
  oldValues: string[]
): { created: string[]; removed: string[]; untouched: string[] } => {
  const oldIdsSet = new Set(oldValues);
  const idsSet = new Set(newValues);
  const testSet = new Set([...oldValues, ...newValues]);

  const removed: string[] = [];
  const created: string[] = [];
  const untouched: string[] = [];
  testSet.forEach((id) => {
    if (!oldIdsSet.has(id)) created.push(id);
    else if (!idsSet.has(id)) removed.push(id);
    else untouched.push(id);
  });

  return { created, removed, untouched };
};

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
          hour: {
            select: {
              value: true,
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
          hour: { value: r.hour.value.toNumber() },
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
          hour: {
            select: { value: true },
          },
          classSessionStudent: {
            include: {
              student: true,
            },
          },
          teacher: true,
          teacherHourRate: true,
        },
      });

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
        hour: classSession?.hour?.value.toNumber(),
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
          hour: {
            select: {
              value: true,
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
            hour: { value: ucs.hour.value.toNumber() },
            total: ucs.hour.value
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
          hour: true,
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
      },
    }) {
      const { created, removed, untouched } = diffStrArrays(
        studentIds,
        oldStudentIds
      );
      const hourUpdate =
        hours !== oldHours
          ? {
              update: {
                value: hours,
              },
            }
          : undefined;
      const updatedClassSessionsPromise = ctx.prisma.classSession.update({
        where: {
          id,
        },
        data: {
          hour: hourUpdate,
          classSessionStudent: {
            createMany: created.length
              ? { data: created.map((id) => ({ studentId: id })) }
              : undefined,
            deleteMany: removed.length
              ? removed.map((id) => ({ studentId: id }))
              : undefined,
          },
        },
      });
      //update existing
      const updateUntouchedStudentsPromise =
        hours !== oldHours
          ? ctx.prisma.student.updateMany({
              where: {
                id: {
                  in: untouched,
                },
              },
              data: {
                hourBalance: {
                  increment: oldHours - hours,
                },
              },
            })
          : undefined;
      //update created
      //
      const updateCreatedPromise = ctx.prisma.student.updateMany({
        where: {
          id: {
            in: created,
          },
        },
        data: {
          hourBalance: { decrement: hours },
        },
      });
      //update removed
      const updateRemovedPromise = ctx.prisma.student.updateMany({
        where: {
          id: {
            in: removed,
          },
        },
        data: {
          hourBalance: { increment: hours },
        },
      });
      const commitables = updateUntouchedStudentsPromise
        ? [
            updatedClassSessionsPromise,
            updateUntouchedStudentsPromise,
            updateCreatedPromise,
            updateRemovedPromise,
          ]
        : [
            updatedClassSessionsPromise,
            updateCreatedPromise,
            updateRemovedPromise,
          ];
      await ctx.prisma.$transaction(commitables);
    },
  })
  .mutation('create', {
    input: z.object({
      studentIds: z.array(z.string()),
      teacherId: z.string(),
      teacherHourRateId: z.string(),
      date: z.date(),
      hours: z.number(),
      debts: z
        .array(
          z.object({
            studentId: z.string(),
            hours: z.number(),
            rate: z.number(),
          })
        )
        .optional(),
    }),
    async resolve({
      ctx,
      input: { studentIds, teacherId, teacherHourRateId, date, hours, debts },
    }) {
      //TODO: make this a transaction. Double validate debtors in case someone tried to skip FE validation
      //1- Create hour
      const hour = await ctx.prisma.hour.create({
        data: { value: hours },
      });
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
          hourId: hour.id,
          teacherId,
          teacherHourRateId,
        },
      });
      //3- If students were selected in the class then substract from their hours
      if (classSessionStudent) {
        await ctx.prisma.student.updateMany({
          where: {
            id: {
              in: studentIds,
            },
          },
          data: {
            hourBalance: {
              decrement: hours,
            },
          },
        });
      }
      return newClassSession;
    },
  })
  .mutation('delete', {
    input: identifiableZod,
    async resolve({ ctx, input: { id } }) {
      const classSessionStudent = await ctx.prisma.classSessionStudent.findMany(
        {
          where: {
            classSessionId: id,
          },
          include: {
            classSession: {
              include: {
                hour: {
                  select: { value: true },
                },
              },
            },
          },
        }
      );
      return ctx.prisma.$transaction([
        ctx.prisma.student.updateMany({
          where: {
            id: {
              in: classSessionStudent.map((cst) => cst.studentId),
            },
          },
          data: {
            hourBalance: {
              increment: classSessionStudent[0]?.classSession.hour.value,
            },
          },
        }),
        ctx.prisma.classSession.delete({
          where: { id },
        }),
      ]);
    },
  })
  .mutation('addStudent', {
    input: z.object({ studentId: z.string(), classSessionId: z.string() }),
    async resolve({ ctx, input: { studentId, classSessionId } }) {
      const classSession = await ctx.prisma.classSession.findUnique({
        where: { id: classSessionId },
        include: { hour: { select: { value: true } } },
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
              decrement: classSession?.hour.value,
            },
          },
        }),
      ]);
    },
  });
