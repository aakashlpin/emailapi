# emailapi.io

## Overview
EmailAPI enables powerful actions on top of your Gmail account with features like:
- Extract data in email body or attached PDFs into a HTTP endpoint
- Receive a copy of unlocked PDFs
- Aggregate similar data (e.g. several credit card bills) from several senders into an endpoint.


## Apps
---
EmaiAPI is written with a plugin based architecture that comes with bare bones readonly connectivity to Gmail APIs. It comes with the following apps out of the box:

  **1. Email to JSON**

  This app allows easy scraping of content inside email messages. Data points get extracted into a JSON endpoint and can then pushed to any database service via webhooks. It supports automatic sync to a [jsonbox](jsonbox) endpoint out of the box.

  [Watch an interactive video of how this works.](Record_an_interactive_mmhmm_video)

  **2. Attachment Unlocker**

  This app unlocks PDF attachments from your past emails as well as from emails that are yet to come. Enter the PDF password once and forget about ever having to unlock PDF attachments again.


## How to run locally

Fork this repo and then clone it:

```
git clone https://github.com/<your_name>/emailapi.git
```

`cd` into directory where the repo was cloned and install the dependencies:

```
yarn
```

### Environment Variables

Create a file named `.env.local` and supply the following environment variables
```
FIREBASE_AUTH_DOMAIN=
FIREBASE_DATABASE_URL=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PROJECT_ID=
FIREBASE_PUBLIC_API_KEY=
SESSION_SECRET_CURRENT=
SESSION_SECRET_PREVIOUS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000
EMAILAPI_DOMAIN=https://jsonbox.io
EMAILAPI_BASE_URL=https://jsonbox.io/<boxid>
MAILGUN_API_KEY=
MAILGUN_DOMAIN=m.emailapi.io
MAILGUN_SENDING_EMAIL_ID=notifications@m.emailapi.io
REDISCLOUD_URL=rediss://username:password@hostname:port
```

Then just run

```
yarn dev
```

to start the development server on port `3000`. Your emailapi instance will be running on `http://localhost:3000`.

### LICENSE

MIT

Yet todo to complete the README:
- dockerize jsonbox
  - enable IP whitelisting to hosted instance of jsonbox (open a PR)
- See if you can simplify the process of installing "emailapi" on a VM like DO
  - nginx with certbot
  - 2 docker images - `emailapi_app` and `jsonbox`
- Put up funding info and setup service to accept payments
- See if you'd like to offer hosted service in exchange for monthly committment??! (Too big an undertaking though)