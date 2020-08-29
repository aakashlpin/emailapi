# emailapi.io

## Overview
EmailAPI enables powerful actions on top of your Gmail account with features like:
- Extract data in email body or attached PDFs into a HTTP endpoint
- Receive a copy of unlocked PDFs
- Aggregate similar data (e.g. several credit card bills) from several senders into an endpoint.

## How to run locally

Fork this repo and then clone it:

```
git clone https://github.com/<your_name>/emailapi.git
```

`cd` into directory where the repo was cloned and install the dependencies:

```
yarn
```

Then just run

```
yarn dev
```

to start the development server on port `3000`. Your jsonbox instance will be running on `http://localhost:3000`. Alternatively you can run the application using docker with `docker-compose up`.

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