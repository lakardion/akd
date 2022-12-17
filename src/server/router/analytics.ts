import { Decimal } from '@prisma/client/runtime';
import {
  lastDayOfMonth,
  setDate,
  setDay,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from 'date-fns';
import { getDebtSummary } from './student/helpers';
import { publicProcedure, router } from './trpc';

export const analyticsRouter = router({
  upcomingClasses: publicProcedure.query(async ({ ctx }) => {
    // get list of classes (probably paginate?) that are incoming
    //lets get next classes regardless of pagination right now
    const classes = await ctx.prisma.classSession.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      include: {
        teacher: {
          select: {
            name: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            classSessionStudent: true,
          },
        },
      },
    });
    return classes.map((c) => ({ ...c, hours: c.hours.toNumber() }));
  }),
  /**
   * Gets all debtors from oldest to newest
   */
  debtors: publicProcedure.query(async ({ ctx }) => {
    //im wondering how we would like to display this. I should not care about same student multiple times, the debt should be unified by student rather than
    const debtors = await ctx.prisma.student.findMany({
      where: {
        debts: {
          some: {
            paymentId: null,
          },
        },
      },
      include: {
        debts: {
          where: {
            paymentId: null,
          },
        },
      },
    });

    return debtors.map((d) => {
      return {
        ...d,
        debts: getDebtSummary(d.debts),
      };
    });
  }),
  revenue: publicProcedure.query(async ({ ctx }) => {
    //how do we even get started to get the month revenue?. I think the best way would be to get all payments and get the reduced total.
    const currentMonthInitial = setMilliseconds(
      setSeconds(setMinutes(setHours(setDate(new Date(), 1), 0), 0), 0),
      0
    );
    const currentMonthEnd = lastDayOfMonth(new Date());
    const payments = await ctx.prisma.payment.findMany({
      where: {
        date: {
          gte: currentMonthInitial,
          lte: currentMonthEnd,
        },
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        student: true,
      },
    });

    const paymentsReduced = payments.reduce(
      (res, curr) => {
        res.hours = res.hours.plus(curr.hours);
        res.totalRevenue = res.totalRevenue.plus(curr.value);
        return res;
      },
      {
        hours: new Decimal(0),
        totalRevenue: new Decimal(0),
      }
    );

    return {
      payments,
      monthTotalHours: paymentsReduced.hours.toNumber(),
      monthTotalRevenue: paymentsReduced.totalRevenue.toNumber(),
    };
  }),
  newStudents: publicProcedure.query(async ({ ctx }) => {
    const currentMonthInitial = setMilliseconds(
      setSeconds(setMinutes(setHours(setDate(new Date(), 1), 0), 0), 0),
      0
    );
    const currentMonthEnd = lastDayOfMonth(new Date());
    const newStudents = await ctx.prisma.student.findMany({
      where: {
        classSessionStudent: {
          every: {
            classSession: {
              date: {
                gte: currentMonthInitial,
                lte: currentMonthEnd,
              },
            },
          },
        },
      },
      select: {
        name: true,
        lastName: true,
        id: true,
      },
    });
    return newStudents;
  }),
  recurrentStudents: publicProcedure.query(async ({ ctx }) => {
    const currentMonthInitial = setMilliseconds(
      setSeconds(setMinutes(setHours(setDate(new Date(), 1), 0), 0), 0),
      0
    );
    const currentMonthEnd = lastDayOfMonth(new Date());
    //I want to get those that took classes this month AND previously. I think I need two queries for sure, not completely sure there's a way to do this with a single query
    const recurrentStudents = await ctx.prisma.student.findMany({
      where: {
        classSessionStudent: {
          some: {
            AND: [
              {
                classSession: {
                  date: {
                    lt: currentMonthInitial,
                  },
                },
              },
              {
                classSession: {
                  date: {
                    gte: currentMonthInitial,
                    lte: currentMonthEnd,
                  },
                },
              },
            ],
          },
        },
      },
    });
    return recurrentStudents;
  }),
});
