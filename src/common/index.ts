import { HourRateType } from '@prisma/client';
import { z } from 'zod';

const personZod = z.object({
  name: z.string().min(1, 'Requerido'),
  lastName: z.string().min(1, 'Requerido'),
});

export const studentFormZod = z
  .object({
    university: z.string().min(1, 'Requerido'),
    faculty: z.string().min(1, 'Requerido'),
    course: z.string().min(1, 'Requerido'),
  })
  .merge(personZod);

export type StudentFormInput = z.infer<typeof studentFormZod>;

export const teacherFormZod = personZod;

export type TeacherFormInput = z.infer<typeof teacherFormZod>;

export const describableZod = z.object({
  description: z.string(),
});
export const addHourRateFormZod = z
  .object({
    rate: z.string().refine((value) => {
      if (value === '0') return false;
      return true;
    }, 'Requerido'),
  })
  .merge(describableZod);

export type AddHourRateFormInput = z.infer<typeof addHourRateFormZod>;

export const addHourRateZod = z
  .object({
    rate: z.number().gt(0),
  })
  .merge(describableZod);

export type AddHourRateInput = z.infer<typeof addHourRateZod>;

export const addHourPackageFormZod = z
  .object({
    packHours: z.string().refine((value) => {
      return parseFloat(value) > 1;
    }),
    totalValue: z.string().refine((value) => parseFloat(value) > 0),
  })
  .merge(describableZod);
export type AddHourPackageFormInput = z.infer<typeof addHourPackageFormZod>;

export const addHourPackageZod = z
  .object({
    packHours: z.number().gt(1),
    totalValue: z.number().gt(0),
  })
  .merge(describableZod);
export type AddHourPackageInput = z.infer<typeof addHourPackageZod>;

export const hourRateTypeZod = z.object({
  type: z.enum([HourRateType.TEACHER, HourRateType.STUDENT]),
});
export const includeInactiveFlagZod = z.object({
  includeInactive: z.boolean().optional(),
});
