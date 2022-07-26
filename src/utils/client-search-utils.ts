import { debouncePromiseValue } from './delay';
import { trpcProxyClient } from './trpc';

//TODO: this needs a rewrite to adapt it to trpc v10

const searchTeachers = async (value: string) => {
  const teachers = await trpcProxyClient.teachers.search.query({
    query: value,
  });
  return teachers.map((t) => ({
    value: t.id,
    label: `${t.name} ${t.lastName}`,
  }));
};

export const debouncedSearchTeachers: typeof searchTeachers =
  debouncePromiseValue(searchTeachers, 300);

const searchStudents = async (value: string) => {
  const { students } = await trpcProxyClient.students.allSearch.query({
    query: value,
  });
  return students.map((s) => ({
    value: s.id,
    label: `${s.lastName} ${s.name}`,
  }));
};

export const debouncedSearchStudents: typeof searchStudents =
  debouncePromiseValue(searchStudents, 300);
