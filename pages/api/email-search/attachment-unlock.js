import axios from 'axios';
import puppeteer from 'puppeteer';
import qs from 'qs';
import fs from 'fs';

import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

const base64 = require('base64topdf');
const removePdfPassword = require('remove-pdf-password');

const { fetchEmailByMessageId, processMessageBody } = require('~/src/gmail');
const { getAfterTs } = require('~/src/apps/utils');

require('~/src/queues');

async function extractTablesInExcel(filePath, filename) {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('http://127.0.0.1:5000/files');
  await page.waitForSelector('input[type=file]');
  await page.waitFor(1000);

  const inputUploadHandle = await page.$('input[type=file]');

  const fileToUpload = filePath;

  inputUploadHandle.uploadFile(fileToUpload);

  await page.type('#pages', 'all');

  await page.waitForSelector('#upload');
  await page.evaluate(() => document.getElementById('upload').click());

  await page.waitForSelector('.jumbotron.control-panel');
  await page.waitFor(1000);

  await page.click('.detect-areas');

  await page.waitFor(1000);

  await page.click(
    'div.container div.row section.col-md-2 button.btn.btn-success',
  );

  // extracted data page
  await page.waitForSelector('#format');

  const urlParams = page.url().split('/');
  const jobId = urlParams[urlParams.length - 1];
  const response = await axios.post(
    'http://127.0.0.1:5000/download',
    qs.stringify({
      format: 'Excel', // or 'Excel'
      job_id: jobId,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/zip',
      },
      responseType: 'arraybuffer',
    },
  );

  fs.writeFileSync(`${filename}.zip`, response.data);

  await browser.close();
}

async function handle(req, res, resolve) {
  const {
    attachmentId,
    messageId,
    token,
    uid,
    filename,
    pdfPasswordInput,
  } = req.body;

  try {
    const { data } = await axios.post(
      `${process.env.GOOGLE_OAUTH_REDIRECT_URI}/api/fetch/attachment`,
      {
        messageId,
        attachmentId,
        token,
        uid,
      },
    );

    if (!data.base64) {
      throw new Error(
        'base64 key not found in response object from /api/fetch/attachment',
      );
    }

    try {
      const localFilePath = `/tmp/${filename}`;
      base64.base64Decode(data.base64, localFilePath);

      const outputFilePath = `/tmp/${filename
        .split('.')
        .map((v, idx) => (idx === 0 ? `${v}_unlocked` : v))
        .join('.')}`;

      const params = {
        inputFilePath: localFilePath,
        password: pdfPasswordInput,
        outputFilePath,
      };

      removePdfPassword(params);

      await extractTablesInExcel(outputFilePath, filename);

      res.json({});
      return resolve();

      const messageBody = await fetchEmailByMessageId({
        messageId,
        refreshToken: req.refresh_token,
      });

      const messageProps = processMessageBody(messageBody);

      const emailOpts = {
        from: `${messageProps.from} <${process.env.NEXT_PUBLIC_SENDING_EMAIL_ID}>`,
        to: req.user.email,
        subject: `[UNLOCKED] ${messageProps.subject}`,
        'h:Reply-To': 'aakash@emailapi.io',
        html: messageProps.message,
        attachment: params.outputFilePath,
      };

      queues.sendEmailQueue.add(emailOpts);

      res.json({
        pollQuery: `from:(${emailOpts.from}) subject:(${
          emailOpts.subject
        }) after:${getAfterTs(new Date())}`,
      });
      return resolve();
    } catch (e) {
      res.status(500).send(e);
      console.log(e);
      return resolve();
    }
  } catch (e) {
    res.status(500).send(e);
    console.log(e);
    return resolve();
  }
}

export default ensureAuth(handle);
