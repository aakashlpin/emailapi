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

# Last Notes 11th Oct 2020 8.35PM
- UI: Added feature to allow posting to different Google Sheets for each `extraction rule`
- Backend: stopped accepting gSheetId as a global prop and made it part of each rule object
- Next steps:
  1. Data extraction seems funky as one sheet contains results from both `rules`
  2. Google Sheets API is rate limiting 429 - culprit being /preview endpoint which creates a new spreadsheet instance per API call
  3. Options to solve #2 - Create a Sheets Factory with references stored on a per sheet id level (in redis to make it serverless?) and reuse them

BCCPG2423G