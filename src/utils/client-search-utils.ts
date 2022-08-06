import { debouncePromiseValue } from './delay';
import { createTRPCVanillaClient } from './trpc';

const searchTeachers = async (value: string) => {
  const client = createTRPCVanillaClient();
  const teachers = await client.query('teachers.search', { query: value });
  return teachers.map((t) => ({
    value: t.id,
    label: `${t.name} ${t.lastName}`,
  }));
};

export const debouncedSearchTeachers: typeof searchTeachers =
  debouncePromiseValue(searchTeachers, 300);

const searchStudents = async (value: string) => {
  const client = createTRPCVanillaClient();
  const { students } = await client.query('students.allSearch', {
    query: value,
  });
  return students.map((s) => ({
    value: s.id,
    label: `${s.lastName} ${s.name}`,
  }));
};

export const debouncedSearchStudents: typeof searchStudents =
  debouncePromiseValue(searchStudents, 300);
