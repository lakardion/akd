import { Student, StudentDebt } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { TRPCError } from '@trpc/server';
import { diffStrArraysImproved } from 'utils';
import {
  CalculatedDebt,
  DebtAction,
  StudentBalanceAction,
} from '../class-session/helpers';
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

const groupStudentDebtByPaymentStatus = (
  student: Student & { debts: StudentDebt[] }
) =>
  student.debts.reduce<{
    restored: StudentDebt[];
    paid: StudentDebt[];
    unpaid: StudentDebt[];
  }>(
    (res, curr) => {
      if (curr.paymentId) {
        // case 2 - case 1
        curr.restored ? res.restored.push(curr) : res.paid.push(curr);
        return res;
      }
      //case 3
      res.unpaid.push(curr);
      return res;
    },
    { restored: [], paid: [], unpaid: [] }
  );

export const calculateDebtNewClass =
  (ctx: Context) =>
  async ({ studentIds, hours }: { studentIds: string[]; hours: number }) => {
    const newHours = new Decimal(hours);
    const studentById = (
      await ctx.prisma.student.findMany({
        where: {
          id: { in: studentIds },
        },
      })
    ).reduce<Record<string, Student>>((res, s) => {
      res[s.id] = s;
      return res;
    }, {});

    return studentIds.flatMap<CalculatedDebt>((sId) => {
      const student = studentById[sId];
      if (!student) return [];
      const willCreateDebt = newHours.greaterThan(student.hourBalance);
      return [
        willCreateDebt
          ? {
              studentId: sId,
              debt: {
                action: 'create',
                hours: newHours.minus(student.hourBalance).toNumber(),
              },
              studentBalanceAction: {
                set: 0,
              },
              studentFullName: `${student.name} ${student.lastName}`,
            }
          : {
              studentId: sId,
              debt: undefined,
              studentBalanceAction: {
                decrement: newHours.toNumber(),
              },
              studentFullName: `${student.name} ${student.lastName}`,
            },
      ];
    });
  };

/**
 * Calculates student debt and returns a sensible representation of what the updates required are for each of them in terms of their current situtation in the classSession
 */
