import React from 'react';
import { defaultsDeep } from 'lodash';
import { RULE_TYPE, CELL_MATCH_TYPE } from '../../../src/pdf/enums';
import { Button, FlexEnds } from '~/components/common/Atoms';
import { getRuleDataFromTable } from '../../../src/pdf/utils';
import Grid from './Grid';

/**
 *
 * rule = {
 *  type: 'row_whitelist',
 *  name: 'Futures trading',
 *  camelot_method: 'lattice',
 *  probable_table_sequence: 4,
 *  table_column_count: 14,
 *  remoteSync: {
 *    googleSheet: {id: '123143_23424113'}
 *  },
 *  where: [{
 *    type: 'equals/startsWith/endsWith/contains',
 *    value: 'value',
 *    colIndex: 2
 *  }]
 * }
 */

const ExtractionRules = ({ extractedTablesFromPDF, rules, setRules }) => {
  function handleAddAnotherCellCheck({ ruleId }) {
    setRules(
      rules.map((rule, idx) =>
        ruleId !== idx
          ? rule
          : {
              ...rule,
              where: [
                ...rule.where,
                {
                  type: '',
                  value: '',
                  colIndex: null,
                },
              ],
            },
      ),
    );
  }

  function onClickRemoveCheck({ ruleId, whereId }) {
    setRules(
      rules.map((rule, idx) =>
        ruleId !== idx
          ? rule
          : {
              ...rule,
              where: rule.where.filter((_, whereIdx) => whereId !== whereIdx),
            },
      ),
    );
  }

  function onClickRemoveCell({ ruleId, cellId }) {
    setRules(
      rules.map((rule, idx) =>
        ruleId !== idx
          ? rule
          : {
              ...rule,
              cells: rule.cells.filter((_, cellIdx) => cellId !== cellIdx),
            },
      ),
    );
  }

  function setRuleProp({ ruleId, ...prop }) {
    const getUpdatedRule = (rule) => {
      const updatedRule = defaultsDeep(prop, rule);
      return updatedRule;
    };

    setRules(
      rules.map((rule, idx) => (ruleId !== idx ? rule : getUpdatedRule(rule))),
    );
  }

  function setKeyPairAtWhere({ ruleId, whereId, ...props }) {
    setRules(
      rules.map((rule, idx) =>
        ruleId !== idx
          ? rule
          : {
              ...rule,
              where: rule.where.map((whereRule, whereIdx) =>
                whereId !== whereIdx
                  ? whereRule
                  : {
                      ...whereRule,
                      ...props,
                    },
              ),
            },
      ),
    );
  }

  function setColIndexOnWhereRule({ colIndex, ruleId, whereId }) {
    setKeyPairAtWhere({ ruleId, whereId, colIndex });
  }

  function setWhereRuleType({ type, ruleId, whereId }) {
    setKeyPairAtWhere({ ruleId, whereId, type });
  }

  function setWhereValue({ value, ruleId, whereId }) {
    setKeyPairAtWhere({ value, whereId, ruleId });
  }

  function onClickSelectTable({ ruleId, id }) {
    setRuleProp({
      ruleId,
      selectedTableId: id,
      selectedTableData: extractedTablesFromPDF[id],
    });
  }

  function onClickCell({ ruleId, ...clickedCellProps }) {
    setRules(
      rules.map((rule, idx) =>
        ruleId !== idx
          ? rule
          : {
              ...rule,
              cells: [...rule.cells, clickedCellProps],
            },
      ),
    );
  }

  function onSelectExtractionType({ ruleId, type }) {
    let props = {};
    switch (type) {
      case RULE_TYPE.INCLUDE_ROWS: {
        props = {
          where: [],
          remoteSync: {
            googleSheet: {
              // NB: leaving it open to accept sheet tabs as an user input as well
              id: null,
            },
          },
        };
        break;
      }
      case RULE_TYPE.INCLUDE_CELLS: {
        props = {
          cells: [],
        };
        break;
      }
      default: {
        break;
      }
    }

    setRuleProp({
      ruleId,
      type,
      ...props,
    });
  }

  function setKeyPairAtCell({ ruleId, cellId, ...props }) {
    setRules(
      rules.map((rule, idx) =>
        ruleId !== idx
          ? rule
          : {
              ...rule,
              cells: rule.cells.map((cellRule, cellIdx) =>
                cellId !== cellIdx
                  ? cellRule
                  : {
                      ...cellRule,
                      ...props,
                    },
              ),
            },
      ),
    );
  }

  return (
    <div className="mb-8">
      {rules.map((rule, ruleId) => {
        if (!rule.selectedTableId) {
          return (
            <div className="mb-12 border-l-4 border-orange-300 pl-4 pt-1">
              <span className="font-bold block mb-2">
                Select a table and setup extraction rules:
              </span>

              {extractedTablesFromPDF.map((table, idx) => {
                return (
                  <div key={`table_${idx}`} className="mb-4">
                    <Button
                      className="text-sm"
                      onClick={() => onClickSelectTable({ ruleId, id: idx })}
                    >
                      Select table #{idx + 1}
                    </Button>
                    <Grid data={table} />
                  </div>
                );
              })}
            </div>
          );
        }

        const selectedTableData = extractedTablesFromPDF[rule.selectedTableId];
        const ruleDataFromTable = getRuleDataFromTable({
          data: selectedTableData,
          rule,
        });

        console.log({ ruleDataFromTable });

        return (
          <div
            className="mb-12 border-l-4 border-orange-300 pl-4 pt-1"
            key={`rule_${ruleId}`}
          >
            <label htmlFor={`rule${ruleId}_name`}>
              <span className="font-bold">Rule Name:</span>
              <input
                type="text"
                id={`rule${ruleId}_name`}
                value={rule.name}
                onChange={(e) => setRuleProp({ ruleId, name: e.target.value })}
                className="mb-4 block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              />
            </label>
            <label htmlFor={`rule${ruleId}_name`}>
              <span className="font-bold">Extraction type:</span>
              <select
                className="mb-4 border border-1 block"
                value={rule.type}
                onChange={(e) =>
                  onSelectExtractionType({ ruleId, type: e.target.value })
                }
              >
                <option value={RULE_TYPE.INCLUDE_ROWS}>Extract Rows</option>
                <option value={RULE_TYPE.INCLUDE_CELLS}>Extract Cells</option>
              </select>{' '}
            </label>
            <Grid
              className="mb-4"
              data={selectedTableData}
              isCellClickable={rule.type === RULE_TYPE.INCLUDE_CELLS}
              cellClickCb={(props) => onClickCell({ ruleId, ...props })}
              selectedRows={ruleDataFromTable?.rowIndexes}
            />
            {rule.type === RULE_TYPE.INCLUDE_ROWS ? (
              <div className="mb-12">
                <div className="bg-orange-100 -ml-4 -mr-3 p-1 border-radius-1 pl-4 pr-3 pt-4 mb-2">
                  <span className="font-bold">Define Cell Rules:</span>
                  {rule.where.map((whereRule, whereId) => (
                    <FlexEnds className="mb-2" key={`whererule_${whereId}`}>
                      <div>
                        <span>
                          {whereId + 1}. if cell value at column index
                        </span>{' '}
                        <input
                          type="text"
                          className="border border-1 p-1 w-8"
                          value={whereRule.colIndex}
                          onChange={(e) =>
                            setColIndexOnWhereRule({
                              colIndex: e.target.value,
                              ruleId,
                              whereId,
                            })
                          }
                        />{' '}
                        <select
                          className="border border-1 p-1 w-40"
                          value={whereRule.type}
                          onChange={(e) =>
                            setWhereRuleType({
                              ruleId,
                              whereId,
                              type: e.target.value,
                            })
                          }
                        >
                          <option value={CELL_MATCH_TYPE.STARTS_WITH}>
                            starts with
                          </option>
                          <option value={CELL_MATCH_TYPE.ENDS_WITH}>
                            ends with
                          </option>
                          <option value={CELL_MATCH_TYPE.EQUALS}>
                            is exactly
                          </option>
                          <option value={CELL_MATCH_TYPE.CONTAINS}>
                            contains
                          </option>
                          <option value={CELL_MATCH_TYPE.REGEX}>
                            matches regex
                          </option>
                          {whereRule.colIndex ? (
                            <option value={CELL_MATCH_TYPE.NOT_EMPTY}>
                              is not empty
                            </option>
                          ) : null}
                        </select>{' '}
                        {whereRule.type !== CELL_MATCH_TYPE.NOT_EMPTY ? (
                          <input
                            type="text"
                            className="border border-1 p-1 w-24"
                            value={whereRule.value}
                            onChange={(e) =>
                              setWhereValue({
                                ruleId,
                                whereId,
                                value: e.target.value,
                              })
                            }
                          />
                        ) : null}{' '}
                      </div>
                      <Button
                        className="text-sm"
                        onClick={() =>
                          onClickRemoveCheck({
                            ruleId,
                            whereId,
                          })
                        }
                      >
                        Delete
                      </Button>
                    </FlexEnds>
                  ))}
                </div>
                <Button
                  className="block mb-8"
                  onClick={() => handleAddAnotherCellCheck({ ruleId })}
                >
                  + Add cell rule
                </Button>

                <label htmlFor="googleSheetId">
                  Sync to Google Sheet Id:
                  <input
                    id="googleSheetId"
                    type="text"
                    value={rule.remoteSync?.googleSheet?.id}
                    onChange={(e) =>
                      setRuleProp({
                        ruleId,
                        remoteSync: {
                          googleSheet: {
                            id: e.target.value,
                          },
                        },
                      })
                    }
                    className="mb-4 block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                  />
                </label>
              </div>
            ) : rule.type === RULE_TYPE.INCLUDE_CELLS ? (
              <div>
                <div className="bg-orange-100 -ml-4 -mr-3 p-1 border-radius-1 pl-4 pr-3 pt-4 mb-2">
                  <span className="block font-bold mb-2">
                    Extracted Cell Values:
                  </span>

                  {rule.cells.map((cell, cellId) => {
                    return (
                      <FlexEnds
                        className="mb-2"
                        key={`rule_${ruleId}_cell_${cellId}`}
                      >
                        <div>
                          <div>
                            <label htmlFor={`rule_${ruleId}_cell_${cellId}`}>
                              Enter key for sample value{' '}
                              <span className="font-bold underline">
                                {cell.value}
                              </span>
                              :
                              <br />
                              <input
                                type="text"
                                id={`rule_${ruleId}_cell_${cellId}`}
                                value={cell.key}
                                className="border border-1 p-1"
                                onChange={(e) =>
                                  setKeyPairAtCell({
                                    ruleId,
                                    cellId,
                                    key: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                        </div>
                        <Button
                          className="text-sm"
                          onClick={() =>
                            onClickRemoveCell({
                              ruleId,
                              cellId,
                            })
                          }
                        >
                          Delete
                        </Button>
                      </FlexEnds>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default ExtractionRules;
