import React from 'react';
import { withRouter } from 'next/router';
import styled from 'styled-components';

const Header = styled.header`
  display: grid;
  grid-template-columns: 400px 1fr 600px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  align-items: center;
`;

const Logo = styled.img`
  max-height: 24px;
`;

function CommonHeader({ children, router }) {
  return (
    <Header>
      <div className="pl-2">
        <Logo src="/static/images/logo.svg" alt="logo" />
      </div>
      <div>{children}</div>
      <div className="pr-2 text-right">
        <a href={`/${router.query.uid}/dashboard`}>My Account</a>
      </div>
    </Header>
  );
}

export default withRouter(CommonHeader);
