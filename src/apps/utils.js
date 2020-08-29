import axios from 'axios';

const findLastIndex = require('lodash/findLastIndex');

export const getAfterTs = (ts) => parseInt(new Date(ts).getTime() / 1000, 10);

// space is intentional
const excludeFilter = ` -from:${process.env.MAILGUN_SENDING_EMAIL_ID}`;

/* eslint-disable import/prefer-default-export */
export async function getSearchQuery({ serviceEndpoint, newOnly = false }) {
  const { data: serviceData } = await axios(serviceEndpoint);
  const { data } = serviceData;
  let { search_query: searchQuery } = serviceData;
  if (!newOnly) {
    return `${searchQuery}${excludeFilter}`;
  }

  const hasData = Array.isArray(data) && data.length;
  let foundTsFromExistingData = false;

  if (hasData) {
    const lastSuccessfulDataEntry = findLastIndex(
      data,
      (item) => item.is_successful,
    );

    if (lastSuccessfulDataEntry >= 0) {
      const lastProcessingTimestamp = getAfterTs(
        data[lastSuccessfulDataEntry]._isReadyOn,
      );

      searchQuery = `${searchQuery} after:${lastProcessingTimestamp}`;
      foundTsFromExistingData = true;
    }
  }

  if (!foundTsFromExistingData) {
    // if service got created without past data
    // then use after timestamp from the _createdOn timestamp of the db record
    searchQuery = `${searchQuery} after:${getAfterTs(serviceData._createdOn)}`;
  }

  return `${searchQuery}${excludeFilter}`;
}
