/* eslint-disable no-shadow */
/* eslint-disable consistent-return */
/* eslint-disable func-names */
import shell from 'shelljs';
import fs from 'fs';
import unzipper from 'unzipper';
// eslint-disable-next-line import/no-extraneous-dependencies
import path from 'path';
import removePdfPassword from 'remove-pdf-password';
import Sentry from '~/src/sentry';

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

export default async function extractTableInJson(inputPdfPath, options = {}) {
  try {
    const dir = '/tmp';
    const inputPdfPathParts = inputPdfPath.split('/');
    const inputPdfFilename = inputPdfPathParts.length
      ? inputPdfPathParts[inputPdfPathParts.length - 1]
      : inputPdfPath;
    const outputFilename = inputPdfFilename.replace('.pdf', '');
    // pdf password
    let unlockedPdfPath = inputPdfPath;
    if (options.password) {
      const outputFilePath = `${inputPdfPath
        .split('.pdf')
        .map((v, idx) => (idx === 0 ? `${v}_unlocked` : v))
        .join('.pdf')}`;

      const params = {
        inputFilePath: inputPdfPath,
        password: options.password,
        outputFilePath,
      };

      removePdfPassword(params);
      unlockedPdfPath = outputFilePath;
    }

    const outputPath = `${dir}/${outputFilename}.json`;
    const command = [
      'camelot',
      '--zip',
      '--format',
      'json',
      '--pages',
      'all',
      '--output',
      outputPath,
    ];

    // table extration technique
    command.push(options.stream ? 'stream' : 'lattice');
    // input path is the last argument

    // lattice options
    if (!options.stream) {
      if (options.scale) {
        command.push('-scale', options.scale);
      }
    }

    command.push(unlockedPdfPath);

    const shellCmd = command.join(' ');

    console.log('camelot command', shellCmd);

    if (shell.exec(shellCmd).code !== 0) {
      shell.echo('Error: camelot failed');
      return null;
    }

    const zipPath = `${dir}/${outputFilename}.zip`;

    const tablesPr = new Promise((resolve) => {
      const extractedFolder = `${dir}/${outputFilename}`;
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

    const extractedTables = await tablesPr;
    if (!(Array.isArray(extractedTables) && extractedTables.length)) {
      return null;
    }

    return extractedTables;
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    return null;
  }
}

// (async () => {
//   const response = await extractTableInJson('/tmp/kotak-1.pdf', {
//     stream: true,
//     password: '50226488',
//   });
//   console.log(response);
// })();
