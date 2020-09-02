/* eslint-disable jsx-a11y/accessible-emoji */
/* eslint-disable no-irregular-whitespace */
import React from 'react';
import styled from 'styled-components';
import cx from 'classnames';
import Noty from 'noty';
import { Button } from '~/components/common/Atoms';

const ConfigOutputBar = ({
  messageItem,
  pdfPasswordInput,
  setPdfPasswordInput,
  handleCreateUnlockJob,
  handleCreateUnlockService,
  autoUnlockSettings,
  handleChangeAutoUnlockSettings,
  handleClickAttachmentFilename,
  isUnlockJobPendingServerResponse,
  isUnlockJobQueuedSuccessfully,
  unlockEmailBeingQueried,
  unlockEmailReceived,
  isUnlockedAttachmentFetched,
}) => {
  if (!messageItem) {
    return null;
  }

  async function onClickFilename({ messageId, attachmentId, filename }) {
    handleClickAttachmentFilename({ messageId, attachmentId, filename });
  }

  const { attachments = [] } = messageItem;
  const disableUnlockFeature = attachments.length > 1;
  const disableFormSubmit =
    isUnlockJobPendingServerResponse || unlockEmailBeingQueried;

  return (
    <div className="bg-yellow-100">
      {disableUnlockFeature ? (
        <p>
          This email contains multiple attachments. Unlocking all of them or 1
          among them is not supported by this app yet.
        </p>
      ) : null}
      <div className="mb-16">
        <div>
          {attachments.map((attachment, idx) => (
            <div key={attachment.id}>
              <p className="underline">Attachment #{idx + 1}</p>

              <Button
                className="font-semibold mb-4"
                onClick={() =>
                  onClickFilename({
                    messageId: messageItem.messageId,
                    attachmentId: attachment.id,
                    filename: attachment.filename,
                  })
                }
              >
                {attachment.filename}
              </Button>

              <div className="mb-8">
                <p className="text-sm w-3/4 mb-1">
                  Check if the app is able to unlock attachment by entering PDF
                  password below:
                </p>
                <form
                  className="mb-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateUnlockJob();
                  }}
                >
                  <div>
                    <input
                      type="text"
                      className="border mb-1"
                      disabled={disableFormSubmit}
                      value={pdfPasswordInput}
                      onChange={(e) => setPdfPasswordInput(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className={cx('border-b-2', {})}
                    disabled={disableFormSubmit}
                  >
                    Unlock and Get email
                  </button>
                </form>

                {isUnlockJobPendingServerResponse ? (
                  <p>Please wait...</p>
                ) : null}

                {isUnlockJobQueuedSuccessfully && unlockEmailBeingQueried ? (
                  <p>Checking for unlocked email...</p>
                ) : null}

                {isUnlockJobQueuedSuccessfully && unlockEmailReceived ? (
                  <>
                    <p className="text-sm">✅ Email received! </p>
                    {!isUnlockedAttachmentFetched ? (
                      <p className="w-3/4 text-sm">
                        ⏬ Fetching unlocked attachment. Please wait...{' '}
                      </p>
                    ) : (
                      <p className="text-sm">✅ Attachment seen! </p>
                    )}
                  </>
                ) : (
                  <p className="w-3/4 text-sm">
                    Once you receive this unlocked email you&apos;d be able to
                    create a job to unlock all past and future emails.
                  </p>
                )}
              </div>

              {isUnlockedAttachmentFetched ? (
                <div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
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

                    <Button type="submit">Create Service</Button>
                  </form>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConfigOutputBar;
