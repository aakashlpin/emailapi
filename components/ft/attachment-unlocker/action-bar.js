import React from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';

import { Button, Label, FlexEnds } from '~/components/common/Atoms';

const Nudges = styled.div.attrs({
  className: 'border-b',
})`
  display: grid;
  grid-template-columns: 400px 1fr 600px;
  align-items: end;
  padding: 0.5rem;
`;

const ActionBar = ({
  isLoading,
  searchResults,
  nextPageToken,
  handleFetchMoreMails,
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
    <div className="flex justify-center items-center">
      Attachment Unlocker Settings
    </div>
  </Nudges>
);

export default ActionBar;
