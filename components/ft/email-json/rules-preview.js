import React from 'react';
import dynamic from 'next/dynamic';

import { getRuleDataFromTable } from '~/src/pdf/utils';

const Grid = dynamic(() => import('./Grid'), { ssr: false });

export default function RulePreview({ data, rule }) {
  // function validateCell
  const ruleDataFromTable = getRuleDataFromTable({ data, rule });
  return (
    <div className="mb-4">
      <p className="font-bold">Rows Extracted by cell rules:</p>
      <Grid data={ruleDataFromTable} />
    </div>
  );
}
