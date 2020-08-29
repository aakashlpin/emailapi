import React from 'react';
import styled from 'styled-components';
import flatten from 'lodash/flatten';
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
  parsedData,
  searchInput,
  searchResults,
  isPreviewMode,
  nextPageToken,
  onClickCreateAPI,
  isCreateApiPending,
  doPreviewParsedData,
  handleFetchMoreMails,
  matchedSearchResults,
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
    <div className="flex justify-end items-center">
      {/* <div className="flex flex-col items-start justify-start flex-1 pl-2">
        <Label>Email matches</Label>
        {searchResults.length && matchedSearchResults.length
          ? `${parseInt(
              (matchedSearchResults.length / searchResults.length) * 100,
              10,
            )}%`
          : '-'}
      </div> */}

      {/* <Button
        className="mr-4"
        disabled={!flatten(parsedData).length}
        onClick={doPreviewParsedData}
      >
        {!isPreviewMode ? 'Preview API' : '< Go Back'}
      </Button> */}
      {token ? (
        <Button
          disabled={!isPreviewMode || isCreateApiPending}
          onClick={onClickCreateAPI}
        >
          Create API
        </Button>
      ) : (
        <FirebaseAuth
          uid={uid}
          scope="profile email"
          buttonLabel="Signup to Create API"
          GOOGLE_CLIENT_ID={GOOGLE_CLIENT_ID}
          // eslint-disable-next-line consistent-return
          callback={(error, associatedUser) => {
            if (error) {
              return <div>Oops! Something went wrong there!</div>;
            }
            const { uid: redirectToUid, mailboxes } = associatedUser;
            if (uid !== redirectToUid) {
              // existing user
              const redirectToMailboxId = mailboxes.find(
                (mb) => `to: ${mb.email}` === searchInput,
              )._id;
              window.location.href = `/${redirectToUid}/mailbox/${redirectToMailboxId}`;
            } else {
              window.location.reload();
            }
          }}
        />
      )}
    </div>
  </Nudges>
);

export default ActionBar;
