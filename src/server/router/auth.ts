import { privateProcedure, publicProcedure, router } from './trpc';

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => ctx.session),
  getSecretMessage: privateProcedure.query(
    ({ ctx }) => 'You are logged in and can see this secret message!'
  ),
});
