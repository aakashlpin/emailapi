import React from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';

import FirebaseAuth from '~/components/FirebaseAuth';
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
  uid,
  token,
  isLoading,
  searchResults,
  nextPageToken,
  handleFetchMoreMails,
  GOOGLE_CLIENT_ID,
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

    {/* [TODO] figure out why after "Create API" action the token value goes "undefined" */}
    {!token ? (
      <FirebaseAuth
        uid={uid}
        scope="profile email"
        buttonLabel="Signup to Create API"
        GOOGLE_CLIENT_ID={GOOGLE_CLIENT_ID}
        // eslint-disable-next-line consistent-return
        callback={(error) => {
          if (error) {
            return <div>Oops! Something went wrong there!</div>;
          }
          window.location.reload();
        }}
      />
    ) : null}
  </Nudges>
);

export default ActionBar;
