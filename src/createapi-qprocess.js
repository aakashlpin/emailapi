import axios from 'axios';
import flatten from 'lodash/flatten';

import applyConfigOnEmail from './isomorphic/applyConfigOnEmail';
import ensureConfiguration from './isomorphic/ensureConfiguration';
import queue from './redis-queue';

const findLastIndex = require('lodash/findLastIndex');
const mailgun = require('mailgun-js');

const GOOGLE_OAUTH_REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const EMAILAPI_DOMAIN = process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

const mg = mailgun({ apiKey: MAILGUN_API_KEY, domain: MAILGUN_DOMAIN });

async function searchExtractSync({
  uid,
  origin,
  pageToken,
  endpoint,
  searchQuery,
  serviceData,
  serviceEndpoint,
  token,
  refreshToken,
  uniqueDataEndpoint,
  remoteConfigurations,
  dataCount,
  apiOnly,
}) {
  try {
    const {
      data: { emails, nextPageToken },
    } = await axios.post(`${GOOGLE_OAUTH_REDIRECT_URI}/api/email-search`, {
      query: searchQuery,
      uid,
      token,
      refresh_token: refreshToken,
      api_only: apiOnly,
      nextPageToken: pageToken,
    });

    const emailapi = flatten(
      remoteConfigurations.map((config) =>
        emails
          .map((email) => ({
            ...applyConfigOnEmail(email.message, config),
            email_date: email.date,
          }))
          .filter((extactedData) => ensureConfiguration(extactedData, config)),
      ),
    );

    try {
      if (emailapi.length) {
        console.log('[bg] posting data', emailapi);
        await axios.post(endpoint, emailapi);
        if (serviceData.webhook_url) {
          try {
            await axios.post(serviceData.webhook_url, {
              data: emailapi,
              endpoint,
            });
          } catch (e) {
            console.log(e);
          }
        }
        // eslint-disable-next-line no-param-reassign
        dataCount += emailapi.length;
      } else {
        console.log('[bg] no data to post');
      }
    } catch (e) {
      console.log('error in posting');
      console.log(e);
      const { message } = 'response' in e ? e.response.data : {};
      if (message) {
        await axios.post(endpoint, {
          error: message,
          action:
            "If you believe something's not right, contact help@emailapi.io",
        });
      }
    }

    if (nextPageToken) {
      await searchExtractSync({
        pageToken: nextPageToken,
        origin,
        endpoint,
        searchQuery,
        serviceData,
        serviceEndpoint,
        token,
        refreshToken,
        uniqueDataEndpoint,
        remoteConfigurations,
        dataCount,
      });
      return null;
    }
    return dataCount;
  } catch (e) {
    console.log(e);
    return dataCount;
  }
}

// eslint-disable-next-line consistent-return
async function processJob(jobData, done) {
  const {
    uid,
    user,
    token,
    origin,
    apiOnly,
    newOnly,
    endpoint,
    isMailbox,
    refreshToken,
    serviceEndpoint,
    uniqueDataEndpoint,
  } = jobData;

  const { data: serviceData } = await axios(serviceEndpoint);

  const { configurations, email, data } = serviceData;
  let { search_query: searchQuery } = serviceData;
  if (isMailbox) {
    searchQuery = `to: ${email}`;
  }
  if (newOnly) {
    const hasData = Array.isArray(data) && data.length;

    if (hasData) {
      const lastSuccessfulDataEntry = findLastIndex(
        data,
        (item) => item.is_successful,
      );

      if (lastSuccessfulDataEntry >= 0) {
        const lastProcessingTimestamp = parseInt(
          new Date(data[lastSuccessfulDataEntry]._createdOn).getTime() / 1000,
          10,
        );

        if (lastProcessingTimestamp) {
          searchQuery = `${searchQuery} after:${lastProcessingTimestamp}`;
        }
      }
    }
  }

  const remoteConfigurations = (
    await Promise.all(
      configurations.map((configId) =>
        axios(`${EMAILAPI_DOMAIN}/${uid}/configurations/${configId}`),
      ),
    )
  ).map((response) => response.data);

  const dataEntry = {
    _createdOn: new Date().toISOString(),
    id: uniqueDataEndpoint,
    is_pending: true,
  };

  const contentAtServiceEndpoint = {
    ...serviceData,
    data: Array.isArray(serviceData.data)
      ? [...serviceData.data, dataEntry]
      : [dataEntry],
  };

  await axios.put(serviceEndpoint, contentAtServiceEndpoint);

  /**
   * [TODO]
   * Make the function below fire and forget;
   * any damage happending inside a atomic execution should fail standalone
   * and not impact rest of the workflow
   */
  const postedDataCount = await searchExtractSync({
    uid,
    token,
    origin,
    apiOnly,
    endpoint,
    serviceData,
    searchQuery,
    refreshToken,
    serviceEndpoint,
    uniqueDataEndpoint,
    remoteConfigurations,
    dataCount: 0,
  });

  await axios.put(serviceEndpoint, {
    ...contentAtServiceEndpoint,
    data: contentAtServiceEndpoint.data.map((dataItem) =>
      dataItem.id === dataEntry.id
        ? {
            ...dataItem,
            is_pending: false,
            is_successful: postedDataCount > 0,
            _isReadyOn: new Date().toISOString(),
          }
        : dataItem,
    ),
  });

  if (apiOnly) {
    console.log('[apiOnly=true] not sending email');
    return done();
  }

  const mailboxEmail = isMailbox ? searchQuery.split(':')[1] : null;

  const emailOpts = {
    from: 'emailapi.io <notifications@m.emailapi.io>',
    to: user.email,
    subject: `👋🏽 Your emailapi for "${searchQuery}" is ready!`,
    'h:Reply-To': 'aakash@emailapi.io',
    html: `
      Hello ${user.given_name || user.name},<br/><br/>
      As promised, here's your <a href="${endpoint}">data endpoint</a> for ${
      mailboxEmail
        ? `mailbox at "${mailboxEmail}"`
        : `search query "${searchQuery}"`
    } .<br/><br/>
      emailapi.io uses a hosted version of jsonbox.io as its underlying database. <a href="https://github.com/vasanthv/jsonbox#read">Follow its docs</a> for further instructions on how to use your new data endpoint.<br/><br/>
      If you've got a question or a comment, or if you'd like to say hi (that's a nice thing to do), hit reply!<br/><br/>
      Thanks,<br/>
      Aakash
    `,
  };
  mg.messages().send(emailOpts, (error, body) => {
    if (error) {
      console.log('error', error);
    }
    if (body) {
      console.log('mailgun res', body);
    }
    console.log('[DONE] populate-service');
    return done();
  });
}

(() => {
  queue.process((job, done) => {
    console.log('Job data', job.data);
    processJob(job.data, done);
  });
})();
