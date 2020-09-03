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
                  <p className="text-sm">⏫ Sending Request. Please wait...</p>
                ) : null}

                {isUnlockJobQueuedSuccessfully ? (
                  <p className="text-sm">✅ Request submitted!</p>
                ) : null}

                {isUnlockJobQueuedSuccessfully && unlockEmailBeingQueried ? (
                  <p className="text-sm">🔁 Waiting for unlocked email...</p>
                ) : null}

                {isUnlockJobQueuedSuccessfully && unlockEmailReceived ? (
                  <>
                    <p className="text-sm">✅ Unlocked email received! </p>
                    {!isUnlockedAttachmentFetched ? (
                      <p className="w-3/4 text-sm">
                        ⏬ Fetching unlocked attachment. Please wait...
                      </p>
                    ) : (
                      <p className="text-sm">✅ Unlocked attachment shown!</p>
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
                      <label
                        htmlFor="autoUnlockPast"
                        className="cursor-pointer"
                      >
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
                        &nbsp;Unlock all Past Emails
                      </label>
                    </div>
                    <div className="mb-2">
                      <label
                        htmlFor="autoUnlockFuture"
                        className="cursor-pointer"
                      >
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
                        &nbsp;Unlock Future Emails
                      </label>
                    </div>

                    <Button type="submit">Save and Submit</Button>
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
