import React from 'react';
import styled from 'styled-components';
import flatten from 'lodash/flatten';
import { format } from 'date-fns';

import { Button, Label, FlexEnds } from '~/components/common/Atoms';

const Nudges = styled.div.attrs({
  className: '',
})`
  display: grid;
  grid-template-columns: 400px 1fr 600px;
  align-items: end;
  padding: 0.5rem;
`;

const ActionBar = ({
  serviceId,
  isLoading,
  parsedData,
  searchResults,
  isPreviewMode,
  nextPageToken,
  onClickCreateAPI,
  isCreateApiPending,
  doPreviewParsedData,
  handleFetchMoreMails,
  handleClickSyncIntegrations,
  matchedSearchResults,
}) => (
  <Nudges>
    <div>
      <FlexEnds>
        <div className="flex flex-col items-start justify-start flex-1">
          <Label>Count / Earliest Email</Label>
          {searchResults.length} /{' '}
          {searchResults.length
            ? format(
                new Date(searchResults[searchResults.length - 1].date),
                'dd MMM yyyy',
              )
            : 'Loading...'}
        </div>
        <div className="pr-2">
          <Button
            disabled={isLoading || !nextPageToken}
            onClick={handleFetchMoreMails}
          >
            Load more
          </Button>
        </div>
      </FlexEnds>
    </div>
    <div className="text-center">Original Email</div>
    <div className="flex justify-end items-center">
      <div className="flex flex-col items-start justify-start flex-1 pl-2">
        {!serviceId ? (
          <>
            <Label>Email matches</Label>
            {searchResults.length && matchedSearchResults.length
              ? `${parseInt(
                  (matchedSearchResults.length / searchResults.length) * 100,
                  10,
                )}%`
              : '-'}
          </>
        ) : null}
      </div>

      {/* <Button
        className="mr-4"
        disabled={!flatten(parsedData).length || serviceId}
        onClick={doPreviewParsedData}
      >
        {!isPreviewMode ? 'Preview API' : '< Go Back'}
      </Button> */}
      <Button
        className="mr-4"
        disabled={!flatten(parsedData).length || serviceId}
        onClick={doPreviewParsedData}
      >
        {!isPreviewMode ? 'Preview API' : '< Go Back'}
      </Button>
      <Button
        disabled={!isPreviewMode || isCreateApiPending || serviceId}
        onClick={onClickCreateAPI}
        className="mr-4"
      >
        Create API
      </Button>
      <Button onClick={handleClickSyncIntegrations} disabled={!serviceId}>
        Integrations
      </Button>
    </div>
  </Nudges>
);

export default ActionBar;
