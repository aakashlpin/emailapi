/* eslint-disable react/no-danger */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import base64 from 'base-64';

const normalizeHtmlWhitespace = require('normalize-html-whitespace');

const isLengthyArray = (arr) => Array.isArray(arr) && arr.length;

function findPartOfType(parts, type) {
  if (!isLengthyArray(parts)) {
    return null;
  }

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < parts.length; i++) {
    const childHtmlPart = parts.find((part) => part.mimeType === type);
    if (childHtmlPart) {
      return childHtmlPart;
    }
    if (isLengthyArray(parts[i].parts)) {
      const grandChildHtmlPart = findPartOfType(parts[i].parts, type);
      if (grandChildHtmlPart) {
        return grandChildHtmlPart;
      }
    }
  }

  return null;
}

export default function IframeComponent() {
  const router = useRouter();
  const {
    query: { messageId, uid, isHtmlContent },
  } = router;

  const [isEmailFetched, setIsEmailFetched] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function fetchEmail() {
      const { data: emailData } = await axios.post(
        `${process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI}/api/fetch/email`,
        {
          uid,
          messageId,
        },
      );

      const part =
        emailData.payload.mimeType === 'text/html'
          ? emailData.payload.body.data
          : findPartOfType(emailData.payload.parts, 'text/html').body.data;

      setEmail(
        normalizeHtmlWhitespace(
          decodeURIComponent(
            escape(base64.decode(part.replace(/-/g, '+').replace(/_/g, '/'))),
          ),
        ),
      );
      setIsEmailFetched(true);
    }
    if (uid) {
      fetchEmail();
    }
  }, [uid]);

  if (!isEmailFetched) {
    return <>Loading...</>;
  }

  function child() {
    return {
      __html: JSON.parse(isHtmlContent) ? email : `<pre>${email}</pre>`,
    };
  }

  const childDom = child().__html;
  return <div dangerouslySetInnerHTML={{ __html: childDom }} />;
}
