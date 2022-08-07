import { faker } from '@faker-js/faker';

export const getFakeStudents = (count) => {
  return [...Array(count).keys()].map((arr) => ({
    name: faker.name.firstName(),
    lastName: faker.name.lastName(),
    university: faker.company.companyName(),
    faculty: faker.vehicle.manufacturer(),
    course: faker.vehicle.fuel(),
  }));
};
