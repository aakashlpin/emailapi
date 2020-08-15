import React from 'react';
import App from 'next/app';
import '../css/tailwind.css';

class EmailApiApp extends App {
  render() {
    const { Component, pageProps } = this.props;
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Component {...pageProps} />;
  }
}

export default EmailApiApp;
