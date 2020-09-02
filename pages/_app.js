/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import App from 'next/app';
import { RecoilRoot } from 'recoil';

import '../css/tailwind.css';

class EmailApiApp extends App {
  render() {
    const { Component, pageProps } = this.props;
    return (
      <RecoilRoot>
        <Component {...pageProps} />
      </RecoilRoot>
    );
  }
}

export default EmailApiApp;
