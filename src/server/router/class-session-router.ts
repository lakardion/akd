import { DEFAULT_PAGE_SIZE } from "utils/pagination";
import { identifiableZod, infiniteCursorZod } from "utils/server-zods";
import { z } from "zod";
import { createRouter } from "./context";

export const classSessionRouter = createRouter()
  .query("all", {
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
          date: "desc",
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
  .query("single", {
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
    },
  })
  .query("byStudent", {
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
  .mutation("update", {
    input: z.object({
      studentIds: z.array(z.string()),
      date: z.date(),
      teacherId: z.string(),
      teacherHourRateId: z.string(),
    }),
    async resolve({
      ctx,
      input: { studentIds, date, teacherId, teacherHourRateId },
    }) {
      // const updated = await ctx.prisma.classSession.update({
      //   data: {
      //     classSessionStudent: {
      //       connectOrCreate: [{ create: {} }],
      //     },
      //   },
      // });
    },
  })
  .mutation("create", {
    input: z.object({
      studentIds: z.array(z.string()),
      hourId: z.string(),
      teacherId: z.string(),
      teacherHourRateId: z.string(),
      date: z.date(),
    }),
    async resolve({
      ctx,
      input: { studentIds, hourId, teacherId, teacherHourRateId, date },
    }) {
      const newClassSession = await ctx.prisma.classSession.create({
        data: {
          date,
          classSessionStudent: {
            createMany: {
              data: studentIds.map((sids) => ({ studentId: sids })),
            },
          },
          hourId,
          teacherId,
          teacherHourRateId,
        },
      });
      return newClassSession;
    },
  })
  .mutation("delete", {
    input: identifiableZod,
    async resolve({ ctx, input: { id } }) {
      return ctx.prisma.classSession.delete({
        where: { id },
      });
    },
  });
