import React from 'react';
import dynamic from 'next/dynamic';
import { defaultsDeep } from 'lodash';
import RulePreview from './rules-preview';
import { RULE_TYPE } from '../../../src/pdf/enums';
import { Button } from '~/components/common/Atoms';

const Grid = dynamic(() => import('./Grid'), { ssr: false });

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

  return (
    <div className="mb-8">
      {rules.map((rule, ruleId) => {
        if (!rule.selectedTableId) {
          return (
            <>
              {extractedTablesFromPDF.map((table, idx) => {
                return (
                  <div key={`table_${idx}`} className="mb-4">
                    <p>
                      Table #{idx + 1}{' '}
                      <Button
                        className="text-xs"
                        onClick={() => onClickSelectTable({ ruleId, id: idx })}
                      >
                        Select table
                      </Button>
                    </p>
                    <Grid data={table} />
                  </div>
                );
              })}
            </>
          );
        }

        const selectedTableData = extractedTablesFromPDF[rule.selectedTableId];

        return (
          <div key={`rule_${ruleId}`}>
            <p className="font-bold">Original Table:</p>{' '}
            <div className="mb-4">
              <Grid data={selectedTableData} />
            </div>
            <div className="mb-4">
              <RulePreview rule={rules[ruleId]} data={selectedTableData} />
            </div>
            <select
              className="border border-1 block"
              value={rule.type}
              onChange={(e) => setRuleProp({ ruleId, type: e.target.value })}
            >
              <option value="">Select rule type...</option>
              <option value={RULE_TYPE.INCLUDE_ROWS}>Include Rows</option>
              <option value={RULE_TYPE.INCLUDE_CELLS}>Include Cells</option>
            </select>{' '}
            {rule.type === RULE_TYPE.INCLUDE_ROWS ? (
              <div>
                {rule.where.map((whereRule, whereId) => (
                  <div key={`whererule_${whereId}`}>
                    <span>if a cell value at column index</span>{' '}
                    <input
                      type="text"
                      className="border border-1 w-8"
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
                      className="border border-1"
                      value={whereRule.type}
                      onChange={(e) =>
                        setWhereRuleType({
                          ruleId,
                          whereId,
                          type: e.target.value,
                        })
                      }
                    >
                      <option value="cell_startsWith">starts with</option>
                      <option value="cell_endsWith">ends with</option>
                      <option value="cell_equals">is exactly</option>
                      <option value="cell_contains">contains</option>
                      {whereRule.colIndex ? (
                        <option value="cell_notEmpty">is not empty</option>
                      ) : null}
                    </select>{' '}
                    {whereRule.type !== 'cell_notEmpty' ? (
                      <input
                        type="text"
                        className="border border-1"
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
                    <Button
                      onClick={() =>
                        onClickRemoveCheck({
                          ruleId,
                          whereId,
                        })
                      }
                    >
                      x Remove Check
                    </Button>
                  </div>
                ))}
                <Button
                  className="block mb-8"
                  onClick={() => handleAddAnotherCellCheck({ ruleId })}
                >
                  + Add another cell check
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
              <div />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default ExtractionRules;
