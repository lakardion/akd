import { z } from "zod";

export const studentFormZod = z.object({
  name: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  university: z.string().min(1, "Required"),
  faculty: z.string().min(1, "Required"),
  course: z.string().min(1, "Required"),
});

export type StudentFormInput = z.infer<typeof studentFormZod>;
