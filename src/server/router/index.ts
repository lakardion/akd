// src/server/router/index.ts
import { createLegacyRouter } from './context';

import { authRouter } from './auth';
import { classSessionRouter } from './class-session';
import { paymentRouter } from './payment-router';
import { ratesRouter } from './rates-router';
import { studentRouter } from './student';
import { teacherPaymentRouter } from './teacher-payment-router';
import { teacherRouter } from './teacher-router';
import { mergeRouters, router } from './trpc';
import superjson from 'superjson';

const legacyRouter = createLegacyRouter()
  // I love the fact that this is even considered in the type checking. If you don't pass superjson here any dates are inferred as string values. That's neat!
  // However this is footgun I think. I am having a hard time interopping these properly given that we have two routers actually. Probably this works just fine but TS is screaming at me real bad clientside given that dates are not expected to be dates but strings.
  .merge('auth.', authRouter)
  .merge('students.', studentRouter)
  .merge('teachers.', teacherRouter)
  .merge('classSessions.', classSessionRouter)
  .merge('payments.', paymentRouter)
  .merge('teacherPayments.', teacherPaymentRouter)
  .interop();

const mainRouter = router({
  rates: ratesRouter,
});

export const appRouter = mergeRouters(legacyRouter, mainRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
