# emailapi.io

## Overview
EmailAPI enables powerful extensions to your Gmail account with features like:
- Extracting data from the email body into a HTTP endpoint
- Automatically unlocking emails with password protected PDFs

## Apps
---
EmaiAPI comes with the following apps out of the box:

  **1. Email to JSON**

  This app allows easy scraping of content inside HTML email messages. Data points get extracted into a JSON endpoint and can then pushed to any JSON collection service via webhooks. It supports automatic sync to [jsonbox](jsonbox) out of the box.

  [Watch an interactive video of how this works.](Record_an_interactive_mmhmm_video)

  **2. Attachment Unlocker**

  This app sends you a copy of email with unlocked PDF attachments. Save the PDF password once and forget about ever having to unlock PDF attachments again. The app works on emails already in your mailbox as well as on the ones that are yet to come.


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

Create a file named `.env.local` and supply the following environment variables. Refer to the section below for instructions on getting these variables.
```
# Setup Part 1
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=

# Setup Part 2
FIREBASE_PROJECT_ID=
FIREBASE_AUTH_DOMAIN=
FIREBASE_DATABASE_URL=
FIREBASE_PUBLIC_API_KEY=

# Setup Part 3
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Setup Part 4
EMAILAPI_DOMAIN=
EMAILAPI_BASE_URL=

# Setup Part 5
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_SENDING_EMAIL_ID=

# Setup Part 6
REDISCLOUD_URL=
```

### Steps to setup Environment Variables

##### Setup Step 1/6:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
```

1. Goto https://console.cloud.google.com/
2. Click on `Select a project` dropdown and then click on `New Project` from the popup that opens up.
3. Enter `emailapi` in the project name.
4. Setup a Billing Account etc.
5. Click `Create` and wait for the project to be created.
6. Select `APIs & Services` from the hamburger menu (top left icon on page)
7. Click on `Library` from the sidebar.
8. Enter `Gmail` in the search bar and press Enter.
9. Select `Gmail API` from the search result.
10. Click `Enable` and wait for the API to be enabled.
12. Click on `OAuth consent screen` button from sidebar.
13. Select `External` User Type from the list and click `Create`.
14. Fill the form with following details:
  - Enter `emailapi` in the `Application Name` field
  - Click on `Add scope` button and search for `Gmail`
  - Select `../auth/gmail.readonly` scope
  - Click `Add` button
  - Ignore everything else and Click `Save`.
15. Click on `Credentials` from the sidebar.
16. Click on `+Create Credentials` from the top bar and select `OAuth client ID` from the dropdown.
  - Select `Application type` as `Web application`
  - Enter `emailapi auth` in `Name` field
  - Under the `Authorized Javascript Origins` section:
  - Click on `+Add URI` button and enter `http://localhost:3000`
  - Again Click on `+Add URI` button and enter your production domain name e.g. `https://emailapi.io`
  - Repeat the last 2 steps for `Authorized redirect URIs` section as well.
  - Click `Create`
17. Copy values inside `Your Client ID` and `Your Client Secret` fields and paste them in your `.env.local` file as mentioned below:
  - ➡️ `GOOGLE_CLIENT_ID=<Your Client ID>`
  - ➡️ `GOOGLE_CLIENT_SECRET=<Your Client Secret>`

➡️ `GOOGLE_OAUTH_REDIRECT_URI` will be `http://localhost:3000` for local environment or your domain name e.g. `https://emailapi.io` for the production environment.



#### Setup Step 2/6:
```
FIREBASE_PROJECT_ID=
FIREBASE_AUTH_DOMAIN=
FIREBASE_DATABASE_URL=
FIREBASE_PUBLIC_API_KEY=
```

