// src/server/router/index.ts
import superjson from "superjson";
import { createRouter } from "./context";

import { authRouter } from "./auth";
import { ratesRouter } from "./rates-router";
import { studentRouter } from "./student-router";
import { teacherRouter } from "./teacher-router";

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("auth.", authRouter)
  .merge("students.", studentRouter)
  .merge("teachers.", teacherRouter)
  .merge("rates.", ratesRouter);

// export type definition of API
export type AppRouter = typeof appRouter;
