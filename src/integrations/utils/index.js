const log = (obj) =>
  typeof obj === 'object'
    ? console.log(JSON.stringify(obj, null, 2))
    : console.log(obj);

const isLengthyArray = (arrayLike) =>
  Array.isArray(arrayLike) && arrayLike.length;

const getSimulationOptions = (query = {}) => {
  const {
    dry_run: dryRun = '0',
    emulate_first_run: emulateFirstRun = '0',
  } = query;

  const isDryRun = !!Number(dryRun);
  const isEmulateFirstRun = !!Number(emulateFirstRun);

  return { isDryRun, isEmulateFirstRun };
};

module.exports = {
  log,
  isLengthyArray,
  getSimulationOptions,
};
