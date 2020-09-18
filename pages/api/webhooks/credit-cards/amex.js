import format from 'date-fns/format';

const inrToNumber = (str) => Number(str.replace(/[^0-9.-]+/g, ''));

export default async function handle(req, res) {
  const { rows, header } = req.body;

  const updatedRowsData = rows.map((item) => ({
    'Last Statement Balance': inrToNumber(
      item['Last Statement Balance'].split('closing date')[0].replace('Rs.'),
    ),
    'Email Date': format(new Date(item['Email Date']), 'yyyy/MM/dd'),
  }));

  res.json({ rows: updatedRowsData, header });
}
