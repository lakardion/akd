import { Spinner } from 'components/spinner';
import { trpc } from 'utils/trpc';

export const NewStudentsCard = () => {
  const { data: newStudents, isLoading } =
    trpc.analytics.newStudents.useQuery();
  if (isLoading) {
    return (
      <section className="flex h-full w-full items-center justify-center">
        <Spinner size="md" />
      </section>
    );
  }
  if (!newStudents?.length) {
    return (
      <section className="flex w-full justify-center">
        <p className="italic">No hubo nuevos estudiantes este mes</p>
      </section>
    );
  }
  return (
    <section className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-center gap-2">
        <h1 className="text-slate-500">Total</h1>
        <p className="text-lg font-bold">{newStudents?.length}</p>
      </div>
      <ul className="flex max-h-56 flex-col gap-2 overflow-auto">
        {newStudents?.map((ns) => (
          <li
            key={ns.id}
            className="flex items-center justify-center border border-slate-400 p-3"
          >
            <section>
              {ns.name} {ns.lastName}
            </section>
          </li>
        ))}
      </ul>
    </section>
  );
};
