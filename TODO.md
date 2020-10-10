# TODOs

## Feature: Auto PDF Unlock

- After search query is entered and an email is selected, if the email contains a PDF,
  - Show an option which says "Enable automatic PDF unlocking?"
  - On click, show an input to accept PDF password
  - Do a test dry run for this specific messageId + attachmentId combination
    where we attempt to temporarily download and unlock PDF on server
    then send this user mail with same subject prefixed with [UNLOCKED] and attach unlocked PDF
    then delete the file on server
  - If unlocked pdf mail from m.emailapi.io arrives, show options to
    - unlock all previous emails and receive "unlocked" emails for all of them
    - or, unlock all emails going forward

## Tracking task completion between parent-child queue jobs

  - ### 1-many jobs
    mailFetch will always be the parent job
    mailFetch queue will spawn n jobs in child queue

  - ### Parent job completion user notifications


### TODOs
- Remove `done` based callbacks from queue and move to Promise.resolve()s
- Enable job success/failure notification system
- Include all queues from filesystem instead of `require`ing them individually


## Extracting tables

### Scenarios

> User knows this PDF template always contains X number of tables
1. User can reject tables as is
2. User can select tables as is
  2.1. or/and add whitelist rules
    2.1.1. grab a row only if it contains a cell where cell's value `==` or `contains` some value
  2.2. or/and add blacklist rules
    2.2.1. reject rows if it contains a cell where cell's value `==` or `contains` some value


## New onboarding flow
- As soon as email account is connected
  1. Create an API to get all senders for last 365 days
  2. Create an API to get top group of emails matched by subject by sender email(s) - support multiselect of output from step#1
    2.1. Create "group by" by most number of matching words in the subject line (assuming number of variable words will be consistent across time e.g. Bank account statement for November 2020)
  3. Let the user select one such group to use any of the emailapi apps over it
    3.1. Group = User friendly email search experience. Eliminate the need to learn Gmail search query patterns
    3.2. Creates a `from:` and `subject:` filter with optional filters added on top by the app (e.g. `has:attachment` added by Attachment sync app)
