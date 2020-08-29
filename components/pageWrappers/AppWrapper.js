import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { withRouter } from 'next/router';
import Head from 'next/head';
import styled, { createGlobalStyle } from 'styled-components';
import Header from '~/components/service-creator/header';
import ActionBar from '~/components/service-creator/action-bar';

import EmailResultsNav from '~/components/service-creator/email-results-nav';

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
  grid-template-columns: 400px 1fr 600px;
  overflow: hidden;
`;

function AppWrapper({ children, router, ...props }) {
  const {
    query: { uid },
  } = router;

  const {
    AuthUserInfo: { token },
  } = props;

  const [searchInput, setSearchInput] = useState('');

  const [triggerSearch, setTriggerSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [selectedSearchResultIndex, setSelectedSearchResultIndex] = useState(
    null,
  );

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
    window.history.pushState(
      '',
      '',
      `?q=${searchInput ? encodeURIComponent(searchInput) : ''}`,
    );
    setTriggerSearch(false);
    try {
      setIsLoading(true);
      const reqParams = {
        uid,
        token,
        query: searchInput,
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
    if (triggerSearch) {
      handleSearchAction();
    }
  }, [triggerSearch]);

  return (
    <>
      <Head>
        <title>emailapi.io | create new app</title>
      </Head>

      <GlobalStyle />

      <Container>
        <Header
          isLoading={isLoading}
          searchInput={searchInput}
          setTriggerSearch={setTriggerSearch}
          handleChangeSearchInput={handleChangeSearchInput}
        />
        <ActionBar
          uid={uid}
          token={token}
          isLoading={isLoading}
          searchInput={searchInput}
          searchResults={searchResults}
          nextPageToken={nextPageToken}
          handleFetchMoreMails={handleFetchMoreMails}
          GOOGLE_CLIENT_ID={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        />
        <ContainerBody>
          <EmailResultsNav
            isLoading={isLoading}
            searchResults={searchResults}
            selectedSearchResultIndex={selectedSearchResultIndex}
            handleClickEmailSubject={handleClickEmailSubject}
            handleFilterEmailsBySender={handleFilterEmailsBySender}
            handleFilterEmailsBySubject={handleFilterEmailsBySubject}
          />
          {children({
            selectedEmail: searchResults[selectedSearchResultIndex] || {},
          })}
        </ContainerBody>
      </Container>
      {/* <>
        <Modal open={open} onClose={() => setOpen(false)}>
          <iframe
            src={attachmentBase64}
            title="preview attachment"
            style={{ height: '100vh', width: '1024px' }}
          />
        </Modal>
      </> */}
    </>
  );
}

export default withRouter(AppWrapper);
