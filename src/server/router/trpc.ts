import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  // Optional:
  errorFormatter({ shape }) {
    return {
      ...shape,
      data: {
        ...shape.data,
      },
    };
  },
});

const isAdminMiddleware = t.middleware(async ({ ctx, next }) => {
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
export const privateProcedure = t.procedure.use(isAdminMiddleware);
/**
 * We recommend only exporting the functionality that we
 * use so we can enforce which base procedures should be used
 **/
export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
