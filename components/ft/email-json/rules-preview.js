import React from 'react';
import { getRuleDataFromTable } from '~/src/pdf/utils';
import Grid from './Grid';

export default function RulePreview({ data, rule }) {
  // function validateCell
  const ruleDataFromTable = getRuleDataFromTable({ data, rule });
  return (
    <div className="mb-4">
      <p className="font-bold">Rows Extracted by cell rules:</p>
      <Grid data={ruleDataFromTable.rows} />
    </div>
  );
}
