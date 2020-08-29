/* eslint-disable import/prefer-default-export */
const mailgun = require('mailgun-js');

const { MAILGUN_API_KEY } = process.env;
const { MAILGUN_DOMAIN } = process.env;

const mg = mailgun({ apiKey: MAILGUN_API_KEY, domain: MAILGUN_DOMAIN });

export async function sendEmail(opts) {
  return new Promise((resolve, reject) => {
    mg.messages().send(opts, (error, res) => {
      if (error) {
        console.log('error from mailgun api', error);
        return reject(new Error(error));
      }
      if (!error && !res) {
        const ERR = 'something went wrong sending email...';
        console.log(ERR);
        return reject(new Error(ERR));
      }
      return resolve();
    });
  });
}
