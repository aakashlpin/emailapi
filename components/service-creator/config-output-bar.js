/* eslint-disable no-irregular-whitespace */
import React from 'react';
import styled from 'styled-components';
import flatten from 'lodash/flatten';
import cx from 'classnames';
import Noty from 'noty';

import { Button, Label, FlexEnds } from '~/components/common/Atoms';
import ConfigurationEditor from '~/components/service-creator/configuration-editor';

const AsideContainer = styled.div.attrs({
  className: 'bg-yellow-100',
})`
  height: 100%;
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: 1fr;

  & > div {
    max-width: 100%;
  }
`;

const PreviewModeContainer = styled.div.attrs({
  className: 'bg-yellow-300 p-4',
})`
  height: 100%;
  overflow-y: scroll;
`;

const ConfigEditorContainer = styled.div.attrs({
  className: 'bg-yellow-100',
})`
  overflow-x: hidden;
`;

const PreviewContainer = styled.div.attrs({
  className: 'bg-yellow-200 p-4',
})`
  overflow-y: scroll;
  overflow-x: scroll;
`;

const ConfigOutputBar = ({
  isPreviewMode,
  searchInput,
  parsedData,
  selectedConfigurationIndex,
  selectedSearchResultIndex,
  configurations,
  localFieldNames,
  setLocalFieldName,
  handleChangeConfiguration,
  doDeleteCurrentConfiguration,
  doPreviewParsedData,
  handleChangeSearchInput,
  setTriggerSearch,
  pdfPasswordInput,
  setPdfPasswordInput,
  handleCreateUnlockJob,
  handleCreateUnlockService,
  testUnlockSuccess,
  autoUnlockSettings,
  handleChangeAutoUnlockSettings,
}) => {
  let sampleData;
  if (
    selectedConfigurationIndex !== null &&
    parsedData[selectedConfigurationIndex]
  ) {
    sampleData = parsedData[selectedConfigurationIndex].find(
      (item) => item.resultId === selectedSearchResultIndex,
    );
  }

  return (
    <>
      {isPreviewMode ? (
        <PreviewModeContainer>
          <Label>Preview API from locally loaded emails</Label>
          <p>
            <em>{`When you "Create API", your entire mailbox will be filtered with search query '${searchInput}', and data fields will be extracted from all matching emails`}</em>
          </p>
          <pre>{JSON.stringify(flatten(parsedData), null, 2)}</pre>
        </PreviewModeContainer>
      ) : null}
      {!isPreviewMode &&
      selectedConfigurationIndex !== null &&
      parsedData[selectedConfigurationIndex] ? (
        <AsideContainer>
          <ConfigEditorContainer>
            <ConfigurationEditor
              configuration={configurations[selectedConfigurationIndex]}
              localFieldNames={localFieldNames}
              setLocalFieldName={setLocalFieldName}
              onChangeConfiguration={(updatedConfig) => {
                handleChangeConfiguration({
                  configIndex: selectedConfigurationIndex,
                  updatedConfig,
                });
              }}
              sampleData={sampleData}
            />
          </ConfigEditorContainer>
          <PreviewContainer>
            <FlexEnds>
              <Label>Sample data from current template</Label>
              <Button onClick={doDeleteCurrentConfiguration}>
                Delete template
              </Button>
            </FlexEnds>
            <pre>{JSON.stringify(sampleData, null, 2)}</pre>
            <Button
              disabled={!flatten(parsedData).length}
              onClick={doPreviewParsedData}
            >
              {configurations.length > 1
                ? 'View data from all templates combined'
                : 'View all data'}
            </Button>
          </PreviewContainer>
        </AsideContainer>
      ) : (
        <div className="p-8 bg-yellow-100">
          <div className="mb-16">
            <h2 className="text-xl mb-4">
              Auto unlock attachment with password:
            </h2>
            <form action="">
              <input
                type="text"
                value={pdfPasswordInput}
                onChange={(e) => setPdfPasswordInput(e.target.value)}
              />
              <button
                type="button"
                className={cx('border-b-2', {})}
                onClick={(e) => {
                  e.preventDefault();
                  handleCreateUnlockJob();
                }}
              >
                Test unlock email
              </button>{' '}
            </form>

            <>
              <h3 className="text-l mb-4">Auto unlock settings:</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!testUnlockSuccess) {
                    new Noty({
                      theme: 'relax',
                      text: `❌ Please use "Test Unlock" feature before creating this service`,
                    }).show();
                    return;
                  }
                  handleCreateUnlockService();
                }}
              >
                <div>
                  <label htmlFor="autoUnlockPast">
                    Auto Unlock Past Emails:
                    <input
                      type="checkbox"
                      id="autoUnlockPast"
                      name="autoUnlockPast"
                      checked={autoUnlockSettings.past}
                      onChange={() =>
                        handleChangeAutoUnlockSettings(
                          'past',
                          !autoUnlockSettings.past,
                        )
                      }
                    />
                  </label>
                </div>
                <div>
                  <label htmlFor="autoUnlockFuture">
                    Auto Unlock Future Emails:
                    <input
                      type="checkbox"
                      id="autoUnlockFuture"
                      name="autoUnlockFuture"
                      checked={autoUnlockSettings.future}
                      onChange={() =>
                        handleChangeAutoUnlockSettings(
                          'future',
                          !autoUnlockSettings.future,
                        )
                      }
                    />
                  </label>
                </div>

                <input type="submit" value="Create Service" />
              </form>
            </>
          </div>

          <h2 className="text-xl mb-4">Tips</h2>
          <ol className="list-disc">
            {flatten(parsedData).length ? (
              <>
                <li className="mb-4">
                  You&apos;ve already configured {parsedData.length} template
                  {configurations.length > 1 ? 's' : ''}, but this email
                  didn&apos;t match any of those previously selected data
                  fields. You&apos;ll have to re-identify data fields in this
                  email to extract data from similar such emails.
                </li>
              </>
            ) : (
              <>
                <li
                  className={cx('mb-4', {
                    'line-through': !!searchInput,
                  })}
                >
                  <p>
                    Start by narrowing down what you want from your API. For
                    example,{' '}
                    <button
                      type="button"
                      className={cx('border-b-2', {
                        'line-through': !!searchInput,
                      })}
                      onClick={(e) => {
                        e.preventDefault();
                        handleChangeSearchInput('Your trip with Uber');
                        setTriggerSearch(true);
                      }}
                    >
                      Click to search <em>&ldquo;Your trip with Uber&rdquo;</em>
                    </button>{' '}
                    in the Search bar above.
                  </p>
                </li>
                <li className="mb-4">
                  <p>
                    In the &ldquo;Original Email&rdquo; pane, Mouseover and
                    Click on data elements you wish to extract in the API.
                    <em>
                      {' '}
                      Tips will vanish as soon as you start clicking inside the
                      email
                    </em>
                    .
                  </p>
                </li>
                <li className="mb-4">
                  <p>
                    Once you&apos;ve clicked through all the fields, give them
                    readable names.
                  </p>
                </li>
              </>
            )}
          </ol>
        </div>
      )}
    </>
  );
};

export default ConfigOutputBar;
