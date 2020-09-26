export const toArray = (arrayLikeObj) =>
  Object.keys(arrayLikeObj).map((idx) => arrayLikeObj[idx]);

export const getRuleDataFromTable = ({ data: table, rule }) => {
  if (!rule.where.length) {
    return table;
  }
  const applicableWhereRules = rule.where.filter((whereRule) => whereRule.type);

  if (!applicableWhereRules.length) {
    return table;
  }

  const [header, ...rows] = toArray(table);

  const filteredRows = rows.filter((row) => {
    const cellChecks = toArray(row).map((cellValue, cellIndex) => {
      const checks = applicableWhereRules.map((where) => {
        let checkPassed = false;
        const {
          colIndex: whereColIndex,
          type: whereType,
          value: whereValue,
        } = where;

        if (whereColIndex && cellIndex !== Number(whereColIndex)) {
          return true;
        }

        switch (whereType) {
          case 'cell_notEmpty': {
            checkPassed = !!cellValue;
            break;
          }
          case 'cell_startsWith': {
            checkPassed = cellValue.startsWith(whereValue);
            break;
          }
          case 'cell_endsWith': {
            checkPassed = cellValue.endsWith(whereValue);
            break;
          }
          case 'cell_equals': {
            checkPassed = cellValue !== whereValue;
            break;
          }
          case 'cell_contains': {
            checkPassed = cellValue.includes(whereValue);
            break;
          }
          default: {
            break;
          }
        }
        return checkPassed;
      });
      return checks.every((check) => check);
    });
    return cellChecks.every((check) => check);
  });

  return [header, ...filteredRows];
};
