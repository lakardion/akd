import { MdPeopleOutline } from 'react-icons/md';
import { trpc } from 'utils/trpc';

export const RecurrentStudentsCard = () => {
  const { data: recurrentStudents } =
    trpc.analytics.recurrentStudents.useQuery();
  return (
    <section className="flex w-full items-center justify-center gap-2">
      <p className="text-xl font-bold">{recurrentStudents?.length ?? 0}</p>
      <MdPeopleOutline size={25} />
    </section>
  );
};
