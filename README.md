# emailapi.io

## Overview
EmailAPI enables powerful extensions to your Gmail account with features like:
- Extracting data from the email body into a HTTP endpoint
- Automatically unlocking emails with password protected PDFs

## Features

EmaiAPI comes with the following features out of the box:

1. **Email to JSON**

    This feature allows easily scraping content inside HTML emails. Data points can be extracted into a JSON endpoint and can easily pushed to any JSON collection service via webhooks. EmailAPI autosaves this data to an internal database by default and exposes them on unique HTTP endpoints, thanks to [jsonbox](https://github.com/vasanthv/jsonbox).

    [Watch an interactive video of how this works.](Record_an_interactive_mmhmm_video)

2. **Attachment Unlocker**

    This feature automatically unlocks PDFs within emails (e.g. bank account statements, credit card statements, stock broker's contract notes etc.) and sends you an exact copy of the original email but with the unlocked attachment. Save PDF password uniquely for each sender once and then forget about ever having to unlock PDF attachments again. This can bulk unlock all existing emails in your mailbox and will continue unlocking all future emails as and when they come.

    [Watch an interactive video of how this works.](Record_an_interactive_mmhmm_video)

## Getting started with EmailAPI

Simply signin with your Gmail account on https://emailapi.io to play around with the service. Here are some key _terms of service_ to be aware of:

* Your account and data on emailapi.io (including `accessToken` to your Gmail account) will get **automatically deleted within 48 hours**.
* If you wish to delete your account data before it automatically gets deleted, click the **"Delete account"** button on your dashboard.
* If you wish to continue using emailapi.io as a hosted service, you can do so before your account gets auto deleted. Click **"I'd like to continue using the service"** button on your dashboard to prevent your account from being auto deleted. _The button to "Delete account" will always be available on your dashboard._

    >During signup you'll encounter a popup that says that "This app isn't verified". You'll need to click "Advanced" and then on "Go to emailapi (unsafe)" link to proceed further. Google charges anywhere [between $15,000 and $75,000](https://support.google.com/cloud/answer/9110914?hl=en#submit-app-ver) (or more) to audit and verify the app — not a cost I can afford to incur while running this as an open source project.

    ![Google popup](https://dl.dropbox.com/s/rg699b7sq9ebfm3/Screenshot%202020-09-04%20at%2011.10.04%20PM.png?dl=0)

> *I do not recommend using EmailAPI as a long term hosted service in the interest of email privacy and data security. When you give an app (even to a verified one) access to your email account, they can read all your (private) conversations, have access to your shopping history, extract data from financial emails — including your bank account/ credit card statements, and then sell it to 3rd-party advertisers and/or misuse it for any other purpose.*

__Disclaimer: You should understand the risks of signing up on https://emailapi.io. I cannot be held morally or legally responsible for any mishappenings with your Gmail account or your emails arising out of this application.__

---
**⏬ Follow the steps below to setup EmailAPI for yourself! ⏬**

---

### Get a domain name!
*We'd be using a domain name throughout the setup steps, so don't skip this step!*

Get a free domain from [freenom](https://freenom.com) or buy one from [Namecheap](http://www.namecheap.com/?aff=87584).

*Alternatively, you can also set this up on a subdomain of a domain you already own.*


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

## Steps to setup Environment Variables

### Step # 1/6:
We'll setup the following environment variables in this step:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
```

**Summary:**

Enable Gmail API on your Google Cloud account.

**Steps:**
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



### Step # 2/6:
We'll setup the following environment variables in this step:
```
FIREBASE_PROJECT_ID=
FIREBASE_AUTH_DOMAIN=
FIREBASE_DATABASE_URL=
FIREBASE_PUBLIC_API_KEY=
```

**Summary:**

Enable and add Firebase to Google Cloud project from last step.

**Steps**:
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

### Step # 3/6:
We'll setup the following environment variables in this step:
```
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

**Summary**

Continuing from last step, we'd now configure Firebase to allow signing up via Google and generate private keys to access Firebase.

>Take great care in **not** pushing this to Github or anywhere else publicly.

**Steps:**
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


### Step # 4/6:
We'll setup the following environment variables in this step:
```
EMAILAPI_DOMAIN=
EMAILAPI_BASE_URL=
```

In the interest of data security emailapi.io uses a [forked](https://github.com/aakashlpin/jsonbox) and self-hosted version of [jsonbox](https://github.com/vasanthv/jsonbox) as the underlying data store. This data store also stores `accessToken` which contains `readonly` access to the users (your) Gmail account.

You're free to choose between hosted service of jsonbox at [jsonbox.io](https://jsonbox.io/) or to fork, clone, [configure](https://github.com/vasanthv/jsonbox/blob/master/src/config.js), and host it yourself with more generous limitations [than are currently permitted](https://github.com/vasanthv/jsonbox#limitations) with the hosted service.

jsonbox internally uses mongodb as the underlying database. You're free to choose between self-managed mongodb instance or a more robust and managed mongodb solution.

In the interest of reliability and ease-of-use emailapi.io uses managed mongodb solution from [MongoDB Atlas](https://cloud.mongodb.com) which comes with a generous free tier of 500MB out of the box.

e.g. if you're using hosted jsonbox service:
- ➡️ `EMAILAPI_DOMAIN=https://jsonbox.io`
- ➡️ `EMAILAPI_BASE_URL=https://jsonbox.io/box_<id>`


### Step # 5/6:
We'll setup the following environment variables in this step:
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

### Step # 6/6:
We'll setup the following environment variables in this step:
```
REDISCLOUD_URL=redis://localhost:6379
```
emailapi uses [bull](https://github.com/OptimalBits/bull) — a redis based queue for Node to schedule and run jobs.

Install `redis` on your machine. Grab your redis connection string and enter it in `.env.local` file:

- ➡️ `REDISCLOUD_URL=redis://localhost:6379`

✅ *Now you've setup all environment variables required to have a locally working emailapi instance.*

`cd` into directory where the repo was cloned and run the following command:

```
yarn dev
```

and visit http://localhost:3000 to see emailapi in action! 🚀


## How to deploy to Production

### Spin up a DigitalOcean instance

*Create a new account using [my DigitalOcean referral link](https://m.do.co/c/d676da2907e1) to receive **$100** in DigitalOcean credits **valid for 2 months**!*

- Spin up a new Ubuntu 18.04 instance with atleast 1GB RAM and 1 CPU.
- Copy the IP address of your new machine.
- Create a `A` record in your DNS settings to point to your domain name to this IP address.

> *If you're using Cloudflare, then setup this A record with "DNS Only" setting to start with. You can enable "Proxy" after we've successfully issued SSL certificate in later steps.*


### Setting up the DigitalOcean instance

1. Follow the [DigitalOcean guide](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04) for a one-time initial setup of the instance.
    - Ensure you setup SSH as the auth/login mechanism
2. Setup `nginx` by following the [guide here](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-18-04). We'll use it as a reverse proxy.
3. Serve `emailapi` application on your domain:
    - `cd /etc/nginx/sites-enabled`
    - `sudo nano emailapi`
    - Copy paste the following code block to this file and replace `emailapi.io` with the domain name that you're using for this application.
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

    Here's what the final nginx file for emailapi.io looks like after running `certbot`. Yours should look similar.
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

5. Setup `redis` using [DigitalOcean's Managed Redis](https://www.digitalocean.com/products/managed-databases-redis/) in the same region as your DigitalOcean instance and grab the connection string (starts with `rediss://`). Alteratively, you can install `redis` locally on your DigitalOcean instance.

    > If you install redis directly on DO instance, you'd need to make sure Docker container can access the port redis is running on on the host machine.

6. Create environment file on the server. Follow the steps below:
    - Copy content of `.env.local` file from your local codebase.
    - On remote server, run `cd ~/ && mkdir -p apps/emailapi-pipeline && nano .env`
    - Paste the copied content in this file, save and exit.
        - Update the `REDISCLOUD_URL` variable with the connection string from last step.

7. Visit `https://github.com/<your_username>/emailapi/settings/secrets` and click on `New Secret` button. Add the following secrets one by one:
    - `DO_HOST` = IP address of the DigitalOcean instance
    - `DO_USERNAME` = Login username of the DigitalOcean instance.
    - `GITBUH_USERNAME` = Your Github username (*typo in key is intentional as Github doesn't allow using `GITHUB` in secret name*)
    - `SSH_ID_RSA` = Copy paste contents of `id_rsa` file. This is from the SSH keypair that you'd be using to login to the DigitalOcean instance.

8. Update `.github/workflows/deploy.yml` and change `aakashlpin` with your Github username. Commit this change to your fork's `master`. This will run a Github Action that'd deploy publish docker container to Github Packages and then pull and run it on the DigitalOcean instance.

**EmailAPI should now be up and running on your domain!** 🚀

## Enable Cron Jobs

* EmailAPI uses a free account with [UptimeRobot](https://uptimerobot.com/) to ping an endpoint that runs all the jobs that you create on EmailAPI at a frequency of every 5mins.

### Steps to setup:
* Signup on [UptimeRobot](https://uptimerobot.com/).
* Create a monitor with UptimeRobot.
* In the form enter URL as https://<your_domain>/api/cron
* Toggle open `Advanced Settings`
* In the form enter `Username` field with the "id" that you see when you login to EmailAPI. e.g. if you see https://emailapi.io/5f38ed1ba0c54626f12bfff9 in the URL bar when you login, then your `id` would be `5f38ed1ba0c54626f12bfff9`.
* Leave Password field as empty.
* Select `Authentication Type` as HTTP Basic.
* Click `Save Changes` to create monitor.

UptimeRobot will hit this endpoint once every 5mins which'll inturn check for new emails since the service last ran and execute jobs on all new matching emails.

*Good hack to both monitor your instances' uptime and run cron jobs, isn't it?*

## Roadmap

Track the product roadmap of EmailAPI on [Trello](https://trello.com/b/WYca2awy/emailapi-product-roadmap). Suggestions for improvements and features are welcome (even better if they're accompanied with PRs!).

## License

EmailAPI is [MIT licensed](https://github.com/aakashlpin/emailapi/blob/master/LICENSE.md).
