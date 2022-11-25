// src/server/router/index.ts
import superjson from 'superjson';
import { createRouter } from './context';

import { authRouter } from './auth';
import { ratesRouter } from './rates-router';
import { studentRouter } from './student';
import { teacherRouter } from './teacher-router';
import { paymentRouter } from './payment-router';
import { teacherPaymentRouter } from './teacher-payment-router';
import { classSessionRouter } from './class-session';

export const appRouter = createRouter()
  .transformer(superjson)
  .merge('auth.', authRouter)
  .merge('students.', studentRouter)
  .merge('teachers.', teacherRouter)
  .merge('rates.', ratesRouter)
  .merge('classSessions.', classSessionRouter)
  .merge('payments.', paymentRouter)
  .merge('teacherPayments.', teacherPaymentRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
