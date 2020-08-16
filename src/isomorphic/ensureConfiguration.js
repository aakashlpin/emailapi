const ensureConfiguration = (data, config) => {
  if (Object.keys(data).every((key) => !data[key])) {
    // ensure that if no key contains data, then you return false
    return false;
  }

  if (!config.fields.length) {
    return false;
  }

  return config.fields
    .filter((field) => field)
    .every((field) => {
      if (!data[field.fieldKey]) {
        return false;
      }
      return true;
    });
};

export default ensureConfiguration;
