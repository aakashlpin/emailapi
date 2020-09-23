const base64 = require('base64topdf');
const shortid = require('shortid');

export default function createFileFromApiResponse(b64Content) {
  const filePath = `/tmp/${shortid.generate()}.pdf`;
  base64.base64Decode(b64Content, filePath);

  return filePath;
}
