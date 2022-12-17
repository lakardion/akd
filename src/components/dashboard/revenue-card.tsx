import { Spinner } from 'components/spinner';
import { trpc } from 'utils/trpc';

export const RevenueCard = () => {
  const { data: revenue, isLoading } = trpc.analytics.revenue.useQuery();
  if (isLoading) {
    return (
      <section className="items=center flex justify-center">
        <Spinner size="md" />
      </section>
    );
  }
  return (
    <section className="flex gap-3">
      <section>
        <h1 className="text-center text-slate-400">Total recaudado</h1>
        <p className="text-center text-xl font-bold">
          $ {revenue?.monthTotalRevenue}
        </p>
      </section>
      <section>
        <h1 className="text-center text-slate-400">Total horas</h1>
        <p className="text-center text-xl font-bold">
          {revenue?.monthTotalHours}
        </p>
      </section>
    </section>
  );
};
