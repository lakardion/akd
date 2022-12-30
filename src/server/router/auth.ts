import { env } from 'server/env.mjs';
import { privateProcedure, publicProcedure, router } from './trpc';

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => ctx.session),
  getPowers: privateProcedure.query(({ ctx }) => {
    const parsed = JSON.parse(env.ADMIN_EMAILS) as string[];
    return { isAdmin: parsed.includes(ctx.session?.user?.email ?? '') };
  }),
});
