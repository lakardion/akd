import { z } from "zod";

export const identifiableZod = z.object({
  id: z.string(),
});
