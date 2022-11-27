// src/server/router/index.ts
import { createLegacyRouter } from './context';

import { authRouter } from './auth';
import { ratesRouter } from './rates-router';
import { studentRouter } from './student';
import { teacherRouter } from './teacher-router';
import { paymentRouter } from './payment-router';
import { teacherPaymentRouter } from './teacher-payment-router';
import { classSessionRouter } from './class-session';
import { mergeRouters, publicProcedure, router } from './trpc';

const legacyRouter = createLegacyRouter()
  .merge('auth.', authRouter)
  .merge('students.', studentRouter)
  .merge('teachers.', teacherRouter)
  .merge('rates.', ratesRouter)
  .merge('classSessions.', classSessionRouter)
  .merge('payments.', paymentRouter)
  .merge('teacherPayments.', teacherPaymentRouter)
  .interop();

const mainRouter = router({
  greeting: publicProcedure.query(() => 'Hello this is v10'),
});

export const appRouter = mergeRouters(legacyRouter, mainRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
