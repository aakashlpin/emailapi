import ensureAuth from '~/src/middleware/ensureAuth';
import extractTableInJson from '~/src/pdf/extract-tables';
import savePdfAttachmentToDisk from '~/src/pdf/create-file';
import { fetchAttachment } from '~/src/gmail';

async function handle(req, res, resolve) {
  try {
    const {
      attachmentId,
      messageId,
      attachmentPassword,
      camelotMethod,
      camelotScale,
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
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
  resolve();
}

export default ensureAuth(handle);
