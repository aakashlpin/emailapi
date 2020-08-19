import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Trash2 } from 'react-feather';
import { createPopper } from '@popperjs/core';
import fullPath from '~/components/admin/email/fns/fullPath';
import { Button } from '~/components/common/Atoms';

const MailMessageContainer = styled.div.attrs({
  className: 'border-r border-l',
})`
  overflow-y: scroll;
`;

const Popover = styled.div`
  background: #fff;
  color: #642f45;
  padding: 2px 8px;
  border-radius: 2px;
  font-weight: bold;
  font-size: 14px;
  text-align: left;
  border: 2px solid #ffc107;
`;

const EmailPreview = ({
  showPreview,
  messageItem,
  message,
  isHtmlContent = true,
  handleClickEmailContent,
  handleClickAttachmentFilename,
  onDeleteFieldFromConfiguration,
  configuration,
  isNotClickable,
}) => {
  function removeClassname(classname) {
    [...document.querySelectorAll(`.${classname}`)].forEach(
      (elem) => elem && elem.classList.remove(classname),
    );
  }

  function resetHoverInMailContent() {
    removeClassname('mail-container-hover');
  }

  function handleMouseLeaveInMailContent() {
    resetHoverInMailContent();
  }

  function handleMouseMoveInMailContent(e) {
    resetHoverInMailContent();
    document
      .querySelector(fullPath(e.target))
      .classList.add('mail-container-hover');
  }

  function onClickEmailContent(e) {
    e.preventDefault();
    const stopPathAt = {
      className: 'gmail_quote',
    };
    const clickedElemPathElems = fullPath(e.target, stopPathAt)
      .replace('#mailContainer > ', '')
      .split(' > ');

    let isFirstSelectorPathChanged = false;
      for (let i = 0; i < clickedElemPathElems.length; i++) { // eslint-disable-line
      if (isFirstSelectorPathChanged) {
        break;
      }
      if (clickedElemPathElems[i].includes(':nth-child(')) {
        // eslint-disable-next-line prefer-destructuring
        clickedElemPathElems[i] = clickedElemPathElems[i].split(':')[0];
        isFirstSelectorPathChanged = true;
      }
    }

    const clickedElemSelector = clickedElemPathElems.join(' > ');

    handleClickEmailContent({ selector: clickedElemSelector, name: null });
  }

  async function onClickFilename({ messageId, attachmentId }) {
    console.log({ messageId, attachmentId });
    handleClickAttachmentFilename({ messageId, attachmentId });
  }

  useEffect(() => {
    if (!configuration) {
      return;
    }
    removeClassname('eaio-field');
    configuration.fields
      .filter((field) => field)
      .forEach((field) => {
        const documentSel = document.querySelector(`${field.selector}`);
        if (!documentSel) {
          return;
        }
        const classesAtSelector = documentSel.classList;

        if (!classesAtSelector.contains('eaio-field')) {
          classesAtSelector.add('eaio-field');
          const tooltip = document.querySelector(
            `#eaio-popver-${field.fieldKey}`,
          );
          createPopper(documentSel, tooltip, {
            placement: 'top',
          });
        }
      });
  });

  if (!showPreview) {
    return null;
  }

  if (!message) {
    return <div>Select an email on the left to preview</div>;
  }

  const interactions = !isNotClickable || !isHtmlContent;

  return (
    <MailMessageContainer>
      {messageItem && Array.isArray(messageItem.attachments) ? (
        <div>
          {messageItem.attachments.map((attachment) => (
            <div key={attachment.id}>
              <Button
                onClick={() =>
                  onClickFilename({
                    messageId: messageItem.messageId,
                    attachmentId: attachment.id,
                  })
                }
              >
                {attachment.filename}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <div
        id="mailContainer"
        dangerouslySetInnerHTML={{ //eslint-disable-line
          __html: isHtmlContent
            ? message
                .replace(
                  /<style[\s\S]*?<\/style>/g, // remove global styles sent in email. styles are always inlined anyways
                  '',
                )
                .replace(/<title[\s\S]*?<\/title>/g, '')
                .replace(/<link[\s\S]*?>/g, '')
            : `<pre>${message}</pre>`,
        }}
        onClick={interactions ? onClickEmailContent : (e) => e.preventDefault()}
        onMouseLeave={interactions ? handleMouseLeaveInMailContent : null}
        onMouseMove={interactions ? handleMouseMoveInMailContent : null}
      />
      {configuration
        ? configuration.fields
            .filter((field) => field)
            .map((field) => {
              return (
                <Popover
                  key={`field_${field.fieldKey}`}
                  id={`eaio-popver-${field.fieldKey}`}
                >
                  {interactions ? (
                    <button
                      type="button"
                      className="mr-2"
                      onClick={() =>
                        onDeleteFieldFromConfiguration(field.fieldKey)
                      }
                    >
                      <Trash2 size={16} color="red" />
                    </button>
                  ) : null}

                  {field.fieldName}
                </Popover>
              );
            })
        : null}
    </MailMessageContainer>
  );
};

export default EmailPreview;
