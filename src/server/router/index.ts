import { authRouter } from './auth';
import { classsessionRouter } from './class-session';
import { paymentRouter } from './payment-router';
import { ratesRouter } from './rates-router';
import { studentRouter } from './student';
import { teacherPaymentRouter } from './teacher-payment-router';
import { teacherRouter } from './teacher-router';
import { router } from './trpc';

export const appRouter = router({
  rates: ratesRouter,
  payments: paymentRouter,
  teacherPayments: teacherPaymentRouter,
  teachers: teacherRouter,
  students: studentRouter,
  classSessions: classsessionRouter,
  auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
