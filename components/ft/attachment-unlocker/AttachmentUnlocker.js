/* eslint-disable jsx-a11y/accessible-emoji */
/* eslint-disable no-irregular-whitespace */
/* eslint-disable no-alert */
/* eslint-disable no-underscore-dangle */
import React, { useState, useEffect } from 'react';
import { withRouter } from 'next/router';
import Head from 'next/head';
import 'react-responsive-modal/styles.css';
import '~/css/react-responsive-modal-override.css';
import { Modal } from 'react-responsive-modal';
import styled, { createGlobalStyle } from 'styled-components';
import axios from 'axios';
import withAuthUser from '~/components/pageWrappers/withAuthUser';
import withAuthUserInfo from '~/components/pageWrappers/withAuthUserInfo';

import Header from '~/components/service-creator/header';
import ActionBar from './action-bar';
import EmailPreview from './email-preview';
import EmailResultsNav from '~/components/service-creator/email-results-nav';
import ConfigOutputBar from './config-ui';

const baseUri = (id) => `${process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN}/${id}`;

const GlobalStyle = createGlobalStyle`
  body {
    overflow: hidden;
  }
  .mail-container-hover {
    outline: 2px solid lightblue;
    cursor: pointer;
  }
  .eaio-field {
    outline: 4px solid lightblue;
  }
`;

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 64px 64px 1fr;

  height: 100vh;
  width: 100vw;
`;

const ContainerBody = styled.div`
  display: grid;
  grid-template-columns: 400px 1fr 480px;
  overflow: hidden;
`;

const Main = styled.main.attrs({
  className: 'border-l border-r',
})`
  overflow-y: scroll;
`;

const Aside = styled.aside`
  overflow-y: hidden;
`;

const AsideContainer = styled.div.attrs({
  className: 'bg-yellow-100 p-4',
})`
  height: 100%;
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: 1fr;

  & > div {
    max-width: 100%;
  }
