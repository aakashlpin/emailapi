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
