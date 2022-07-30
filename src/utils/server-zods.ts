import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "./pagination";

export const identifiableZod = z.object({
  id: z.string(),
});

export const infiniteCursorZod = z
  .object({ page: z.number().optional(), size: z.number().optional() })
  .optional()
  .default({});
