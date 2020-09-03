/* eslint-disable jsx-a11y/accessible-emoji */
/* eslint-disable no-irregular-whitespace */
import React from 'react';
import { Button } from '~/components/common/Atoms';

const ConfigOutputBar = ({
  searchInput,
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
                <form
                  className="mb-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateUnlockJob();
                  }}
                >
                  <div>
                    <label htmlFor="pdfPasswordInput">
                      <span className="text-sm">PDF Password:</span>
                      <br />
                      <input
                        type="text"
                        id="pdfPasswordInput"
                        className="border mb-1 p-2"
                        disabled={disableFormSubmit}
                        value={pdfPasswordInput}
                        onChange={(e) => setPdfPasswordInput(e.target.value)}
                      />
                    </label>
                  </div>
                  <Button
                    type="submit"
                    className="text-sm"
                    disabled={disableFormSubmit || !pdfPasswordInput.length}
                  >
                    Preview unlock
                  </Button>
                </form>

                <p className="w-5/6 text-sm italic text-gray-600 mb-4">
                  ✨ This will setup a one time attachment unlock task
                  that&apos;d send you an email with the unlocked attachment.
                  <br />
                  <br /> ➡️ Once we receive this email you&apos;d be able to
                  create a job to unlock all past and upcoming emails for your
                  search query.
                </p>

                {isUnlockJobPendingServerResponse ? (
                  <p className="text-sm italic text-gray-600">
                    ⏫ Sending Request. Please wait...
                  </p>
                ) : null}

                {isUnlockJobQueuedSuccessfully ? (
                  <p className="text-sm italic">✅ Request submitted!</p>
                ) : null}

                {isUnlockJobQueuedSuccessfully && unlockEmailBeingQueried ? (
                  <p className="text-sm italic text-gray-600">
                    🔁 Waiting for unlocked email...
                  </p>
                ) : null}

                {isUnlockJobQueuedSuccessfully && unlockEmailReceived ? (
                  <>
                    <p className="text-sm italic">
                      ✅ Unlocked email received!{' '}
                    </p>
                    {!isUnlockedAttachmentFetched ? (
                      <p className="w-3/4 text-sm italic text-gray-600">
                        ⏬ Fetching unlocked attachment. Please wait...
                      </p>
                    ) : (
                      <p className="text-sm italic">
                        ✅ Unlocked attachment shown!
                      </p>
                    )}
                  </>
                ) : null}
              </div>

              {!isUnlockedAttachmentFetched ? (
                <div>
                  <p className="mb-1 font-semibold underline uppercase">
                    Setup job
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCreateUnlockService();
                    }}
                  >
                    <div className="mb-4">
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
                        &nbsp;Unlock all Past Emails <br />
                        <span className="text-sm text-gray-600">
                          (emails that you see in the left sidebar and more)
                        </span>
                      </label>
                    </div>
                    <div className="mb-4">
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
                        &nbsp;Unlock Future Emails <br />
                        <span className="text-sm text-gray-600">
                          (emails that&apos;ll arrive going forward)
                        </span>
                      </label>
                    </div>

                    <Button type="submit" className="mb-1">
                      Create job
                    </Button>
                  </form>

                  <p className="text-xs italic text-gray-600">
                    This will setup selected tasks for search query — <br />{' '}
                    <span className="text-sm">{searchInput}</span>
                  </p>
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
