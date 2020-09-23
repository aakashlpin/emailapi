import ensureAuth from '~/src/middleware/ensureAuth';
import extractTableInJson from '~/src/pdf/extract-tables';
import savePdfAttachmentToDisk from '~/src/pdf/create-file';

const { fetchAttachment } = require('~/src/gmail');

async function handle(req, res, resolve) {
  const {
    attachmentId,
    messageId,
    attachmentPassword,
    camelotMethod = 'lattice',
    camelotScale = 60,
  } = req.body;

  const base64Encoded = await fetchAttachment({
    attachmentId,
    messageId,
    refreshToken: req.refresh_token,
  });

  const pdfDiskPath = await savePdfAttachmentToDisk(base64Encoded);
  const extractedTables = await extractTableInJson(pdfDiskPath, {
    stream: camelotMethod === 'stream',
    scale: camelotScale,
    password: attachmentPassword,
  });

  res.json(extractedTables);
  resolve();
}

export default ensureAuth(handle);
