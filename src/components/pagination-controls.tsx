import { FC } from 'react';
import {
  MdNavigateBefore,
  MdNavigateNext,
  MdOutlineSkipNext,
  MdOutlineSkipPrevious,
} from 'react-icons/md';

export const PaginationControls: FC<{
  pageInfo: {
    totalPages: number;
    previousPage: number | null;
    nextPage: number | null;
    page: number;
  };
  pageHandlers: {
    goFirst: () => void;
    goLast: () => void;
    goNext: () => void;
    goPrevious: () => void;
  };
  iconSize?: number;
}> = ({
  pageHandlers: { goFirst, goLast, goNext, goPrevious },
  pageInfo: { nextPage, page, previousPage, totalPages },
  iconSize = 30,
}) => {
  return (
    <section
      aria-label="pagination controls"
      className="flex flex-col justify-center w-full items-center gap-2"
    >
      <section className="flex gap-2 py-2">
        <button
          onClick={goFirst}
          type="button"
          disabled={page === 1}
          className="text-primary-300 hover:text-primary-600 disabled:text-blackish-300"
        >
          <MdOutlineSkipPrevious size={iconSize} />
        </button>
        <button
          onClick={goPrevious}
          type="button"
          disabled={Boolean(previousPage)}
          className="text-primary-300 hover:text-primary-600 disabled:text-blackish-300"
        >
          <MdNavigateBefore size={iconSize} />
        </button>
        <p className="text-sm flex items-center">
          Página {page} de {totalPages}
        </p>
        <button
          onClick={goNext}
          type="button"
          disabled={Boolean(nextPage)}
          className="text-primary-300 hover:text-primary-600 disabled:text-blackish-300"
        >
          <MdNavigateNext size={iconSize} />
        </button>
        <button
          onClick={goLast}
          type="button"
          disabled={page === totalPages}
          className="text-primary-300 hover:text-primary-600 disabled:text-blackish-300"
        >
          <MdOutlineSkipNext size={iconSize} />
        </button>
      </section>
    </section>
  );
};
