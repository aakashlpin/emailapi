import { toArray, toObject } from '../../../../src/pdf/utils';

export default async function handle(req, res) {
  const inputData = req.body;
  const contractNote = inputData.find(
    (item) => item.rule.name === 'Contract note',
  );
  /**
   *
    cn_no:'CNT-20/21-67361114'
    settlement_date:''
    settlement_no:''
    trade_date:'25/09/2020'
   */

  const tradeDate = contractNote.data.contract_note.trade_date;

  const output = inputData.map((item) => {
    if (item.rule.name === 'Contract note') {
      return item;
    }

    const { data } = item;
    const processedData = Object.keys(data).reduce((accum, dataKey) => {
      const [headerRow, ...otherRows] = data[dataKey];
      const headerRowArray = toArray(headerRow);
      const modifiedHeaderRow = toObject(['Trade Date', ...headerRowArray]);

      const modifiedOtherRows = otherRows.map((row) => {
        const rowArray = toArray(row);
        const modifiedRow = [tradeDate, ...rowArray];
        return toObject(modifiedRow);
      });

      return {
        ...accum,
        [dataKey]: [modifiedHeaderRow, ...modifiedOtherRows],
      };
    }, {});

    return {
      ...item,
      data: processedData,
    };
  });

  return res.json(output);
}
