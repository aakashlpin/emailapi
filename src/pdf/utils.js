import { RULE_TYPE } from './enums';

export const toArray = (arrayLikeObj) =>
  Object.keys(arrayLikeObj).map((idx) => arrayLikeObj[idx]);

export const getRuleDataFromTable = ({ data: table, rule }) => {
  const [header, ...rows] = toArray(table);
  if (!rows.length) {
    return null;
  }

  if (rule.type === RULE_TYPE.INCLUDE_ROWS) {
    if (!rule.where.length) {
      return table;
    }
    const applicableWhereRules = rule.where.filter(
      (whereRule) => whereRule.type,
    );

    if (!applicableWhereRules.length) {
      return table;
    }

    const filteredRowsTuple = rows
      .map((row, rowIdx) => {
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
        const matchingRow = cellChecks.every((check) => check);
        if (matchingRow) {
          console.log({ row, rowIdx });
          return [row, rowIdx];
        }
        return null;
      })
      .filter((item) => item);

    if (!filteredRowsTuple.length) {
      return null;
    }

    return {
      rows: [header, ...filteredRowsTuple.map((tuple) => tuple[0])],
      rowIndexes: filteredRowsTuple.map((tuple) => tuple[1] + 1), // +1 to accommodate for header row,
    };
  }

  if (rule.type === RULE_TYPE.INCLUDE_CELLS) {
    if (!(Array.isArray(rule.cells) && rule.cells.length)) {
      return table;
    }

    // [TODO] fill this
  }
};
