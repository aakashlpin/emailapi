/* eslint-disable no-irregular-whitespace */
/* eslint-disable no-alert */
/* eslint-disable no-underscore-dangle */
import React, { useState, useEffect } from 'react';
import { withRouter } from 'next/router';
import Head from 'next/head';
import 'react-responsive-modal/styles.css';
import '~/css/react-responsive-modal-override.css';
import { Modal } from 'react-responsive-modal';
import Noty from 'noty';
import flatten from 'lodash/flatten';
import styled, { createGlobalStyle } from 'styled-components';
import axios from 'axios';
import withAuthUser from '~/components/pageWrappers/withAuthUser';
import withAuthUserInfo from '~/components/pageWrappers/withAuthUserInfo';

import generateKeyFromName from '~/components/admin/email/fns/generateKeyFromName';
import applyConfigOnEmail from '~/src/isomorphic/applyConfigOnEmail';
import ensureConfiguration from '~/src/isomorphic/ensureConfiguration';

import Header from '~/components/service-creator/header';
import ActionBar from '~/components/service-creator/action-bar';
import EmailPreview from '~/components/service-creator/email-preview';
import EmailResultsNav from '~/components/service-creator/email-results-nav';
import ConfigOutputBar from './config-ui';

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

const Main = styled.main`
  overflow-y: scroll;
`;

const Aside = styled.aside`
  overflow-y: hidden;
`;

