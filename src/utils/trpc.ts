// src/utils/trpc.ts
import type { AppRouter } from '../server/router';
import { createReactQueryHooks, httpBatchLink } from '@trpc/react-query';
//TODO: have to use this at some point in the future.
import { createTRPCNext } from '@trpc/next';
import type { inferProcedureOutput, inferProcedureInput } from '@trpc/server';
import { createTRPCProxyClient } from '@trpc/client';
import superjson from 'superjson';
import { getBaseUrl } from './url';
//TODO: use the non-deprecated hook
export const trpc = createReactQueryHooks<AppRouter>();

//TODO:
export const trpcNext = createTRPCNext<AppRouter>({
  config({ ctx }) {
    return {
      links: [httpBatchLink({ url: getBaseUrl() })],
      transformer: superjson,
    };
  },
});

export const trpcProxyClient = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: getBaseUrl() })],
  transformer: superjson,
});

/**
 * This is a helper method to infer the output of a query resolver
 * @example type HelloOutput = inferQueryOutput<'hello'>
 */
export type inferQueryOutput<
  TRouteKey extends keyof AppRouter['_def']['queries']
> = inferProcedureOutput<AppRouter['_def']['queries'][TRouteKey]>;

export type inferQueryInput<
  TRouteKey extends keyof AppRouter['_def']['queries']
> = inferProcedureInput<AppRouter['_def']['queries'][TRouteKey]>;

export type inferMutationOutput<
  TRouteKey extends keyof AppRouter['_def']['mutations']
> = inferProcedureOutput<AppRouter['_def']['mutations'][TRouteKey]>;

export type inferMutationInput<
  TRouteKey extends keyof AppRouter['_def']['mutations']
> = inferProcedureInput<AppRouter['_def']['mutations'][TRouteKey]>;

export const createTRPCVanillaClient = () => {
  return trpc.createClient({
    links: [httpBatchLink({ url: `${getBaseUrl()}/api/trpc` })],
    transformer: superjson,
  });
};
