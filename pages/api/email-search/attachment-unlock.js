/* eslint-disable array-callback-return */
import axios from 'axios';
import shell from 'shelljs';
import fs from 'fs';
import unzipper from 'unzipper';
import ensureAuth from '~/src/middleware/ensureAuth';
import queues from '~/src/redis-queue';

const path = require('path');

const base64 = require('base64topdf');
const removePdfPassword = require('remove-pdf-password');

const { fetchEmailByMessageId, processMessageBody } = require('~/src/gmail');
const { getAfterTs } = require('~/src/apps/utils');

require('~/src/queues');

/**
 * Promise all
 * @author Loreto Parisi (loretoparisi at gmail dot com)
 */
function promiseAllP(items, block) {
  const promises = [];
  items.forEach(function (item, index) {
    promises.push(
      (function (item, i) {
        return new Promise(function (resolve, reject) {
          return block.apply(this, [item, index, resolve, reject]);
        });
      })(item, index),
    );
  });
  return Promise.all(promises);
} // promiseAll

/**
 * read files
 * @param dirname string
 * @return Promise
 * @author Loreto Parisi (loretoparisi at gmail dot com)
 * @see http://stackoverflow.com/questions/10049557/reading-all-files-in-a-directory-store-them-in-objects-and-send-the-object
 */
function readFiles(dirname) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirname, function (err, filenames) {
      if (err) return reject(err);
      promiseAllP(filenames, (filename, index, resolve, reject) => {
        fs.readFile(path.resolve(dirname, filename), 'utf-8', function (
          err,
          content,
        ) {
          if (err) return reject(err);
          return resolve({ filename, contents: content });
        });
      })
        .then((results) => {
          return resolve(results);
        })
        .catch((error) => {
          return reject(error);
        });
    });
  });
}

async function extractTableInJson(filePath, filename) {
  const extractJsonPath = `/tmp/${filename}.json`;
  if (
    shell.exec(
      `camelot --zip --format json --output ${extractJsonPath} lattice -scale 40 ${filePath}`,
    ).code !== 0
  ) {
    shell.echo('Error: camelot failed');
    shell.exit(1);
    return null;
  }

  const fn = filename.split('.')[0];
  const zipPath = `/tmp/${filename}.zip`;

  return new Promise((resolve) => {
    const extractedFolder = `/tmp/${fn}`;
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractedFolder }))
      .on('close', () => {
        readFiles(extractedFolder)
          .then((files) => {
            console.log('loaded ', files.length);
            const data = files.map((item) => JSON.parse(item.contents));
            resolve(data);
          })
          .catch((error) => {
            console.log(error);
            resolve(null);
          });
      });
  });
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

      const outputFilename = `${filename
        .split('.')
        .map((v, idx) => (idx === 0 ? `${v}_unlocked` : v))
        .join('.')}`;
      const outputFilePath = `/tmp/${outputFilename}`;

      const params = {
        inputFilePath: localFilePath,
        password: pdfPasswordInput,
        outputFilePath,
      };

      removePdfPassword(params);

      const extractedData = await extractTableInJson(
        outputFilePath,
        outputFilename,
      );

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
        extractedData,
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
