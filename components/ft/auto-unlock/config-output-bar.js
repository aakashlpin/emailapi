/* eslint-disable no-irregular-whitespace */
import React from 'react';
import styled from 'styled-components';
import cx from 'classnames';
import Noty from 'noty';

import { Button, Label, FlexEnds } from '~/components/common/Atoms';

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
  pdfPasswordInput,
  setPdfPasswordInput,
  handleCreateUnlockJob,
  handleCreateUnlockService,
  testUnlockSuccess,
  autoUnlockSettings,
  handleChangeAutoUnlockSettings,
}) => {
  return (
    <div className="p-8 bg-yellow-100">
      <div className="mb-16">
        <h2 className="text-xl mb-4">Auto unlock attachment with password:</h2>
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
    </div>
  );
};

export default ConfigOutputBar;
