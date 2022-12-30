import {
  addHourPackageZod,
  addHourRateZod,
  hourRateTypeZod,
  includeInactiveFlagZod,
} from 'common';
import { z } from 'zod';
import { privateProcedure, router } from './trpc';

export const ratesRouter = router({
  hourRate: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input: { id } }) => {
      const hourRate = await ctx.prisma.hourRate.findUnique({ where: { id } });
      if (!hourRate) {
        return ctx.res?.status(404).json({ message: 'Not found' });
      }
      return { ...hourRate, rate: hourRate.rate.toNumber() };
    }),
  hourRates: privateProcedure
    .input(hourRateTypeZod.merge(includeInactiveFlagZod))
    .query(async ({ ctx, input: { type, includeInactive = false } }) => {
      const prices = await ctx.prisma.hourRate.findMany({
        where: {
          type,
          isActive: includeInactive ? undefined : true,
        },
      });

      return prices.map((p) => ({ ...p, rate: p.rate.toNumber() }));
    }),
  hourPackage: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input: { id } }) => {
      const hourPackage = await ctx.prisma.hourPackage.findUnique({
        where: { id },
      });
      if (!hourPackage) {
        return ctx.res?.status(404).json({ message: 'Not found' });
      }
      return { ...hourPackage, totalValue: hourPackage.totalValue.toNumber() };
    }),
  hourPackages: privateProcedure
    .input(includeInactiveFlagZod.default({}))
    .query(async ({ ctx, input: { includeInactive = false } }) => {
      const packages = await ctx.prisma.hourPackage.findMany({
        where: includeInactive ? undefined : { isActive: true },
      });
      return packages.map((p) => ({
        ...p,
        totalValue: p.totalValue.toNumber(),
        packHours: p.packHours.toNumber(),
      }));
    }),
  createHourRate: privateProcedure
    .input(hourRateTypeZod.extend(addHourRateZod.shape))
    .mutation(async ({ ctx, input: { type, description, rate } }) => {
      const createdHourRate = await ctx.prisma.hourRate.create({
        data: {
          type,
          description,
          rate,
        },
      });

      return createdHourRate;
    }),
  deleteHourRate: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      const currentHourRate = await ctx.prisma.hourRate.findUnique({
        where: {
          id,
        },
        select: {
          _count: {
            select: {
              classSessions: true,
            },
          },
        },
      });
      if (!currentHourRate?._count.classSessions) {
        return ctx.prisma.hourRate.delete({
          where: {
            id,
          },
        });
      }
      return ctx.prisma.hourRate.update({
        where: {
          id,
        },
        data: {
          isActive: false,
        },
      });
    }),
  editHourRate: privateProcedure
    .input(
      z.object({ id: z.string() }).merge(addHourRateZod).merge(hourRateTypeZod)
    )
    .mutation(async ({ ctx, input: { id, description, rate, type } }) => {
      const updatedHourRate = await ctx.prisma.hourRate.update({
        where: { id },
        data: {
          description,
          rate,
          type,
        },
      });
    }),
  createHourPackage: privateProcedure
    .input(addHourPackageZod)
    .mutation(
      async ({ ctx, input: { description, packHours, totalValue } }) => {
        const newHourPackage = await ctx.prisma.hourPackage.create({
          data: {
            description,
            packHours,
            totalValue,
          },
        });

        return newHourPackage;
      }
    ),
  editHourPackage: privateProcedure
    .input(z.object({ id: z.string() }).merge(addHourPackageZod))
    .mutation(
      async ({ ctx, input: { id, description, packHours, totalValue } }) => {
        const updated = await ctx.prisma.hourPackage.update({
          where: { id },
          data: { description, packHours, totalValue },
        });
        return updated;
      }
    ),
  deleteHourPackage: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      //! no relations mean we can safely delete this field.
      await ctx.prisma.hourPackage.delete({ where: { id } });
    }),
});
