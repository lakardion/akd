import { Prisma } from "@prisma/client";
import { includeInactiveFlagZod, studentFormZod } from "common";
import {
  DEFAULT_PAGE_SIZE,
  getPagination,
  paginationZod,
} from "utils/pagination";
import { z } from "zod";
import { createRouter } from "./context";

export const studentRouter = createRouter()
  .query("single", {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ ctx, input: { id } }) {
      const student = await ctx.prisma.student.findUnique({
        where: { id },
      });
      return { ...student, hourBalance: student?.hourBalance.toNumber() };
    },
  })
  .query("allSearch", {
    input: z.object({
      query: z.string().optional(),
      cursor: z
        .object({ page: z.number().optional(), size: z.number().optional() })
        .optional()
        .default({}),
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
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          }
        : undefined;
      const studentsResult = await ctx.prisma.student.findMany({
        where: whereClause,
        skip: (page - 1) * size,
        take: size,
      });
      return {
        nextCursor: studentsResult.length === size ? page + 1 : null,
        students: studentsResult.map((s) => ({
          ...s,
          hourBalance: s.hourBalance.toNumber(),
        })),
      };
    },
  })
  .query("all", {
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
        orderBy: { lastName: "asc" },
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
  .mutation("create", {
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
  .mutation("delete", {
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
  .mutation("edit", {
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
