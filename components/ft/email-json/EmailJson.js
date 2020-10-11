/* eslint-disable no-irregular-whitespace */
/* eslint-disable no-alert */
/* eslint-disable no-underscore-dangle */
import React, { useState, useEffect } from 'react';
import { withRouter } from 'next/router';
import dynamic from 'next/dynamic';
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
import RulePreview from './rules-preview';

import { Button, FlexEnds } from '~/components/common/Atoms';

const Grid = dynamic(() => import('react-json-grid'), { ssr: false });

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

/**
 *
 * rule = {
 *  type: 'row_whitelist',
 *  name: 'Futures trading',
 *  camelot_method: 'lattice',
 *  probable_table_sequence: 4,
 *  table_column_count: 14,
 *  where: [{
 *    type: 'equals/startsWith/endsWith/contains',
 *    value: 'value',
 *    colIndex: 2
 *  }]
 * }
 */

const ExtractionRules = ({ data, rules, setRules }) => {
  function handleAddAnotherCellCheck({ ruleId }) {
    setRules(
      rules.map((rule, idx) =>
        ruleId !== idx
          ? rule
          : {
              ...rule,
              where: [
                ...rule.where,
                {
                  type: '',
                  value: '',
                  colIndex: null,
                },
              ],
            },
      ),
    );
  }

  function onClickRemoveCheck({ ruleId, whereId }) {
    setRules(
      rules.map((rule, idx) =>
        ruleId !== idx
          ? rule
          : {
              ...rule,
              where: rule.where.filter((_, whereIdx) => whereId !== whereIdx),
            },
      ),
    );
  }

  function setRuleType({ ruleId, type }) {
    setRules(
      rules.map((rule, idx) =>
        ruleId !== idx
          ? rule
          : {
              ...rule,
              type,
            },
      ),
    );
  }

  function setKeyPairAtWhere({ ruleId, whereId, ...props }) {
    setRules(
      rules.map((rule, idx) =>
        ruleId !== idx
          ? rule
          : {
              ...rule,
              where: rule.where.map((whereRule, whereIdx) =>
                whereId !== whereIdx
                  ? whereRule
                  : {
                      ...whereRule,
                      ...props,
                    },
              ),
            },
      ),
    );
  }

  function setColIndexOnWhereRule({ colIndex, ruleId, whereId }) {
    setKeyPairAtWhere({ ruleId, whereId, colIndex });
  }

  function setWhereRuleType({ type, ruleId, whereId }) {
    setKeyPairAtWhere({ ruleId, whereId, type });
  }

  function setWhereValue({ value, ruleId, whereId }) {
    setKeyPairAtWhere({ value, whereId, ruleId });
  }

  return (
    <div className="mb-8">
      {rules.map((rule, ruleId) => (
        <div key={`rule_${ruleId}`}>
          <p className="font-bold">{ruleId + 1}. Rule Definition</p>{' '}
          <select
            className="border border-1 block"
            value={rule.type}
            onChange={(e) => setRuleType({ ruleId, type: e.target.value })}
          >
            <option value="row_whitelist">Include Rows</option>
            <option value="row_blacklist">Exclude Rows</option>
          </select>{' '}
          {rule.where.map((whereRule, whereId) => (
            <div key={`whererule_${whereId}`}>
              <span>if a cell value at column index</span>{' '}
              <input
                type="text"
                className="border border-1 w-8"
                value={whereRule.colIndex}
                onChange={(e) =>
                  setColIndexOnWhereRule({
                    colIndex: e.target.value,
                    ruleId,
                    whereId,
                  })
                }
              />{' '}
              <select
                className="border border-1"
                value={whereRule.type}
                onChange={(e) =>
                  setWhereRuleType({ ruleId, whereId, type: e.target.value })
                }
              >
                <option value="cell_startsWith">starts with</option>
                <option value="cell_endsWith">ends with</option>
                <option value="cell_equals">is exactly</option>
                <option value="cell_contains">contains</option>
                {whereRule.colIndex ? (
                  <option value="cell_notEmpty">is not empty</option>
                ) : null}
              </select>{' '}
              {whereRule.type !== 'cell_notEmpty' ? (
                <input
                  type="text"
                  className="border border-1"
                  value={whereRule.value}
                  onChange={(e) =>
                    setWhereValue({ ruleId, whereId, value: e.target.value })
                  }
                />
              ) : null}{' '}
              <Button
                onClick={() =>
                  onClickRemoveCheck({
                    ruleId,
                    whereId,
                  })
                }
              >
                x Remove Check
              </Button>
            </div>
          ))}
          <Button
            className="block mb-8"
            onClick={() => handleAddAnotherCellCheck({ ruleId })}
          >
            + Add another cell check
          </Button>
          <RulePreview rule={rules[ruleId]} data={data} />
        </div>
      ))}
    </div>
  );
};

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
  const [extractionRules, setExtractionRules] = useState([]);

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

  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState(null);

  async function handleClickAttachmentFilename({ messageId, attachmentId }) {
    const { data } = await axios.post(`/api/fetch/attachment`, {
      messageId,
      attachmentId,
      token,
      uid,
    });

    setAttachmentBase64(`data:application/pdf;base64,${data.base64}`);
    setSelectedMessageId(messageId);
    setSelectedAttachmentId(attachmentId);
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

  const [isSyncIntegrationSelected, setIsSyncIntegrationSelected] = useState(
    !!serviceId,
  );
  function handleClickSyncIntegrations() {
    setIsSyncIntegrationSelected(true);
  }

  function handleChangeGSheetId(gSheetId) {
    setServiceIdData({
      ...serviceIdData,
      gsheet_id: gSheetId,
    });
  }

  function handleChangePreSyncWebhook(preSyncWebhook) {
    setServiceIdData({
      ...serviceIdData,
      presync_webhook: preSyncWebhook,
    });
  }

  async function onSubmitSyncToGoogleSheet() {
    const {
      gsheet_id: gSheetId,
      presync_webhook: preSyncWebhook,
    } = serviceIdData;

    await axios.post(`/api/apps/email-to-json/integrations/google-sheet`, {
      uid,
      token,
      service_id: serviceId,
      gsheet_id: gSheetId,
      presync_webhook: preSyncWebhook,
    });
  }

  const [extractedDataFromPDF, setExtractedDataFromPDF] = useState(null);
  const [tableDataForExtractionRule, setTableDataForExtractionRule] = useState(
    null,
  );
  const [camelotMethod, setCamelotMethod] = useState('lattice');
  const [camelotScale, setCamelotScale] = useState(null);
  const [attachmentPassword, setAttachmentPassword] = useState(null);

  async function onClosePDFPreview() {
    setExtractedDataFromPDF(null);
    setTableDataForExtractionRule(null);
    setCamelotMethod('lattice');
    setCamelotScale(null);
    setAttachmentPassword(null);
    setExtractionRules([]);
    setOpen(false);
  }

  async function handleFetchExtractDataFromPDF() {
    const { data: extractedData } = await axios.post(
      `/api/fetch/tables-from-attachment`,
      {
        uid,
        token,
        messageId: selectedMessageId,
        attachmentId: selectedAttachmentId,
        attachmentPassword,
        camelotMethod,
        camelotScale,
      },
    );

    setExtractedDataFromPDF(extractedData);
  }

  async function onCreateExtractionRule() {
    const ruleConfig = {
      type: null,
      where: [],
    };
    setExtractionRules([...extractionRules, ruleConfig]);
  }

  const [selectedTableId, setSelectedTableId] = useState(null);

  function onClickSelectTable({ id }) {
    setSelectedTableId(id);
    setTableDataForExtractionRule(
      extractedDataFromPDF.filter((_, idx) => id === idx)[0],
    );
  }

  function onClickSavePDFExtractionRules(e) {
    e.preventDefault();
    setOpen(false);
  }

  async function onClickPreviewExtractionRules(e) {
    e.preventDefault();

    const {
      data: { dataEndpoint, statusCheckerEndpoint },
    } = await axios.post('/api/fetch/preview-attachment-rules', {
      uid,
      token,
      on_previous_emails_count: 10,
      search_query: searchInput,
      selected_table_data: extractedDataFromPDF[selectedTableId],
      camelot_method: camelotMethod,
      camelot_scale: camelotScale,
      rules: extractionRules,
    });

    window.open(dataEndpoint, '_blank');

    const statusCheckTimer = setInterval(() => {
      async function check() {
        const { data: statusData } = await axios(statusCheckerEndpoint);
        if (statusData.success) {
          clearInterval(statusCheckTimer);
          return;
        }
        if (statusData.pending) {
          const {
            total_jobs: totalJobs,
            completed_jobs: completedJobs,
            pending_jobs: pendingJobs,
          } = statusData;

          if (totalJobs) {
            console.log(
              `${completedJobs}/${totalJobs} completed! ${pendingJobs} pending...`,
            );
          }
        }
      }

      check();
    }, 10 * 1000);
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
          serviceId={serviceId}
          parsedData={parsedData}
          searchInput={searchInput}
          searchResults={searchResults}
          isPreviewMode={isPreviewMode}
          nextPageToken={nextPageToken}
          onClickCreateAPI={onClickCreateAPI}
          isCreateApiPending={isCreateApiPending}
          doPreviewParsedData={doPreviewParsedData}
          handleFetchMoreMails={handleFetchMoreMails}
          handleClickSyncIntegrations={handleClickSyncIntegrations}
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
              isSyncIntegrationSelected={isSyncIntegrationSelected}
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
              gSheetId={serviceIdData && serviceIdData.gsheet_id}
              handleChangeGSheetId={handleChangeGSheetId}
              preSyncWebhook={serviceIdData && serviceIdData.presync_webhook}
              handleChangePreSyncWebhook={handleChangePreSyncWebhook}
              onSubmitSyncToGoogleSheet={onSubmitSyncToGoogleSheet}
              extractionRules={extractionRules}
              extractedData={extractedDataFromPDF}
            />
          </Aside>
        </ContainerBody>
      </Container>
      <>
        <Modal
          open={open}
          onClose={onClosePDFPreview}
          style={{ width: '100vw' }}
        >
          <div className="grid" style={{ gridTemplateColumns: '50% 1fr' }}>
            <iframe
              src={attachmentBase64}
              title="preview attachment"
              style={{ height: '100vh', width: '100%' }}
            />
            <div className="p-4">
              <FlexEnds className="pr-12">
                <h3 className="text-xl mb-2">Extract data from PDF</h3>
                {/* [TODO] add a helper question here asking */}
                {/* Is the PDF locked with password? */}
                {/* on clicking reveal an input box to accept password */}
                <div>
                  <Button
                    onClick={onClickPreviewExtractionRules}
                    className="mr-4"
                  >
                    Preview API
                  </Button>
                  <Button onClick={onClickSavePDFExtractionRules}>
                    Close with Save
                  </Button>
                </div>
              </FlexEnds>

              <label htmlFor="camelotMethod">
                Technique:
                <div className="relative">
                  <select
                    className="mb-4 block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    name="camelotMethod"
                    id="camelotMethod"
                    value={camelotMethod}
                    onChange={(e) => setCamelotMethod(e.target.value)}
                  >
                    <option value="lattice">Lattice</option>
                    <option value="stream">Stream</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </label>

              {camelotMethod === 'lattice' ? (
                <label htmlFor="camelotScale">
                  Lattice Scale:
                  <input
                    id="camelotScale"
                    type="text"
                    value={camelotScale}
                    onChange={(e) => setCamelotScale(e.target.value)}
                    className="mb-4 block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                  />
                </label>
              ) : null}

              {camelotMethod === 'lattice' ? (
                <label htmlFor="attachmentPassword">
                  PDF Password
                  <input
                    id="attachmentPassword"
                    type="text"
                    value={attachmentPassword}
                    onChange={(e) => setAttachmentPassword(e.target.value)}
                    className="mb-4 block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                  />
                </label>
              ) : null}

              <Button
                onClick={handleFetchExtractDataFromPDF}
                disabled={!!tableDataForExtractionRule}
                className="block mb-4"
              >
                Extract data
              </Button>

              {extractedDataFromPDF && !tableDataForExtractionRule
                ? extractedDataFromPDF.map((table, idx) => {
                    return (
                      <div key={`table_${idx}`} className="mb-4">
                        <p>
                          Table #{idx + 1}{' '}
                          <Button
                            className="text-xs"
                            onClick={() => onClickSelectTable({ id: idx })}
                          >
                            Select table
                          </Button>
                        </p>
                        <Grid data={table} />
                      </div>
                    );
                  })
                : null}

              {tableDataForExtractionRule ? (
                <div className="mb-4">
                  <p className="font-bold">Selected table</p>
                  <Grid data={tableDataForExtractionRule} />
                </div>
              ) : null}

              <Button onClick={onCreateExtractionRule} className="mb-8">
                Create extraction rule
              </Button>

              {tableDataForExtractionRule ? (
                <ExtractionRules
                  rules={extractionRules}
                  data={tableDataForExtractionRule}
                  setRules={setExtractionRules}
                />
              ) : null}
            </div>
          </div>
        </Modal>
      </>
    </>
  );
};

export default withAuthUser(withAuthUserInfo(withRouter(EmailJsonApp)));
