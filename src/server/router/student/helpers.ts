import { Context } from '../context';

export const getDebtorsStudents =
  (ctx: Context) =>
  async ({ studentIds, hours }: { studentIds: string[]; hours: number }) => {
    return ctx.prisma.student.findMany({
      where: {
        AND: [
          {
            id: {
              in: studentIds,
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
  };
