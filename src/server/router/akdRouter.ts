import { studentFormZod } from "common";
import { z } from "zod";
import { getPagination } from "../../utils/pagination";
import { createRouter } from "./context";

const DEFAULT_PAGE_SIZE = 15;

export const akdRouter = createRouter()
  .query("getStudent", {
    input: z.object({
      studentId: z.string(),
    }),
    async resolve({ ctx, input: { studentId } }) {
      const student = ctx.prisma.student.findUnique({
        where: { id: studentId },
      });
      return student;
    },
  })
  .query("students", {
    input: z
      .object({
        page: z.number().optional(),
        size: z.number().optional(),
        includeInactive: z.boolean().optional(),
      })
      .default({}),
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
  .mutation("createStudent", {
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
  .mutation("deleteStudent", {
    input: z.object({
      studentId: z.string(),
    }),
    async resolve({ ctx, input: { studentId } }) {
      //! must be careful on trying to delete students, since they usually hold a lot of relationships, we might as well allow delete these logically rather than physically.
      const student = await ctx.prisma.student.findUnique({
        where: { id: studentId },
        select: {
          _count: {
            select: {
              ClassSessionStudent: true,
              payments: true,
            },
          },
        },
      });
      if (student?._count.ClassSessionStudent || student?._count.payments) {
        return ctx.prisma.student.update({
          where: { id: studentId },
          data: {
            isActive: false,
          },
        });
      }
      return ctx.prisma.student.delete({ where: { id: studentId } });
    },
  })
  .mutation("editStudent", {
    input: z
      .object({
        studentId: z.string(),
      })
      .extend(studentFormZod.shape),
    async resolve({
      ctx,
      input: { course, faculty, lastName, name, studentId, university },
    }) {
      const editedUser = await ctx.prisma.student.update({
        where: { id: studentId },
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
