/* eslint-disable no-shadow */
/* eslint-disable consistent-return */
/* eslint-disable func-names */
import shell from 'shelljs';
import fs from 'fs';
import unzipper from 'unzipper';
// eslint-disable-next-line import/no-extraneous-dependencies
import path from 'path';
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

    // pdf password
    if (options.password) {
      command.push('--password', options.password);
    }

    // table extration technique
    command.push(options.stream ? 'stream' : 'lattice');
    // input path is the last argument

    // lattice options
    if (!options.stream) {
      if (options.scale) {
        command.push('-scale', options.scale);
      }
    }

    command.push(inputPdfPath);

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

    const validTables = extractedTables.filter((table) => {
      const firstRow = table[0];
      // valid tables will contain first row as header
      // header cols should not contain empty cells

      if (
        Object.values(firstRow).filter((item) => item).length !==
        Object.keys(firstRow).length
      ) {
        return false;
      }

      if (Object.keys(firstRow).length < 2) {
        // single column table? more like horizontally layed out table
        return false;
      }

      // console.log('----table----');
      // console.log(table);
      return true;
    });
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
