import React from 'react';
import styled from 'styled-components';

const normalizeHtmlWhitespace = require('normalize-html-whitespace');

const EmailContainer = styled.div.attrs({
  className: 'pt-4 p-8 pb-16',
})`
  overflow-y: scroll;
`;

const EmailPreview = ({ showPreview, messageItem }) => {
  if (!showPreview) {
    return null;
  }

  if (!messageItem) {
    return (
      <EmailContainer>Select an email on the left to preview</EmailContainer>
    );
  }

  const { isHtmlContent = true, message } = messageItem;

  return (
    <EmailContainer>
      <div
        dangerouslySetInnerHTML={{ //eslint-disable-line
          __html: isHtmlContent
            ? normalizeHtmlWhitespace(
                message
                  .replace(
                    /<style[\s\S]*?<\/style>/g, // remove global styles sent in email. styles are always inlined anyways
                    '',
                  )
                  .replace(/<title[\s\S]*?<\/title>/g, '')
                  .replace(/<link[\s\S]*?>/g, ''),
              )
            : `<pre>${message}</pre>`,
        }}
        onClick={(e) => e.preventDefault()}
      />
    </EmailContainer>
  );
};

export default EmailPreview;
