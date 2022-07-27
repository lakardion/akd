import { paginationZod } from "utils/pagination";
import { identifiableZod } from "utils/server-zods";
import { z } from "zod";
import { createRouter } from "./context";

export const paymentRouter = createRouter()
  .query("byStudent", {
    input: paginationZod.merge(identifiableZod),
    async resolve({ ctx, input: { page, size, id } }) {
      const paymentsByStudent = await ctx.prisma.payment.findMany({
        orderBy: {
          date: "desc",
        },
        where: {
          studentId: id,
        },
        include: {
          hour: true,
        },
      });

      return paymentsByStudent.map((pmbs) => ({
        ...pmbs,
        value: pmbs.value.toNumber(),
        hourValue: pmbs.hour.value.toNumber(),
      }));
    },
  })
  .mutation("create", {
    input: z.object({
      date: z.date(),
      studentId: z.string(),
      hours: z.number(),
      value: z.number(),
    }),
    async resolve({ ctx, input: { date, studentId, hours, value } }) {
      const createdHour = await ctx.prisma.hour.create({
        data: {
          value: hours,
        },
      });

      const created = await ctx.prisma.payment.create({
        data: {
          date,
          value,
          studentId,
          hourId: createdHour.id,
        },
      });
      return created;
    },
  });