`;

const AttachmentUnlockerApp = ({ router, ...props }) => {
  const {
    query: { q, uid, id: serviceId },
  } = router;

  const {
    AuthUserInfo: { token },
  } = props;

  const [isServiceIdLoading, setIsServiceIdLoading] = useState(!!serviceId);
  const [isServiceIdFetched, setIsServiceIdFetched] = useState(!!serviceId);
  const [serviceIdData, setServiceIdData] = useState(null);

  const [searchInput, setSearchInput] = useState('');

  const [triggerSearch, setTriggerSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [selectedSearchResultIndex, setSelectedSearchResultIndex] = useState(
    null,
  );

  const [
    isUnlockJobPendingServerResponse,
    setIsUnlockJobPendingServerResponse,
  ] = useState(null);
  const [
    isUnlockJobQueuedSuccessfully,
    setIsUnlockJobQueuedSuccessfully,
  ] = useState(null);
  const [unlockEmailBeingQueried, setUnlockEmailBeingQueried] = useState(false);
  const [unlockEmailReceived, setUnlockEmailReceived] = useState(false);
  const [
    isUnlockedAttachmentFetched,
    setIsUnlockedAttachmentFetched,
  ] = useState(false);
  const [pdfPasswordInput, setPdfPasswordInput] = useState('');
  const [attachmentBase64, setAttachmentBase64] = useState('');
  const [open, setOpen] = useState(false);
  const [autoUnlockSettings, setAutoUnlockSettings] = useState({
    past: false,
    future: true,
  });

  function handleChangeAutoUnlockSettings(key, value) {
    setAutoUnlockSettings({
      ...autoUnlockSettings,
      [key]: value,
    });
  }

  async function handleCreateUnlockService() {
    const { data: serviceResponse } = await axios.post(
      `${baseUri(uid)}/services`,
      {
        app: 'AUTO_UNLOCK',
        search_query: searchInput,
        unlock_password: pdfPasswordInput,
        cron: autoUnlockSettings.future,
      },
    );

    if (autoUnlockSettings.past) {
      await axios.post(`/api/apps/auto-unlock`, {
        token,
        uid,
        service_id: serviceResponse._id,
      });
    }
  }

  async function handleFetchAttachmentFilename({ messageId, attachmentId }) {
    // set filename in state and pass it to config-output-bar component where user can input password and submit request
    const { data } = await axios.post(`/api/fetch/attachment`, {
      messageId,
      attachmentId,
      token,
      uid,
    });

    setAttachmentBase64(`data:application/pdf;base64,${data.base64}`);
    setOpen(true);
  }

  function getFetchAttachmentProps(messageItem) {
    const { messageId, attachments } = messageItem;
    const [attachment] = attachments;
    const { id: attachmentId, filename } = attachment;
    return { messageId, attachmentId, filename };
  }

  async function handleCreateUnlockJob() {
    // send attachment id, user id etc
    // test unlock on server and send back an attachment
    try {
      const messageItem = searchResults[selectedSearchResultIndex];
      setIsUnlockJobPendingServerResponse(true);
      // Step 1: unlockResponse containing `pollQuery` guarantees that email was sent
      const { data: unlockResponse } = await axios.post(
        `/api/email-search/attachment-unlock`,
        {
          token,
          uid,
          pdfPasswordInput,
          ...getFetchAttachmentProps(messageItem),
        },
      );
      setIsUnlockJobPendingServerResponse(false);
      setIsUnlockJobQueuedSuccessfully(true);

      // Step 2: email arriving for `from:() subject:()` params matching the ones sent from our backend
      // guarantees that mail sending service (e.g. mailgun) is working as well
      setUnlockEmailBeingQueried(true);
      const timer = setInterval(() => {
        async function handle() {
          if (!unlockResponse.pollQuery) {
            clearInterval(timer);
            throw new Error('pollQuery not found!');
          }

          const { data: pollResponse } = await axios({
            method: 'post',
            url: `/api/email-search`,
            data: {
              uid,
              token,
              query: unlockResponse.pollQuery,
            },
          });

          if (
            Array.isArray(pollResponse.emails) &&
            pollResponse.emails.length
          ) {
            clearInterval(timer);
            setUnlockEmailReceived(true);
            setUnlockEmailBeingQueried(false);

            const [email] = pollResponse.emails;
            await handleFetchAttachmentFilename(getFetchAttachmentProps(email));
            setIsUnlockedAttachmentFetched(true);
          }
        }

        handle();
      }, 7000);
    } catch (e) {
      console.log(e);
      setIsUnlockJobQueuedSuccessfully(false);
    }
  }

  function resetData() {
    setSearchResults([]);
    setSelectedSearchResultIndex(null);
    setNextPageToken(null);
  }

  function handleChangeSearchInput(value) {
    resetData();
    setSearchInput(value);
  }

  async function handleSearchAction() {
    if (!serviceId) {
      window.history.pushState(
        '',
        '',
        `?q=${searchInput ? encodeURIComponent(searchInput) : ''}`,
      );
    }
    setTriggerSearch(false);
    try {
      setIsLoading(true);
      const reqParams = {
        uid,
        token,
        query: searchInput,
        has_attachment: true,
      };
      if (nextPageToken) {
        reqParams.nextPageToken = nextPageToken;
      }
      try {
        const response = await axios({
          method: 'post',
          url: `/api/email-search`,
          data: reqParams,
          timeout: 15000,
        });
        const { emails, nextPageToken: resNextPageToken } = response.data;
        setSearchResults(
          reqParams.nextPageToken ? [...searchResults, ...emails] : emails,
        );
        setNextPageToken(resNextPageToken);
        // if (emails.length) setSelectedSearchResultIndex(0);
        setIsLoading(false);
      } catch (e) {
        if (!nextPageToken) {
          // on first load, it's getting stuck for some reason
          if (Number(e.statusCode) > 500) {
            window.location.reload();
          }
        }
      }
    } catch (error) {
      console.log(error);
      setIsLoading(false);
    }
  }

  function handleClickEmailSubject(idx) {
    setSelectedSearchResultIndex(idx);
  }

  function getEmailFromHeader(sender) {
    const parts = sender.split('<');
    return parts.length === 2 ? parts[1].split('>')[0] : parts[0];
  }

  function handleFilterEmailsBySender(fromEmail) {
    handleChangeSearchInput(`from:(${getEmailFromHeader(fromEmail)})`);
    setTriggerSearch(true);
  }

  function handleFilterEmailsBySubject({ fromEmail, subject }) {
    handleChangeSearchInput(
      `from:(${getEmailFromHeader(fromEmail)}) subject:(${subject})`,
    );
    setTriggerSearch(true);
  }

  function handleFetchMoreMails() {
    setTriggerSearch(true);
  }

  useEffect(() => {
    async function perform() {
      if (serviceId) {
        setIsLoading(true);
        const { data: serviceData } = await axios.get(
          `${baseUri(uid)}/services/${serviceId}`,
        );
        setServiceIdData(serviceData);
        setIsServiceIdFetched(true);
        setIsLoading(false);
        setIsServiceIdLoading(false);
      }
    }

    perform();
  }, []);

  useEffect(() => {
    if (triggerSearch) {
      handleSearchAction();
    }
  }, [triggerSearch]);

  useEffect(() => {
    if (!token || isServiceIdLoading) {
      return;
    }
    setSearchInput(q);
    setTriggerSearch(true);
  }, [q, token]);

  useEffect(() => {
    if (!isServiceIdLoading && isServiceIdFetched) {
      const { search_query: argSearchQuery = '' } = serviceIdData;
      if (argSearchQuery) {
        handleChangeSearchInput(argSearchQuery);
      }
      setTriggerSearch(true);
    }
  }, [isServiceIdLoading, isServiceIdFetched]);

  const currentEmail =
    searchResults.length && selectedSearchResultIndex !== null
      ? searchResults[selectedSearchResultIndex]
      : null;

  return (
    <>
      <Head>
        <title>
          emailapi.io | {serviceId ? 'view service' : 'create new service'}
        </title>
      </Head>

      <GlobalStyle />

      <Container>
        <Header
          isLoading={isLoading}
          serviceId={serviceId}
          searchInput={searchInput}
          setTriggerSearch={setTriggerSearch}
          isServiceIdFetched={isServiceIdFetched}
          handleChangeSearchInput={handleChangeSearchInput}
        />
        <ActionBar
          isLoading={isLoading}
          searchResults={searchResults}
          nextPageToken={nextPageToken}
          handleFetchMoreMails={handleFetchMoreMails}
        />
        <ContainerBody>
          <EmailResultsNav
            isLoading={isLoading}
            isServiceIdFetched={isServiceIdFetched}
            searchResults={searchResults}
            selectedSearchResultIndex={selectedSearchResultIndex}
            handleClickEmailSubject={handleClickEmailSubject}
            handleFilterEmailsBySender={handleFilterEmailsBySender}
            handleFilterEmailsBySubject={handleFilterEmailsBySubject}
          />
          <Main>
            <EmailPreview
              showPreview={searchResults.length}
              messageItem={currentEmail}
            />
          </Main>
          <Aside>
            <AsideContainer>
              <ConfigOutputBar
                searchInput={searchInput}
                messageItem={currentEmail}
                pdfPasswordInput={pdfPasswordInput}
                setPdfPasswordInput={setPdfPasswordInput}
                handleCreateUnlockJob={handleCreateUnlockJob}
                handleCreateUnlockService={handleCreateUnlockService}
                autoUnlockSettings={autoUnlockSettings}
                handleChangeAutoUnlockSettings={handleChangeAutoUnlockSettings}
                handleClickAttachmentFilename={handleFetchAttachmentFilename}
                isUnlockJobPendingServerResponse={
                  isUnlockJobPendingServerResponse
                }
                isUnlockJobQueuedSuccessfully={isUnlockJobQueuedSuccessfully}
                unlockEmailBeingQueried={unlockEmailBeingQueried}
                unlockEmailReceived={unlockEmailReceived}
                isUnlockedAttachmentFetched={isUnlockedAttachmentFetched}
              />
            </AsideContainer>
          </Aside>
        </ContainerBody>
      </Container>
      <>
        <Modal open={open} onClose={() => setOpen(false)}>
          <iframe
            src={attachmentBase64}
            title="preview attachment"
            style={{ height: '100vh', width: '1024px' }}
          />
        </Modal>
      </>
    </>
  );
};

export default withAuthUser(
  withAuthUserInfo(withRouter(AttachmentUnlockerApp)),
);
