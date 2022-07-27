import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 15;

export const getPagination = ({
  count,
  size,
  page,
}: {
  count: number;
  size: number;
  page: number;
}) => {
  const maxPages = Math.ceil(count / size);
  return {
    count,
    next: page + 1 > maxPages ? undefined : page + 1,
    previous: page - 1 === 0 ? undefined : page - 1,
  };
};

export const paginationZod = z.object({
  page: z.number().optional(),
  size: z.number().optional(),
});
