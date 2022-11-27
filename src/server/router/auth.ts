import { TRPCError } from '@trpc/server';
import { middleware, publicProcedure, router } from './trpc';

const isAdminMiddleware = middleware(async ({ ctx, next }) => {
  // Any queries or mutations after this middleware will
  // raise an error unless there is a current session
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next();
});

/**
 * Use this procedure to define another protecting it with a valid session check
 */
export const privateProcedure = publicProcedure.use(isAdminMiddleware);

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => ctx.session),
  getSecretMessage: privateProcedure.query(
    ({ ctx }) => 'You are logged in and can see this secret message!'
  ),
});
