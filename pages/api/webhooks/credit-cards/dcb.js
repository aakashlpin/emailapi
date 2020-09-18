import format from 'date-fns/format';

const inrToNumber = (str) => Number(str.replace(/[^0-9.-]+/g, ''));

export default async function handle(req, res) {
  const { rows, header } = req.body;

  const updatedRowsData = rows.map((item) => ({
    'Total Amount Due': inrToNumber(item['Total Amount Due']),
    'Min Amount Due': inrToNumber(item['Min Amount Due']),
    'Due Date': item['Due Date'].split('-').reverse().join('/'),
    'Email Date': format(new Date(item['Email Date']), 'yyyy/M/d'),
  }));

  res.json({ rows: updatedRowsData, header });
}
