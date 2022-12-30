import { adminProcedure, router } from './trpc';

export const adminRouter = router({
  nukeDatabase: adminProcedure.mutation(async ({ ctx }) => {
    //Chain delete information
    await ctx.prisma.$transaction(async (tsx) => {
      // delete teacher hourrate
      // delete hour rate
      await tsx.hourPackage.deleteMany({});
      // Delete student debts
      await tsx.studentDebt.deleteMany({});
      // delete teacher payments
      await tsx.teacherPayment.deleteMany({});
      // Delete payments
      await tsx.payment.deleteMany({});
      // delete ClassSession
      await tsx.classSession.deleteMany({});
      // delete hour package
      await tsx.hourRate.deleteMany({});
      // delete Teacher
      await tsx.teacher.deleteMany({});
      // delete student
      await tsx.student.deleteMany({});
    });
  }),
});
