import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styled, { createGlobalStyle } from 'styled-components';
import Header from '~/components/ft/header';
import ActionBar from '~/components/ft/action-bar';
import EmailResultsNav from '~/components/ft/email-results-nav';

const baseUri = (id) => `${process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN}/${id}`;

require('noty/lib/noty.css');
require('noty/lib/themes/relax.css');

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

function AppWrapper({ children, ...props }) {
  const router = useRouter();
  const {
    query: { uid, serviceId, q },
  } = router;

  const {
    emailSearchReqParams = {},
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
  const [isServiceIdLoading, setIsServiceIdLoading] = useState(!!serviceId);
  const [isServiceIdFetched, setIsServiceIdFetched] = useState(!!serviceId);
  const [serviceIdData, setServiceIdData] = useState(null);

  function resetData() {
    setSearchResults([]);
    setSelectedSearchResultIndex(null);
    setNextPageToken(null);
  }

  function handleChangeSearchInput(value) {
    resetData();
    setSearchInput(value);
  }

  async function fetchEmails(
    overrideReqParams = {},
    { hardReset = false } = {},
  ) {
    const reqParams = {
      uid,
      token,
      query: searchInput,
      ...emailSearchReqParams,
    };
    if (nextPageToken && !hardReset) {
      reqParams.nextPageToken = nextPageToken;
    }

    setIsLoading(true);
    const response = await axios({
      method: 'post',
      url: `/api/email-search`,
      data: { ...reqParams, ...overrideReqParams },
      timeout: 15000,
    });
    const { emails, nextPageToken: resNextPageToken } = response.data;
    setSearchResults(
      reqParams.nextPageToken ? [...searchResults, ...emails] : emails,
    );
    setNextPageToken(resNextPageToken);
    setIsLoading(false);
  }

  async function handleSearchAction() {
    window.history.pushState(
      '',
      '',
      `?q=${searchInput ? encodeURIComponent(searchInput) : ''}`,
    );
    setTriggerSearch(false);
    try {
      await fetchEmails();
      if (searchResults.length) setSelectedSearchResultIndex(0);
    } catch (e) {
      console.log(e);
      if (!nextPageToken) {
        // on first load, it's getting stuck for some reason
        if (Number(e.statusCode) > 500) {
          window.location.reload();
        }
      }
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
    console.log('qew');
    if (triggerSearch) {
      handleSearchAction();
    }
  }, [triggerSearch]);

  useEffect(() => {
    console.log('jty');
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
    console.log('bcv');
    if (
      !token ||
      typeof q === 'undefined' ||
      (searchInput && searchInput === q)
    ) {
      return;
    }
    console.log({ searchInput, q });
    setSearchInput(q);
    setTriggerSearch(true);
  }, [q, token]);

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
            isLoading,
            searchInput,
            searchResults,
            serviceIdData,
            isServiceIdLoading,
            isServiceIdFetched,
            selectedSearchResultIndex,
            setIsLoading,
            setSelectedSearchResultIndex,
            fetchEmails,
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

export default AppWrapper;
