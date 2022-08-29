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

export const getFakeHourPackages = (count) => {
  return [...Array(count).keys()].map(() => ({
    description: faker.commerce.product(),
    packHours: faker.datatype.number({ min: 10, max: 20 }),
    totalValue: faker.datatype.number(),
  }));
};