const EmailJsonApp = ({ router, ...props }) => {
  const {
    query: { q, uid, id: serviceId },
  } = router;

  const {
    AuthUserInfo: { token },
  } = props;

  const [isServiceIdLoading, setIsServiceIdLoading] = useState(!!serviceId);
  const [isServiceIdFetched, setIsServiceIdFetched] = useState(!!serviceId);
  const [serviceIdData, setServiceIdData] = useState(null);
  const [serviceIdConfigurations, setServiceIdConfigurations] = useState([]);

  const [isCreateApiPending, setIsCreateApiPending] = useState(false);
  const [isFirstMatchSelectedOnLoad, setIsFirstMatchSelectedOnLoad] = useState(
    false,
  );

  const [searchInput, setSearchInput] = useState('');

  const [triggerSearch, setTriggerSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [selectedSearchResultIndex, setSelectedSearchResultIndex] = useState(
    null,
  );

  const [matchedSearchResults, setMatchedSearchResults] = useState([]);

  const defaultConfiguration = {
    fields: [],
  };
  const [configurations, setConfiguration] = useState([defaultConfiguration]);

  const [parsedData, setParsedData] = useState([]);

  const [localFieldNames, setLocalFieldName] = useState({});

  const [attachmentBase64, setAttachmentBase64] = useState('');
  const [open, setOpen] = useState(false);

  function resetData() {
    setSearchResults([]);
    setSelectedSearchResultIndex(null);
    setMatchedSearchResults([]);
    setConfiguration([defaultConfiguration]);
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

  function handleAddAnotherConfiguration(configuration) {
    setConfiguration([...configurations, configuration]);
  }

  function handleClickEmailContent({ selector, name }) {
    if (
      matchedSearchResults.length &&
      !matchedSearchResults.includes(selectedSearchResultIndex)
    ) {
      const fieldName = name || `Field 1`;
      handleAddAnotherConfiguration({
        ...defaultConfiguration,
        fields: [
          {
            selector,
            fieldName,
            fieldKey: generateKeyFromName(fieldName),
            formatter: null,
          },
        ],
      });
      return;
    }
    setConfiguration(
      configurations.map((config, index) => {
        const fieldName = name || `Field ${config.fields.length + 1}`;
        return index === configurations.length - 1
          ? {
              ...config,
              fields: [
                ...config.fields,
                {
                  selector,
                  fieldName,
                  fieldKey: generateKeyFromName(fieldName),
                },
              ],
            }
          : config;
      }),
    );
  }

  async function handleClickAttachmentFilename({ messageId, attachmentId }) {
    const { data } = await axios.post(`/api/fetch/attachment`, {
      messageId,
      attachmentId,
      token,
      uid,
    });

    setAttachmentBase64(`data:application/pdf;base64,${data.base64}`);
    setOpen(true);
  }

  function processConfigOnSearchResults(config) {
    const dataFromSearchResults = searchResults.map(
      ({ message }, resultId) => ({
        ...applyConfigOnEmail(message, config),
        resultId,
      }),
    );

    return dataFromSearchResults.filter((item) =>
      ensureConfiguration(item, config),
    );
  }

  function doExtractDataForConfig() {
    const extractedData = configurations.map(processConfigOnSearchResults);
    setMatchedSearchResults(
      extractedData
        .map((extractedConfigData) =>
          extractedConfigData.map(({ resultId }) => resultId),
        )
        .flat(Infinity),
    );

    setParsedData(extractedData);
    if (!isFirstMatchSelectedOnLoad) {
      setSelectedSearchResultIndex(
        extractedData.length && extractedData[0].length
          ? extractedData[0][0].resultId
          : 0,
      );
      setIsFirstMatchSelectedOnLoad(true);
    }
  }

  async function doCreateConfigAndServiceOnRemote() {
    const configCreatePromises = Promise.all(
      configurations.map((config) => {
        const { fields } = config;
        return axios.post(`${baseUri(uid)}/configurations`, {
          fields: fields.filter((field) => field),
        });
      }),
    );

    const configResponses = await configCreatePromises;
    const newConfigIds = configResponses.map((response) => response.data._id);

    if (serviceId) {
      const updatedConfig = {
        ...serviceIdData,
        configurations: newConfigIds,
      };
      const endpointType = 'services';
      const endpoint = `${baseUri(uid)}/${endpointType}/${updatedConfig._id}`;
      await axios.put(endpoint, updatedConfig);
      return serviceId;
    }

    /**
     * REFACTOR:
     * each service can contain a prop called `app` whose value will be ENUM
     * basis ENUM value, further props will be expected
     *
     * switch (SERVICE.INSTALLED_APP) {
     *    case APPS.EMAIL_TO_JSON: {
     *      // consider .configurations property in the service object
     *    }
     *    case APPS.AUTO_UNLOCK: {
     *      // consider .unlockPassword property in the service object
     *    }
     * }
     */
    const { data: serviceResponse } = await axios.post(
      `${baseUri(uid)}/services`,
      {
        app: 'EMAIL_TO_JSON',
        search_query: searchInput,
        configurations: newConfigIds,
        cron: true,
      },
    );

    return serviceResponse._id;
  }

  function handleChangeConfiguration({ configIndex, updatedConfig }) {
    setConfiguration(
      configurations.map((config, mapIdx) =>
        mapIdx === configIndex ? updatedConfig : config,
      ),
    );
  }

  function handleDeleteFieldFromConfiguration({ configIndex, fieldKey }) {
    const config = configurations[configIndex];
    handleChangeConfiguration({
      configIndex,
      updatedConfig: {
        ...config,
        fields: config.fields.map((field) =>
          field && field.fieldKey !== fieldKey ? field : null,
        ),
      },
    });
  }

  function doPreviewParsedData() {
    setIsPreviewMode(!isPreviewMode);
  }

  async function handleCreateAPI() {
    /**
     * 1. POST a Service
     * 2. PUT Configuration on Service
     * 3. POST /populate-service and return API endpoint immediately. Task in Background.
     * 4. GET on API endpoint to return 404 until ready, and send the user an email when it's ready
     */

    //  [TODO]: proxy all API calls through NextJS server
    if (!searchInput) {
      new Noty({
        theme: 'relax',
        text: `Cannot create service without any search query!`,
      }).show();
      return null;
    }
    const newServiceId = await doCreateConfigAndServiceOnRemote();
    const { data: apiEndpointResponse } = await axios.post(
      '/api/apps/email-to-json',
      {
        uid,
        token,
        service_id: newServiceId,
      },
    );

    return { serviceId: newServiceId, endpoint: apiEndpointResponse.endpoint };
  }

  async function onClickCreateAPI() {
    if (
      !flatten(parsedData).every((item) =>
        Object.keys(item).every((key) => item[key] !== 'COULD_NOT_DETERMINE'),
      )
    ) {
      new Noty({
        theme: 'relax',
        text:
          'Extracted data contains fields that could not be determined. Please remove them!',
      }).show();
      return;
    }
    setIsCreateApiPending(true);
    const apiResponse = await handleCreateAPI();
    if (!apiResponse) {
      // eslint-disable-next-line consistent-return
      return;
    }
    const { serviceId: newServiceId, endpoint } = apiResponse;
    new Noty({
      theme: 'relax',
      text: `Fantastic! Your data when ready will be available <a class="underline" href="${endpoint}" target="_blank">here</a>. We'll send you an email when it's ready!`,
    }).show();

    setIsCreateApiPending(false);
    if (!serviceId) {
      router.push(
        '/[uid]/ft/email-json/[id]',
        `/${uid}/ft/email-json/${newServiceId}`,
        {
          shallow: true,
        },
      );
    }
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

        if (Array.isArray(serviceData.configurations)) {
          const remoteConfigUris = Promise.all(
            serviceData.configurations.map((configId) =>
              axios.get(`${baseUri(uid)}/configurations/${configId}`),
            ),
          );

          const remoteConfigResponses = await remoteConfigUris;
          const configurationsData = remoteConfigResponses.map(
            ({ data }) => data,
          );
          setServiceIdConfigurations(configurationsData);
        } else {
          setServiceIdConfigurations([defaultConfiguration]);
        }

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
    console.log(configurations);
    doExtractDataForConfig();
  }, [configurations]);

  useEffect(() => {
    if (
      isServiceIdFetched &&
      !isServiceIdLoading &&
      configurations.length &&
      searchResults.length
    ) {
      doExtractDataForConfig();
    }
  }, [configurations, isServiceIdFetched, isServiceIdLoading, searchResults]);

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
      setConfiguration(
        serviceIdConfigurations.map(({ fields }) => ({
          fields,
        })),
      );
      setTriggerSearch(true);
    }
  }, [isServiceIdLoading, isServiceIdFetched]);

  const selectedEmailsConfigIdx = parsedData.findIndex(
    (byConfigIdxParsedData) =>
      !!byConfigIdxParsedData.find(
        (item) => item.resultId === selectedSearchResultIndex,
      ),
  );

  const selectedConfigurationIndex =
    selectedEmailsConfigIdx === -1 ? null : selectedEmailsConfigIdx;

  function doDeleteCurrentConfiguration() {
    if (configurations.length === 1) {
      return setConfiguration([defaultConfiguration]);
    }
    return setConfiguration(
      configurations.filter(
        (_config, configIdx) => selectedConfigurationIndex !== configIdx,
      ),
    );
  }

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
          uid={uid}
          token={token}
          isLoading={isLoading}
          parsedData={parsedData}
          searchInput={searchInput}
          searchResults={searchResults}
          isPreviewMode={isPreviewMode}
          nextPageToken={nextPageToken}
          onClickCreateAPI={onClickCreateAPI}
          isCreateApiPending={isCreateApiPending}
          doPreviewParsedData={doPreviewParsedData}
          handleFetchMoreMails={handleFetchMoreMails}
          matchedSearchResults={matchedSearchResults}
          GOOGLE_CLIENT_ID={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        />
        <ContainerBody>
          <EmailResultsNav
            isLoading={isLoading}
            isServiceIdFetched={isServiceIdFetched}
            searchResults={searchResults}
            matchedSearchResults={matchedSearchResults}
            selectedSearchResultIndex={selectedSearchResultIndex}
            handleClickEmailSubject={handleClickEmailSubject}
            handleFilterEmailsBySender={handleFilterEmailsBySender}
            handleFilterEmailsBySubject={handleFilterEmailsBySubject}
          />
          <Main>
            <EmailPreview
              showPreview={searchResults.length}
              messageItem={
                searchResults.length && selectedSearchResultIndex !== null
                  ? searchResults[selectedSearchResultIndex]
                  : null
              }
              message={
                searchResults.length && selectedSearchResultIndex !== null
                  ? searchResults[selectedSearchResultIndex].message
                  : null
              }
              isHtmlContent={
                searchResults.length && selectedSearchResultIndex !== null
                  ? searchResults[selectedSearchResultIndex].isHtmlContent
                  : null
              }
              selectedSearchResultIndex={selectedSearchResultIndex}
              handleClickEmailContent={handleClickEmailContent}
              onDeleteFieldFromConfiguration={(fieldKey) =>
                handleDeleteFieldFromConfiguration({
                  configIndex: selectedConfigurationIndex,
                  fieldKey,
                })
              }
              handleClickAttachmentFilename={handleClickAttachmentFilename}
              configuration={configurations[selectedConfigurationIndex]}
            />
          </Main>
          <Aside>
            <ConfigOutputBar
              isPreviewMode={isPreviewMode}
              searchInput={searchInput}
              parsedData={parsedData}
              selectedConfigurationIndex={selectedConfigurationIndex}
              selectedSearchResultIndex={selectedSearchResultIndex}
              configurations={configurations}
              localFieldNames={localFieldNames}
              setLocalFieldName={setLocalFieldName}
              handleChangeConfiguration={handleChangeConfiguration}
              doDeleteCurrentConfiguration={doDeleteCurrentConfiguration}
              doPreviewParsedData={doPreviewParsedData}
              handleChangeSearchInput={handleChangeSearchInput}
              setTriggerSearch={setTriggerSearch}
            />
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

export default withAuthUser(withAuthUserInfo(withRouter(EmailJsonApp)));
