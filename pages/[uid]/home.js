/* eslint-disable no-underscore-dangle */
import React from 'react';
import { withRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styled from 'styled-components';
import CommonHeader from '~/components/common/common-header';
import withAuthUser from '~/components/pageWrappers/withAuthUser';
import withAuthUserInfo from '~/components/pageWrappers/withAuthUserInfo';
import { Anchor } from '~/components/common/Atoms';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 64px 1fr;
`;

const Body = styled.div`
  padding: 1rem 0.5rem;
`;

const Dashboard = ({ router }) => {
  const {
    query: { uid },
  } = router;

  return (
    <>
      <Head>
        <title>emailapi.io | create new job</title>
      </Head>

      <Container>
        <CommonHeader>
          <div className="text-center">
            <a href={`/${uid}/dashboard`}>Goto Dashboard</a>
          </div>
        </CommonHeader>

        <Body>
          <h1 className="mb-4">Select job type</h1>
          <div className="mb-8">
            <h2 className="text-xl">
              <Link href={`/${uid}/ft/attachment-unlocker?q=`}>
                <Anchor>PDF attachment Unlocker</Anchor>
              </Link>
            </h2>
          </div>

          <div>
            <h2 className="text-xl">
              <Link href={`/${uid}/ft/email-json?q=`}>
                <Anchor>Email to JSON</Anchor>
              </Link>
            </h2>
          </div>
        </Body>
      </Container>
    </>
  );
};

export default withAuthUser(withAuthUserInfo(withRouter(Dashboard)));
