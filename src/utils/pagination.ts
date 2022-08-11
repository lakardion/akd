import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { z } from 'zod';

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

export const usePaginationHandlers = ({
  setPage,
  totalPages,
  nextPage,
  previousPage,
}: {
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  nextPage?: number | null;
  previousPage?: number | null;
}) => {
  const goFirstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);
  const goPreviousPage = useCallback(() => {
    previousPage && setPage(previousPage);
  }, [previousPage, setPage]);
  const goNextPage = useCallback(() => {
    nextPage && setPage(nextPage);
  }, [nextPage, setPage]);
  const goLastPage = useCallback(() => {
    setPage(totalPages);
  }, [setPage, totalPages]);

  return useMemo(
    () => ({
      goFirstPage,
      goPreviousPage,
      goNextPage,
      goLastPage,
    }),
    [goFirstPage, goLastPage, goNextPage, goPreviousPage]
  );
};

export const paginationZod = z.object({
  page: z.number().optional(),
  size: z.number().optional(),
});
