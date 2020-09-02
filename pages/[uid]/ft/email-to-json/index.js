import React, { useState, useEffect } from 'react';
import { withRouter } from 'next/router';
import styled from 'styled-components';
import axios from 'axios';
import Noty from 'noty';
import flatten from 'lodash/flatten';
import qs from 'qs';

import withAuthUser from '~/components/pageWrappers/withAuthUser';
import withAuthUserInfo from '~/components/pageWrappers/withAuthUserInfo';

import FeatureApp from '~/components/pageWrappers/AppWrapper';
import EmailPreview from '~/components/ft/email-to-json/email-preview';
import ConfigOutputBar from '~/components/ft/email-to-json/config-output-bar';
import generateKeyFromName from '~/src/ft/email-to-json/generateKeyFromName';
import applyConfigOnEmail from '~/src/ft/email-to-json/applyConfigOnEmail';
import ensureConfiguration from '~/src/ft/email-to-json/ensureConfiguration';

const baseUri = (id) => `${process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN}/${id}`;

const Main = styled.main`
  overflow-y: scroll;
`;

const Aside = styled.aside`
  overflow-y: hidden;
`;

function FeatureAutoUnlockApp(props) {
  const {
    isLoading,
    searchInput,
    searchResults,
    selectedSearchResultIndex,
    setSelectedSearchResultIndex,
    router,
    serviceIdData,
    isServiceIdFetched,
  } = props;

  const {
    query: { uid, id: serviceId },
  } = router;

  const {
    AuthUserInfo: { token },
  } = props;

  console.log({ isLoading });
  if (isLoading) {
    return <>Loading...</>;
  }

  const [matchedSearchResults, setMatchedSearchResults] = useState([]);
  const [isFirstMatchSelectedOnLoad, setIsFirstMatchSelectedOnLoad] = useState(
    false,
  );

  const defaultConfiguration = {
    fields: [],
  };
  const [configurations, setConfiguration] = useState([defaultConfiguration]);

  const [parsedData, setParsedData] = useState([]);

  const [localFieldNames, setLocalFieldName] = useState({});

  const [isCreateApiPending, setIsCreateApiPending] = useState(false);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [serviceIdConfigurations, setServiceIdConfigurations] = useState([]);
  const [
    isServiceIdConfigurationsFetched,
    setIsServiceIdConfigurationsFetched,
  ] = useState(false);
  const [
    isServiceIdConfigurationsLoading,
    setIsServiceIdConfigurationsLoading,
  ] = useState(false);

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
    console.log({ extractedData });
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

    // if (serviceId) {
    //   const updatedConfig = {
    //     ...serviceIdData,
    //     configurations: newConfigIds,
    //   };
    //   const endpointType = 'services';
    //   const endpoint = `${baseUri(uid)}/${endpointType}/${updatedConfig._id}`;
    //   await axios.put(endpoint, updatedConfig);
    //   return serviceId;
    // }

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
        '/[uid]/ft/auto-unlock',
        `/${uid}/ft/auto-unlock?serviceId=${newServiceId}&q=${encodeURIComponent(
          qs.parse(window.location.search.split('?')[1]).q,
        )}`,
      );
    }
  }

  function doPreviewParsedData() {
    setIsPreviewMode(!isPreviewMode);
  }

  useEffect(() => {
    async function perform() {
      if (
        isServiceIdFetched &&
        serviceIdData &&
        !isServiceIdConfigurationsFetched &&
        !isServiceIdConfigurationsLoading
      ) {
        console.log('qre');

        if (Array.isArray(serviceIdData.configurations)) {
          const remoteConfigUris = Promise.all(
            serviceIdData.configurations.map((configId) =>
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

        setIsServiceIdConfigurationsFetched(true);
        setIsServiceIdConfigurationsLoading(false);
      }
    }

    perform();
  }, [serviceIdData, isServiceIdFetched]);

  useEffect(() => {
    if (
      Array.isArray(serviceIdConfigurations) &&
      serviceIdConfigurations.length
    ) {
      console.log('gfs');
      setConfiguration(
        serviceIdConfigurations.map(({ fields }) => ({
          fields,
        })),
      );
    }
  }, [serviceIdConfigurations]);

  useEffect(() => {
    if (searchResults.length && configurations.length) {
      console.log('oip');
      doExtractDataForConfig();
    }
  }, [configurations, searchResults]);

  return (
    <>
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
          configuration={configurations[selectedConfigurationIndex]}
        />
      </Main>
      <Aside>
        <ConfigOutputBar
          isCreateApiPending={isCreateApiPending}
          onClickCreateAPI={onClickCreateAPI}
          searchResults={searchResults}
          matchedSearchResults={matchedSearchResults}
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
        />
      </Aside>
    </>
  );
}

function AutoUnlockApp({ AuthUserInfo, router }) {
  return (
    <FeatureApp AuthUserInfo={AuthUserInfo}>
      {({
        isLoading,
        setIsLoading,
        searchInput,
        searchResults,
        serviceIdData,
        isServiceIdLoading,
        isServiceIdFetched,
        selectedSearchResultIndex,
        setSelectedSearchResultIndex,
      }) => {
        return (
          <FeatureAutoUnlockApp
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            searchInput={searchInput}
            searchResults={searchResults}
            serviceIdData={serviceIdData}
            isServiceIdLoading={isServiceIdLoading}
            isServiceIdFetched={isServiceIdFetched}
            selectedSearchResultIndex={selectedSearchResultIndex}
            setSelectedSearchResultIndex={setSelectedSearchResultIndex}
            router={router}
            AuthUserInfo={AuthUserInfo}
          />
        );
      }}
    </FeatureApp>
  );
}

export default withAuthUser(withAuthUserInfo(withRouter(AutoUnlockApp)));