1. Goto https://console.firebase.google.com/
2. Click on `Add project`
3. Select `emailapi` (or whatever name that you entered in Step #3 from Setup Part 1) from the dropdown (this adds Firebase to the existing Google Cloud Project).
4. Click `Continue`.
5. Click `Confirm Plan` in the popup.
6. Disable `Enable Google Analytics for this project`.
7. Click `Add Firebase` and wait for project to be created.
8. Click `Continue` when ready.
9. Click on the `</>` (Web) icon.
10. Enter `emailapi` in `App nickname` field and then click on `Register app`. (Ignore `Firebase Hosting` checkbox)
11. Copy the strings from the code that gets generated and paste them in `.env.local`. Strings to be copied from `firebaseConfig` object.
  - ➡️ `FIREBASE_PROJECT_ID=<projectId>`
  - ➡️ `FIREBASE_AUTH_DOMAIN=<authDomain>`
  - ➡️ `FIREBASE_DATABASE_URL=<databaseURL>`
  - ➡️ `FIREBASE_PUBLIC_API_KEY=<apiKey>`
12. Click on `Continue to Console`.

#### Setup Step 3/6:
```
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```
(continuing from Setup Part 2)
1. Click on `Authentication` card.
2. Click on `Set up sign-in method`.
3. Click on row that says `Google` and toggle on `Enable`.
4. Click `Save`.
5. In the `Authorized domains` section click on `Add domain` button.
  - Enter your production domain name e.g. `emailapi.io`
  - Click `Add` button.
6. Click on Gear icon next to `Project Overview` from sidebar and select `Project Settings` from the menu.
7. Click on `Service Accounts` from the top navigation bar.
  - Copy email id under `Firebase service account` and paste it in `.env.local` file.
  - ➡️ `FIREBASE_CLIENT_EMAIL=<Firebase service account>`
8. Click on `Generate new private key` and then on `Generate Key` button in the confirmation dialogue.
  - A `.json` file will get downloaded. Open the file with any text editor and copy the value in front of `private_key`. It'll look like `-----BEGIN PRIVATE KEY-----\n...`. We'll then paste this in `.env.local` file.
  - ➡️ `FIREBASE_PRIVATE_KEY=<private_key>`


#### Setup Step 4/6:
```
EMAILAPI_DOMAIN=
EMAILAPI_BASE_URL=
```

In the interest of data security emailapi.io uses a [forked](https://github.com/aakashlpin/jsonbox) and self-hosted version of [jsonbox](https://github.com/vasanthv/jsonbox) as the underlying data store. This data store also stores `accessToken` which contains `readonly` access to the users Gmail account.

You're free to choose between hosted service of jsonbox at [jsonbox.io](https://jsonbox.io/) or to fork, clone, [configure](https://github.com/vasanthv/jsonbox/blob/master/src/config.js), and host it yourself with more generous limitations [than are currently permitted](https://github.com/vasanthv/jsonbox#limitations) with the hosted service.

jsonbox internally uses mongodb as the underlying database. You're free to choose between self-managed mongodb instance or a more robust and managed mongodb solution.

In the interest of reliability and ease-of-use emailapi.io uses managed mongodb solution from [MongoDB Atlas](https://cloud.mongodb.com) which comes with a generous free tier of 500MB to begin with.

e.g. if you're using hosted jsonbox service:
- ➡️ `EMAILAPI_DOMAIN=https://jsonbox.io`
- ➡️ `EMAILAPI_BASE_URL=https://jsonbox.io/box_<id>`


#### Setup Step 5/6:
```
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_SENDING_EMAIL_ID=
```
emailapi uses [Mailgun](https://mailgun.com) as the mailing service. Mailgun comes with a generous free monthly tier of 1,250 emails/month.

Follow the Mailgun onboarding process to setup your domain and then enter following credentials in `.env.local` file
- ➡️ `MAILGUN_API_KEY=<api_key>`
- ➡️ `MAILGUN_DOMAIN=<mail.domain.com>` (eg. mail.emailapi.io)
- ➡️ `MAILGUN_SENDING_EMAIL_ID=notifications@mail.domain.com` (eg. notifications@mail.emailapi.io)

#### Setup Step 6/6:
```
REDISCLOUD_URL=redis://localhost:6379
```
emailapi uses [bull](https://github.com/OptimalBits/bull) — a redis based queue for Node.

You're free to choose between a local installation of redis or go with a hosted redis solution e.g. [Managed Redis on DigitalOcean](https://www.digitalocean.com/products/managed-databases-redis/). Grab your redis connection string and enter it in `.env.local` file:

- ➡️ `REDISCLOUD_URL=redis://localhost:6379`

✅ *Now you've setup all environment variables required to have a locally working emailapi instance.*

## How to deploy to Production

### Step 1/n: Spin up a DigitalOcean instance

*Create a new account using [my DigitalOcean referral link](https://m.do.co/c/d676da2907e1) to receive **$100** in DigitalOcean credits **valid for 2 months**!*

- Spin up a new Ubuntu 18.04 instance with atleast 1GB RAM and 1 CPU.
- Copy the IP address of your new machine.

### Step 2/n: Get a domain

Get a free domain from [freenom](https://freenom.com) or buy one from [namecheap](http://www.namecheap.com/?aff=87584).

*Alternatively, you can also set this up on a subdomain of a domain you already own.*

Create a `A` record to point to this domain name to the IP address of your newly created DigitalOcean instance.

*If you're using Cloudflare, then remember to setup A record with "DNS Only" setting. You can toggle it to "Proxy" after we've successfully issued SSL certificate in Step 3.*

### Step 3/n: Setting up the DigitalOcean instance

1. Follow the [DigitalOcean guide](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04) for a one-time initial setup of the instance.
    - Ensure you setup SSH as the auth/login mechanism
2. Setup `nginx` by following the [guide here](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-18-04). We'll use it as a reverse proxy.
3. Serve `emailapi` on your domain
    - `cd /etc/nginx/sites-enabled`
    - `sudo nano emailapi`
    - Copy paste the following server block to this file and replace `server_name` with the domain name that you procured from Step #2.
    ```
      upstream emailapi_upstream {
        server 127.0.0.1:3000;
        keepalive 64;
      }

      server {
        listen 80;
        listen [::]:80;

        server_name emailapi.io;
        location / {
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header Host $http_host;

          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";

          proxy_pass http://emailapi_upstream/;
          proxy_redirect off;
          proxy_read_timeout 240s;
        }
      }
    ```


4. Generate a free SSL certificate for your domain (thanks to Let's Encrypt) by using `certbot`. Follow the [guide here](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-18-04).


    ➡️ Note: `certbot` will update the nginx file with certificate paths and redirection rules.

    Here's what the final nginx file for emailapi.io looks like. Yours should look similar.
    ```
      upstream emailapi_upstream {
        server 127.0.0.1:3000;
        keepalive 64;
      }

      server {
        server_name emailapi.io;
        location / {
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header Host $http_host;

          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";

          proxy_pass http://emailapi_upstream/;
          proxy_redirect off;
          proxy_read_timeout 240s;
        }

        listen [::]:443 ssl; # managed by Certbot
        listen 443 ssl; # managed by Certbot
        ssl_certificate /etc/letsencrypt/live/emailapi.io/fullchain.pem; # managed by Certbot
        ssl_certificate_key /etc/letsencrypt/live/emailapi.io/privkey.pem; # managed by Certbot
        include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
      }

      server {
        if ($host = emailapi.io) {
            return 301 https://$host$request_uri;
        } # managed by Certbot

        listen 80;
        listen [::]:80;

        server_name emailapi.io;
        return 404; # managed by Certbot
      }
    ```

5. Create environment file on the server. Follow the steps below:
    - Copy content of `.env.local` file from your local codebase.
    - On remote server, run `cd ~/ && mkdir -p apps/emailapi-pipeline && nano .env`
    - Paste content in this file, save and exit.

6. Goto `https://github.com/<your_username>/emailapi/settings/secrets` and click on `New Secret` button. Add the following secrets one by one:
    - `DO_HOST` = IP address of DigitalOcean instance
    - `DO_USERNAME` = Your DigitalOcean instances' login username.
    - `GITBUH_USERNAME` = Your Github username (*typo in key is intentional as Github doesn't allow using `GITHUB` in secret name*)
    - `SSH_ID_RSA` = Copy paste contents of `id_rsa` file. This is from the SSH keypair that you use to login to your DigitalOcean instance.

7. Update `.github/workflows/deploy.yml` and change `aakashlpin` with your Github username. Commit this change to your fork's `master`. This will run a Github Action that'd deploy a docker container to your DigitalOcean instance and run `emailapi` on port 3000.

🚀 EmailAPI should now be up and running!

---
### LICENSE

MIT