export const calculateDebt =
  (ctx: Context) =>
  async ({
    studentIds,
    hours,
    classSessionId,
  }: //? maybe we need a rate map here?. But it is quite odd because this is meant to also run without the actual rates there yet.
  {
    studentIds: string[];
    hours: number;
    classSessionId: string;
  }) => {
    const newHours = new Decimal(hours);
    //get all the data we need to do this calculation
    const classSession = await ctx.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: { classSessionStudent: true, studentDebts: true },
    });

    if (!classSession)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'The class session does not exist',
      });

    const currentStudentIds = classSession.classSessionStudent.map(
      (css) => css.studentId
    );

    const { added, removed, untouched } = diffStrArraysImproved(
      studentIds,
      currentStudentIds
    );

    const studentsById = (
      await ctx.prisma.student.findMany({
        where: {
          id: {
            in: studentIds,
          },
        },
        include: {
          debts: true,
        },
      })
    ).reduce<Record<string, Student & { debts: StudentDebt[] }>>(
      (res, curr) => {
        res[curr.id] = curr;
        return res;
      },
      {}
    );

    const removedStudentsById = (
      await ctx.prisma.student.findMany({
        where: {
          id: {
            in: removed,
          },
        },
        include: {
          debts: {
            where: {
              classSessionId,
            },
          },
        },
      })
    ).reduce<Record<string, Student & { debts: StudentDebt[] }>>(
      (res, curr) => {
        res[curr.id] = curr;
        return res;
      },
      {}
    );

    // given hours and studentIds, check which created students will be endebted
    const createdStudents = added.flatMap<CalculatedDebt>((a) => {
      const student = studentsById[a];
      if (!student) return [];
      const studentFullName = `${student.name} ${student.lastName}`;
      const hasEnoughHours = student.hourBalance.greaterThan(newHours);
      const studentBalanceAction: StudentBalanceAction = hasEnoughHours
        ? { decrement: hours }
        : { set: 0 };
      const debt: DebtAction | undefined = hasEnoughHours
        ? undefined
        : {
            action: 'create',
            hours: newHours.minus(student.hourBalance).toNumber(),
          };

      const result: CalculatedDebt = {
        studentId: student.id,
        debt,
        studentBalanceAction,
        studentFullName,
      };
      return [result];
    });
    //Removed ones
    const removedStudents = removed.flatMap<CalculatedDebt>((r) => {
      const student = removedStudentsById[r];
      if (!student) return [];
      const studentFullName = `${student.name} ${student.lastName}`;
      // edge case: user adds student and gets debt, student pays debt, student decides he does not want to be part of the class, debt is kept since it was paid, maybe student wants to come back to class but it has spent its hours somewhere else, then he will have more than one debt for this classSession. We need to account for such a thing
      /**
       * There are three cases here that could happen
       * 1. StudentDebt:paid:not-restored
       * 2. StudentDebt:paid:restored + StudentDebt:unpaid
       * 3. StudentDebt:unpaid
       */
      const { paid, unpaid } = groupStudentDebtByPaymentStatus(student);
      const hasDebt = Boolean(paid.length || unpaid.length);
      if (hasDebt) {
        //each of the paid debts should be returned to their hours
        return paid.concat(unpaid).map<CalculatedDebt>((d) => {
          return d.paymentId
            ? {
                debt: {
                  action: 'keep',
                  id: d.id,
                },
                studentBalanceAction: {
                  increment: classSession.hours.toNumber(),
                },
                studentId: r,
                studentFullName,
              }
            : {
                debt: {
                  action: 'remove',
                  id: d.id,
                },
                studentBalanceAction: undefined,
                studentId: r,
                studentFullName,
              };
        });
      }
      const returnChecked: CalculatedDebt = {
        debt: undefined,
        studentBalanceAction: {
          increment: classSession.hours.toNumber(),
        },
        studentId: student.id,
        studentFullName,
      };
      return [returnChecked];
    });
    //Untouched ones
    const untouchedStudents = untouched.flatMap<CalculatedDebt>((u) => {
      /**
       * These definitely are the hardest ones to calculate.
       * We will have to take into account existing debts and current hourBalance to be able to put up with the variations
       */
      const student = studentsById[u];
      const areHoursTheSame = newHours.equals(classSession.hours);
      // debt has nothing to do if the hours haven't changed from previous commit to class session
      if (!student || areHoursTheSame) {
        return [];
      }
      const haveHoursIncreased = newHours.greaterThan(classSession.hours);
      const { paid, unpaid } = groupStudentDebtByPaymentStatus(student);
      const studentFullName = `${student.name} ${student.lastName}`;
      if (paid.length) {
        const [paidDebt] = paid;
        if (!paidDebt) return [];
        const newBalance = student.hourBalance
          .plus(classSession.hours)
          .minus(newHours);

        if (haveHoursIncreased) {
          return newBalance.isPositive()
            ? [
                {
                  debt: {
                    action: 'keep',
                    id: paidDebt.id,
                  },
                  studentBalanceAction: {
                    increment: classSession.hours.minus(newHours).toNumber(),
                  },
                  studentId: u,
                  studentFullName,
                },
              ]
            : [
                {
                  debt: {
                    action: 'keep',
                    id: paidDebt.id,
                  },
                  studentId: u,
                  studentBalanceAction: undefined,
                  studentFullName,
                },
                {
                  debt: {
                    action: 'create',
                    hours: newBalance.absoluteValue().toNumber(),
                  },
                  studentId: u,
                  studentBalanceAction: {
                    set: 0,
                  },
                  studentFullName,
                },
              ];
        }
        return [
          {
            debt: {
              action: 'keep',
              id: paidDebt.id,
            },
            studentBalanceAction: {
              increment: classSession.hours.minus(newHours).toNumber(),
            },
            studentId: u,
            studentFullName,
          },
        ];
      }
      if (unpaid.length) {
        const [debt] = unpaid;
        if (!debt) return [];
        const hoursSurplus = classSession.hours.minus(debt.hours);
        const newBalance = student.hourBalance
          .plus(hoursSurplus)
          .minus(newHours);
        return newBalance.isPositive()
          ? [
              {
                debt: {
                  action: 'remove',
                  id: debt.id,
                },
                studentId: u,
                studentBalanceAction: {
                  set: newBalance.toNumber(),
                },
                studentFullName,
              },
            ]
          : [
              {
                debt: {
                  action: 'update',
                  hours: newBalance.absoluteValue().toNumber(),
                  id: debt.id,
                  rate: debt.rate.toNumber(),
                },
                studentId: u,
                studentBalanceAction: {
                  set: 0,
                },
                studentFullName,
              },
            ];
      }
      //if there are not any debts, then we just resolve with the student hour balance.
      const willCreateDebt = newHours.greaterThan(student.hourBalance);
      return [
        willCreateDebt
          ? {
              studentId: u,
              debt: {
                action: 'create',
                hours: newHours.minus(student.hourBalance).toNumber(),
              },
              studentBalanceAction: {
                set: 0,
              },
              studentFullName,
            }
          : {
              studentId: u,
              debt: undefined,
              studentBalanceAction: {
                decrement: newHours.toNumber(),
              },
              studentFullName,
            },
      ];
    });

    return [...createdStudents, ...removedStudents, ...untouchedStudents];
  };

export const getDebtSummary = (debts?: StudentDebt[]) => {
  const [amount, hours] = debts?.reduce<[Decimal, Decimal]>(
    (res, curr) => {
      const [debtAmount, debtHours] = res;
      return [
        debtAmount.plus(curr.hours.times(curr.rate)),
        debtHours.plus(curr.hours),
      ];
    },
    [new Decimal(0), new Decimal(0)]
  ) ?? [new Decimal(0), new Decimal(0)];
  const nonZeroResult =
    amount.toNumber() > 0
      ? {
          amount: amount.toNumber(),
          hours: hours.toNumber(),
        }
      : undefined;
  return nonZeroResult;
};
