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
