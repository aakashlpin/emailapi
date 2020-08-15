import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import styled from 'styled-components';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Link as LinkIcon } from 'react-feather';
import { Button } from '~/components/common/Atoms';

const BRAND_COLOR = '#ffc107';

const generateUniqueId = require('~/components/admin/email/fns/generateUniqueId');

const ForwardEmailContainer = styled.div.attrs({
  className: 'p-4 rounded bg-yellow-100 text-center',
})``;

const ForwardBox = styled.div.attrs({
  className: 'flex justify-around items-center',
})`
  justify-content: space-evenly;
`;

const CreateMailbox = ({ token, AuthUser, invitationText }) => {
  const router = useRouter();
  const [shouldCheckEmail, setShouldCheckEmail] = useState(false);
  const [forwardEmailId, setForwardEmailId] = useState(null);
  const [isCopied, setIsCopied] = useState(null);

  useEffect(() => {
    const uniqueId = generateUniqueId();
    setForwardEmailId(`${uniqueId}@emailapi.io`);
  }, []);

  async function checkForEmailForward() {
    try {
      const receivedResponse = await axios.post('/api/email-forward', {
        emailid: forwardEmailId,
        token,
        firebase_uid: AuthUser ? AuthUser.uid : null,
      });

      return receivedResponse.data;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  useEffect(() => {
    if (!forwardEmailId || !shouldCheckEmail) {
      return;
    }

    let timer;
    async function fn() {
      const response = await checkForEmailForward();
      if (!response) {
        return;
      }
      const { mailbox_id: mailboxId, uid } = response;
      if (mailboxId) {
        if (timer) clearInterval(timer);
        router.push('/[uid]/mailbox/[id]', `/${uid}/mailbox/${mailboxId}`);
      }
    }

    timer = setInterval(async () => {
      fn();
    }, 15 * 1000); // every 15seconds

    fn();

    // eslint-disable-next-line consistent-return
    return () => {
      clearInterval(timer);
    };
  }, [forwardEmailId, shouldCheckEmail]);

  function onCopy() {
    window
      .getSelection()
      .selectAllChildren(document.getElementById('forwardEmail'));

    setIsCopied(true);
  }

  function initCheckEmail() {
    setShouldCheckEmail(true);
  }

  return (
    <div className="clearfix">
      <ForwardEmailContainer>
        <p>{invitationText}</p>
        <ForwardBox>
          <p className="text-2xl" id="forwardEmail">
            {forwardEmailId}
          </p>
          <CopyToClipboard text={forwardEmailId} onCopy={onCopy}>
            <Button className="flex items-center">
              <span className="mr-1">
                <LinkIcon size={16} color={BRAND_COLOR} />
              </span>
              <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </Button>
          </CopyToClipboard>
        </ForwardBox>
      </ForwardEmailContainer>
      {!shouldCheckEmail ? (
        <Button
          className="float-right text-xs"
          onClick={() => initCheckEmail()}
          style={{ border: 'none' }}
        >
          Sent an email?
        </Button>
      ) : (
        <p className="float-right text-xs">Waiting for email...</p>
      )}
    </div>
  );
};

export default CreateMailbox;
