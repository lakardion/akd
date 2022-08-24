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
