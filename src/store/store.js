/* eslint-disable import/prefer-default-export */
import { atom, selectorFamily } from 'recoil';
import axois from 'axios';

export const searchQueryEmailsState = atom({
  key: 'searchQueryEmailsState', // unique ID (with respect to other atoms/selectors)
  default: [], // default value (aka initial value)
});

export const seachQueryEmailsQuery = selectorFamily({
  key: 'SearchQueryEmails',
  get: ({ reqParams }) => async () => {
    // TODO
  },
});
