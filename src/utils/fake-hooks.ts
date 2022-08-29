import { useEffect, useRef } from 'react';
import { getFakeStudents } from './fakes';
import { trpc } from './trpc';

const useRunOnce = (fn: () => void) => {
  const hasRunRef = useRef(false);
  useEffect(() => {
    if (!hasRunRef.current) {
      fn();
      hasRunRef.current = true;
    }
  }, [fn]);
};

export const usePopulateFakeStudents = (amountOfRecords: number) => {
  const { mutateAsync } = trpc.useMutation(['students.create']);

  useRunOnce(() => {
    getFakeStudents(amountOfRecords).forEach((fs) => {
      mutateAsync(fs);
    });
  });
};
