/* eslint-disable no-bitwise */
import axios from 'axios';

const findLastIndex = require('lodash/findLastIndex');
// space is intentional
const excludeFilter = ` -from:${process.env.MAILGUN_SENDING_EMAIL_ID}`;

function createUniqueID() {
  let dt = new Date().getTime();
  const uuid = 'xxyxxxxxxyxxxxxyxxxx'.replace(/[xy]/g, (c) => {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  return uuid;
}

export function generateUniqueId(prefix = '') {
  if (prefix.length > 4)
    return new Error('prefix length cannot be more than 4');
  return `${prefix}${createUniqueID()}`;
}

export const getAfterTs = (ts) => parseInt(new Date(ts).getTime() / 1000, 10);

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
