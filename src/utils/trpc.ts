// src/utils/trpc.ts
import { httpBatchLink } from '@trpc/react-query';
import type { AppRouter } from '../server/router';
import { createTRPCProxyClient, loggerLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import superjson from 'superjson';
import { getBaseUrl } from './url';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        httpBatchLink({ url: `${getBaseUrl()}/api/trpc` }),
      ],
    };
  },
  ssr: false,
});

export const trpcProxyClient = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: getBaseUrl() })],
  transformer: superjson,
});

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
