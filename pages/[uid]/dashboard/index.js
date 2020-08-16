/* eslint-disable no-underscore-dangle */
import React, { useState, useEffect } from 'react';
import { withRouter } from 'next/router';
import Head from 'next/head';
import styled from 'styled-components';
import axios from 'axios';
import { ExternalLink } from 'react-feather';
import CommonHeader from '~/components/common/common-header';
import withAuthUser from '~/components/pageWrappers/withAuthUser';
import withAuthUserInfo from '~/components/pageWrappers/withAuthUserInfo';
import logout from '~/src/firebase/logout';
import { Button, Label } from '~/components/common/Atoms';
import CreateMailbox from '~/components/common/create-mailbox';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 64px 1fr;
`;

const Body = styled.div`
  padding: 1rem 0.5rem;
`;

const Dashboard = ({ router, ...props }) => {
  const {
    query: { uid },
  } = router;

  const {
    AuthUserInfo: { token, AuthUser },
  } = props;

  const [userServices, setUserServices] = useState([]);
  const [userMailboxes, setUserMailboxes] = useState([]);

  async function fetchServices() {
    const services = await axios.post('/api/dashboard/get-services', {
      token,
      uid,
    });
    return services.data;
  }

  async function fetchMailboxes() {
    const mailboxes = await axios.post('/api/dashboard/get-mailboxes', {
      token,
      uid,
    });
    return mailboxes.data;
  }

  useEffect(() => {
    async function perform() {
      try {
        const [services, mailboxes] = await Promise.all([
          fetchServices(),
          fetchMailboxes(),
        ]);
        setUserServices(services);
        setUserMailboxes(mailboxes);
      } catch (e) {
        console.log(e);
      }
    }
    perform();
  }, []);

  return (
    <>
      <Head>
        <title>emailapi.io | my account</title>
      </Head>

      <Container>
        <CommonHeader>
          <div className="text-center">
            <a href={`/${uid}/service`}>Create New Service</a>
          </div>
        </CommonHeader>

        <Body>
          <h1 className="text-2xl mb-4">Your Services</h1>
          <div>
            {userServices.map((service, idx) => (
              <div key={`service${idx}`} className="px-2 py-4">
                <Label>
                  <span className="inline-block mr-2">Search Query</span>
                  <a
                    href={`/${uid}/service/${service._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <ExternalLink size={16} />
                  </a>
                </Label>
                <div>&ldquo;{service.search_query}&rdquo;</div>
                <div>
                  {Array.isArray(service.data)
                    ? service.data.map((dataItem) => {
                        return (
                          <div key={`data_${dataItem.id}`}>
                            <a
                              href={`${process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN}/${uid}/${dataItem.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border-b-4"
                            >
                              View Extracted Data from{' '}
                              {new Date(dataItem._createdOn).toLocaleString()}
                            </a>
                          </div>
                        );
                      })
                    : null}
                </div>
              </div>
            ))}
          </div>

          <h1 className="text-2xl mb-4">Your Mailboxes</h1>
          <div style={{ width: '600px' }}>
            <CreateMailbox
              invitationText="Create a new mailbox"
              token={token}
              AuthUser={AuthUser}
            />
          </div>
          <div>
            {userMailboxes.map((mailbox, idx) => (
              <div key={`mailbox${idx}`} className="px-2 py-4">
                <Label>
                  <span className="inline-block mr-2">Mailbox</span>
                  <a
                    href={`/${uid}/mailbox/${mailbox._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <ExternalLink size={16} />
                  </a>
                </Label>
                <div>&ldquo;{mailbox.email}&rdquo;</div>
                <div>
                  {Array.isArray(mailbox.data)
                    ? mailbox.data.map((dataItem) => {
                        return (
                          <div key={`data_${dataItem.id}`}>
                            <a
                              href={`${process.env.NEXT_PUBLIC_EMAILAPI_DOMAIN}/${uid}/${dataItem.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border-b-4"
                            >
                              View Extracted Data from{' '}
                              {new Date(dataItem._createdOn).toLocaleString()}
                            </a>
                          </div>
                        );
                      })
                    : null}
                </div>
              </div>
            ))}
          </div>

          <div>
            <Button
              onClick={async () => {
                try {
                  await logout();
                  await axios.post('/api/firebase/logout');
                  router.push('/');
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Logout
            </Button>
          </div>
        </Body>
      </Container>
    </>
  );
};

export default withAuthUser(withAuthUserInfo(withRouter(Dashboard)));
