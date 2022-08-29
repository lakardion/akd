export const diffStrArrays = (
  newValues: string[],
  oldValues: string[]
): [toCreate: string[], toDelete: string[]] => {
  const oldValuesSet = new Set(oldValues);
  const newValuesSet = new Set(newValues);
  const toRemove: string[] = [];
  const toCreate: string[] = [];

  //? could I do this better without iterating twice?
  newValuesSet.forEach((newValue) => {
    if (!oldValuesSet.has(newValue)) toCreate.push(newValue);
  });
  oldValuesSet.forEach((oldValue) => {
    if (!newValuesSet.has(oldValue)) toRemove.push(oldValue);
  });

  return [toCreate, toRemove];
};

export const removeFromArray = <
  TOriginal extends { id: string },
  TRemove extends { id: string }
>(
  a: TOriginal[],
  b: TRemove[]
): TOriginal[] => {
  const mapped = b.reduce<Record<string, TRemove>>((res, curr) => {
    res[curr.id] = curr;
    return res;
  }, {});

  return a.flatMap((el) => (mapped[el.id] ? [] : el));
};

export const removeFromArrayStr = (a: string[], b: string[]): string[] => {
  const mapped = b.reduce<Record<string, string>>((res, curr) => {
    res[curr] = curr;
    return res;
  }, {});

  return a.flatMap((el) => (mapped[el] ? [] : [el]));
};
