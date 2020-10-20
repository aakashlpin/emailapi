import { RULE_TYPE, CELL_MATCH_TYPE } from './enums';

export const getRuleKey = (rule) =>
  rule.name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s/g, '_');

export const toArray = (arrayLikeObj) =>
  Object.keys(arrayLikeObj).map((idx) => arrayLikeObj[idx]);

export const toObject = (array) =>
  array.reduce((accum, item, idx) => ({ ...accum, [idx]: item }), {});

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
              case CELL_MATCH_TYPE.NOT_EMPTY: {
                checkPassed = !!cellValue;
                break;
              }
              case CELL_MATCH_TYPE.STARTS_WITH: {
                checkPassed = cellValue.startsWith(whereValue);
                break;
              }
              case CELL_MATCH_TYPE.ENDS_WITH: {
                checkPassed = cellValue.endsWith(whereValue);
                break;
              }
              case CELL_MATCH_TYPE.EQUALS: {
                checkPassed = cellValue !== whereValue;
                break;
              }
              case CELL_MATCH_TYPE.CONTAINS: {
                checkPassed = cellValue.includes(whereValue);
                break;
              }
              case CELL_MATCH_TYPE.REGEX: {
                try {
                  // NB: this is within try catch
                  // to ensure an incorrect `whereValue`
                  // while user is entering it in real time
                  // doesn't cause runtime errors
                  const parsedRegex = new RegExp(whereValue, 'g');
                  checkPassed = !!cellValue.match(parsedRegex)?.length;
                } catch (e) {
                  checkPassed = false;
                }
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
