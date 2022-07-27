import { identifiableZod } from "utils/server-zods";
import { z } from "zod";
import { createRouter } from "./context";

export const classSessionRouter = createRouter()
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
  });
