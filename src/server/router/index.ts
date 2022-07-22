// src/server/router/index.ts
import { createRouter } from "./context";
import superjson from "superjson";

import { authRouter } from "./auth";
import { akdRouter } from "./akdRouter";

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("akd.", akdRouter)
  .merge("auth.", authRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
