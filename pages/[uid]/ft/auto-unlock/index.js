import React from 'react';

import withAuthUser from '~/components/pageWrappers/withAuthUser';
import withAuthUserInfo from '~/components/pageWrappers/withAuthUserInfo';

import FeatureApp from '~/components/pageWrappers/AppWrapper';

function FeatureAutoUnlockApp({
  selectedEmail,
  onSetHighlightedEmails,
  onTriggerRefresh,
  onTriggerFetchNextPage,
}) {
  return <pre>{JSON.stringify(selectedEmail)}</pre>;
}

function AutoUnlockApp({ AuthUserInfo }) {
  return (
    <FeatureApp AuthUserInfo={AuthUserInfo}>
      {(
        selectedEmail,
        onSetHighlightedEmails,
        onTriggerRefresh,
        onTriggerFetchNextPage,
      ) => {
        return (
          <FeatureAutoUnlockApp
            selectedEmail={selectedEmail}
            onSetHighlightedEmails={onSetHighlightedEmails}
            onTriggerRefresh={onTriggerRefresh}
            onTriggerFetchNextPage={onTriggerFetchNextPage}
          />
        );
      }}
    </FeatureApp>
  );
}

export default withAuthUser(withAuthUserInfo(AutoUnlockApp));
