import {
  addHourPackageZod,
  addHourRateZod,
  hourRateTypeZod,
  includeInactiveFlagZod,
} from "common";
import { z } from "zod";
import { createRouter } from "./context";

export const ratesRouter = createRouter()
  .query("hourRate", {
    input: z.object({ id: z.string() }),
    async resolve({ ctx, input: { id } }) {
      const hourRate = await ctx.prisma.hourRate.findUnique({ where: { id } });
      if (!hourRate) {
        return ctx.res?.status(404).json({ message: "Not found" });
      }
      return { ...hourRate, rate: hourRate.rate.toNumber() };
    },
  })
  .query("hourRates", {
    input: hourRateTypeZod.merge(includeInactiveFlagZod),
    async resolve({ ctx, input: { type, includeInactive = false } }) {
      const prices = await ctx.prisma.hourRate.findMany({
        where: {
          type,
          isActive: includeInactive ? undefined : true,
        },
      });

      return prices.map((p) => ({ ...p, rate: p.rate.toNumber() }));
    },
  })
  .query("hourPackage", {
    input: z.object({ id: z.string() }),
    async resolve({ ctx, input: { id } }) {
      const hourPackage = await ctx.prisma.hourPackage.findUnique({
        where: { id },
      });
      if (!hourPackage) {
        return ctx.res?.status(404).json({ message: "Not found" });
      }
      return { ...hourPackage, totalValue: hourPackage.totalValue.toNumber() };
    },
  })
  .query("hourPackages", {
    input: includeInactiveFlagZod.default({}),
    async resolve({ ctx, input: { includeInactive = false } }) {
      const packages = await ctx.prisma.hourPackage.findMany({
        where: includeInactive ? undefined : { isActive: false },
      });
      return packages.map((p) => ({
        ...p,
        totalValue: p.totalValue.toNumber(),
        packHours: p.packHours.toNumber(),
      }));
    },
  })
  .mutation("createHourRate", {
    input: hourRateTypeZod.extend(addHourRateZod.shape),
    async resolve({ ctx, input: { type, description, rate } }) {
      const createdHourRate = await ctx.prisma.hourRate.create({
        data: {
          type,
          description,
          rate,
        },
      });

      return createdHourRate;
    },
  })
  .mutation("deleteHourRate", {
    input: z.object({ id: z.string() }),
    async resolve({ ctx, input: { id } }) {
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
    },
  })
  .mutation("editHourRate", {
    input: z
      .object({ id: z.string() })
      .merge(addHourRateZod)
      .merge(hourRateTypeZod),
    async resolve({ ctx, input: { id, description, rate, type } }) {
      const updatedHourRate = await ctx.prisma.hourRate.update({
        where: { id },
        data: {
          description,
          rate,
          type,
        },
      });
    },
  })
  .mutation("createHourPackage", {
    input: addHourPackageZod,
    async resolve({ ctx, input: { description, packHours, totalValue } }) {
      const newHourPackage = await ctx.prisma.hourPackage.create({
        data: {
          description,
          packHours,
          totalValue,
        },
      });

      return newHourPackage;
    },
  })
  .mutation("editHourPackage", {
    input: z.object({ id: z.string() }).merge(addHourPackageZod),
    async resolve({ ctx, input: { id, description, packHours, totalValue } }) {
      const updated = await ctx.prisma.hourPackage.update({
        where: { id },
        data: { description, packHours, totalValue },
      });
      return updated;
    },
  })
  .mutation("deleteHourPackage", {
    input: z.object({ id: z.string() }),
    async resolve({ ctx, input: { id } }) {
      //! no relations mean we can safely delete this field.
      await ctx.prisma.hourPackage.delete({ where: { id } });
    },
  });
