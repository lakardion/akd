import { includeInactiveFlagZod, teacherFormZod } from "common";
import { DEFAULT_PAGE_SIZE, getPagination } from "utils/pagination";
import { z } from "zod";
import { createRouter } from "./context";

export const teacherRouter = createRouter()
  .query("teachers", {
    input: z
      .object({
        page: z.number().optional(),
        size: z.number().optional(),
      })
      .merge(includeInactiveFlagZod)
      .default({}),
    async resolve({
      ctx,
      input: { page = 1, size = DEFAULT_PAGE_SIZE, includeInactive = false },
    }) {
      const totalCount = await ctx.prisma.teacher.count({
        where: includeInactive ? undefined : { isActive: true },
      });
      const { count, next, previous } = getPagination({
        count: totalCount,
        page,
        size,
      });
      const teachers = await ctx.prisma.teacher.findMany({
        take: size,
        where: includeInactive ? undefined : { isActive: true },
        orderBy: {
          lastName: "asc",
        },
        skip: (page - 1) * size,
      });

      return {
        count,
        next,
        previous,
        teachers: teachers.map((t) => ({
          ...t,
          balance: t.balance.toNumber(),
        })),
      };
    },
  })
  .query("teacher", {
    input: z.object({ id: z.string() }),
    async resolve({ ctx, input: { id } }) {
      const teacher = await ctx.prisma.teacher.findUnique({ where: { id } });
      return teacher;
    },
  })
  .mutation("edit", {
    input: z.object({ id: z.string() }).extend(teacherFormZod.shape),
    async resolve({ ctx, input: { id, name, lastName } }) {
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
    },
  })
  .mutation("delete", {
    input: z.object({ id: z.string() }),
    async resolve({ ctx, input: { id } }) {
      //! dont delete if they have relations, set them inactive instead
      const teacher = await ctx.prisma.teacher.findUnique({
        where: { id },
        select: {
          _count: {
            select: {
              classSessions: true,
              TeacherPayment: true,
            },
          },
        },
      });
      if (teacher?._count.TeacherPayment || teacher?._count.classSessions) {
        return ctx.prisma.teacher.update({
          where: { id },
          data: { isActive: false },
        });
      }
      return ctx.prisma.teacher.delete({ where: { id } });
    },
  })
  .mutation("create", {
    input: teacherFormZod,
    async resolve({ ctx, input: { name, lastName } }) {
      const created = await ctx.prisma.teacher.create({
        data: { name, lastName },
      });
      return created;
    },
  });
