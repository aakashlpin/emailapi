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
    AuthUserInfo: { token },
  } = props;

  const [user, setUser] = useState({});
  const [userServices, setUserServices] = useState([]);

  async function fetchServices() {
    const services = await axios.post('/api/dashboard/get-services', {
      token,
      uid,
    });
    return services.data;
  }

  useEffect(() => {
    async function perform() {
      try {
        const userReq = await axios(
          `${process.env.NEXT_PUBLIC_EMAILAPI_BASE_URL}/users/${uid}`,
        );
        setUser(userReq.data);

        const [services] = await Promise.all([fetchServices()]);
        setUserServices(services);
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
            <a href={`/${uid}/home`}>Setup new job</a>
          </div>
        </CommonHeader>

        <Body>
          <div className="mb-8">
            <h1 className="text-xl mb-2 underline">Your jobs</h1>
            <div>
              {userServices.length
                ? userServices.map((service, idx) => (
                    <div key={`service${idx}`} className="px-2 py-4">
                      <Label>
                        <span className="inline-block mr-2">Search Query</span>
                        <a
                          href={`/${uid}/ft/${
                            service.app === 'AUTO_UNLOCK'
                              ? 'attachment-unlocker'
                              : 'email-json'
                          }/${service._id}?q=`}
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
                                    {new Date(
                                      dataItem._isReadyOn,
                                    ).toLocaleString()}
                                  </a>
                                </div>
                              );
                            })
                          : null}
                      </div>
                    </div>
                  ))
                : 'No jobs yet. Click on Setup new job above to get started.'}
            </div>
          </div>

          <div className="mb-4">
            <h1 className="text-xl mb-2 underline">Account Settings:</h1>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await axios.post(`/api/user/hosted-optin`, {
                  token,
                  uid,
                });
              }}
            />
            <label className="cursor-pointer" htmlFor="hosted-optin">
              <input
                type="checkbox"
                id="hosted-optin"
                onChange={async (e) => {
                  if (e.target.value === 'on') {
                    try {
                      const updatedUserObject = {
                        ...user,
                        hostedOptin: true,
                      };
                      await axios.put(
                        `${process.env.NEXT_PUBLIC_EMAILAPI_BASE_URL}/users/${uid}`,
                        updatedUserObject,
                      );

                      setUser(updatedUserObject);
                    } catch (err) {
                      console.log(err);
                    }
                  }
                }}
                checked={user.hostedOptin}
              />
              &nbsp;I&apos;d like to continue using the hosted service.
            </label>
          </div>

          <div className="mb-2">
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

          <div className="mb-2">
            <Button
              onClick={async () => {
                try {
                  await axios.post(`/api/user/delete`, {
                    token,
                    uid,
                  });
                  await logout();
                  router.push('/');
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              Delete account
            </Button>
          </div>
        </Body>
      </Container>
    </>
  );
};

export default withAuthUser(withAuthUserInfo(withRouter(Dashboard)));
