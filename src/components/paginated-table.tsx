import { FC, ReactNode } from 'react';

/**
 * I want to be able to get this work
 */
export const PaginatedContainer: FC<{
  children: ReactNode;
  paginationControls: {
    total: number;
    hasNextPage: boolean;
    fetchNextPage: () => void;
    page: number;
  };
}> = ({ children, paginationControls }) => {
  return (
    <>
      <section aria-label="pagination controls"></section>
      <section aria-label="table items">{children}</section>
    </>
  );
};
