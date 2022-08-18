import { parse } from 'date-fns';

/**
 * Get the initial and last day of a given month
 * @param month a month in yy-MM format
 * @returns
 */
export const getMonthEdges = (
  month: string
): [firstDat: Date, lastDay: Date] => {
  const firstDayOfMonth = parse(month, 'yy-MM', new Date());
  const lastDayOfMonth = new Date(
    firstDayOfMonth.getFullYear(),
    firstDayOfMonth.getMonth() + 1,
    0
  );

  return [firstDayOfMonth, lastDayOfMonth];
};
