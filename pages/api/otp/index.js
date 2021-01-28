import axios from 'axios';

import flatten from 'lodash/flatten';

import applyConfigOnEmail from '~/src/isomorphic/applyConfigOnEmail';
import ensureConfiguration from '~/src/isomorphic/ensureConfiguration';

const {
  NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI: GOOGLE_OAUTH_REDIRECT_URI,
} = process.env;
const { OTP_EMAILAPI_USER_ID } = process.env;

function isValidEmail(email) {
  // eslint-disable-next-line no-useless-escape
  const regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
}

export default async function handle(req, res) {
  const {
    email: reqEmail,
    search_query: reqSearchQuery = '',
    configurations = [],
  } = req.body;

  if (!isValidEmail(reqEmail)) {
    return res.status(400).json({
      error_code: 'INVALID_EMAIL',
    });
  }

  const searchQuery = `to: ${reqEmail} ${reqSearchQuery}`;

  const { data: emailSearchResults } = await axios.post(
    `${GOOGLE_OAUTH_REDIRECT_URI}/api/email-search`,
    {
      query: searchQuery,
      uid: OTP_EMAILAPI_USER_ID,
      api_only: true,
      gmail_search_props: {
        maxResults: 1, // only interested in the most recent email
      },
    },
  );

  const { emails } = emailSearchResults;
  if (!emails.length) {
    // no emails found for this query
    return res.json({
      status: 0,
    });
  }

  if (!configurations.length) {
    return res.json({
      status: 2,
    });
  }

  const emailapi = flatten(
    configurations.map((config) =>
      emails
        .map((email) => applyConfigOnEmail(email.message, config))
        .filter((extactedData) => ensureConfiguration(extactedData, config)),
    ),
  );

  if (!emailapi.length) {
    // [IMP!] emails were found but this configuration wasn't able to parse it. Email template has most likely changed. FIX IT!
    return res.json({
      status: 1,
    });
  }

  // all good! :)
  return res.json({
    status: 2,
    results: emailapi,
  });
}
