# Open Record config

Not secrets. The client ID identifies the app and is safe to commit.

| Setting | Value |
| --- | --- |
| Azure app name | Open Record |
| Application (client) ID | `4d9eec23-f9be-4ccd-a387-92022d0e7c02` |
| Supported accounts | Personal Microsoft accounts only |
| Graph permissions | `Files.ReadWrite`, `offline_access`, `User.Read` (delegated) |
| Public client flows | Enabled |
| SSM prefix | `/open-record/onedrive` (`client-id`, `refresh-token`) |

## Status

The Alexa handlers, Markdown and path builders, OneDrive upload, sign-in script, and Azure app registration are implemented. Handler tests use mocked uploads; speech recognition and model changes still need real-device testing.

## Recording and topics

After opening the skill, it immediately says "Making record. Go on." Start your first thought right away; you can begin with `okay` and continue into the thought in that same turn. Each Alexa capture turn is stored as a separate paragraph. Say `end record` when finished; if no topic was set during capture, Alexa asks whether to add one. Say `no` to save under `Inbox`, or `topic Field Notes` to add a topic and save.

Alexa may include an ending phrase in dictated text if it is spoken in the same turn. Say the end command separately. Separate capture turns are separated as paragraphs. Alexa needs a recognized starter before free text; use an affirmative carrier such as `ok`, `all right`, `bet`, `sure`, `yeah`, or `yep`, or use `note`, `remember`, `record`, or start with `I`. Alexa removes carrier phrases from slot text; the dedicated first-person intent restores a leading `I`. Ordinary openers such as `this` and `the` are not carriers, so they remain in the captured text. Alexa controls speech endpointing; the skill cannot set a four-second pause threshold. A breath pause will usually end that utterance, after which the skill acknowledges and waits for the next turn. Within a turn, say `newline` (or `new line`) or `next line` for a single line break, `period` for `.`, and `exclamation` for `!!!`. These phrases are treated as formatting commands wherever they occur in dictated text. Other punctuation is preserved when Alexa recognizes it but is not inferred.

To use changes on a device, deploy the updated Lambda with SAM and update the Alexa interaction model. The checked-in model uses the invocation name `field log`. Existing recordings are not changed.

To upload the checked-in development interaction model without copying JSON, configure ASK CLI with the Amazon Developer account and run `npm run alexa:model` from the project directory. Alexa automatically rebuilds the model after this update; no separate console build step is needed. This upload does not deploy the Lambda or update the skill manifest. Use `npm run sam:deploy` for Lambda changes.

## Next steps (personal machine)

1. Install Node 22+, AWS CLI, SAM CLI. Copy the project, then:

   ```powershell
   npm install
   npm run build
   npm test
   ```

2. Configure AWS for the personal account and confirm it:

   ```powershell
   aws configure
   aws sts get-caller-identity
   ```

3. Sign in to OneDrive and store credentials in SSM (private browser window, personal account):

   ```powershell
   $env:CLIENT_ID = "4d9eec23-f9be-4ccd-a387-92022d0e7c02"
   npm run auth
   ```

4. Create the Alexa skill in the developer console (custom skill, invocation name `record`) and import `skill/interactionModels/custom/en-US.json`. Copy the skill ID (`amzn1.ask.skill...`).

5. Build and deploy, passing the skill ID. Optionally set `TimeZone` (default `America/Chicago`):

   ```powershell
   sam build
   sam deploy --guided
   ```

6. In the Alexa console, set the endpoint to the Lambda ARN from the deploy output (`RecordFunctionArn`), save, build the model, and test with "open record".

7. Optional: set the `DEVICE_NAMES` Lambda environment variable to JSON mapping device IDs to names (for example `{"amzn1.ask.device.XXXX":"Kitchen Echo"}`). IDs appear in the Lambda logs after the first captures.

## Decisions and assumptions

Confirmed:
- Node.js + TypeScript (`ask-sdk-core`), deployed with AWS SAM. Skill stays in development mode (own Echo devices, same Amazon account).
- Capture is a loop: each utterance is added to a session buffer; "End record" (or stop/cancel) saves one file. Session end or an error also saves any buffered text.
- OneDrive via Microsoft Graph, personal Microsoft account, delegated `Files.ReadWrite` + `offline_access`.
- Personal accounts only; do not use the work PC or work tenant for any of this.

Mine, unconfirmed:
- `AMAZON.SearchQuery` slot with carrier phrases is the free-text mechanism.
- Refresh token in SSM Parameter Store (SecureString); the Lambda writes back the rotated token.
- Utterances in one record are joined with a space.
- Time zone via `TZ_NAME` env var; device name via optional `DEVICE_NAMES` JSON, else the device ID.
- Spoken lines (listening, saved, acknowledgements, reprompts) live in `src/phrases.ts` and are picked at random.

Out of scope for v1 (see README): titles, tags, search, AI, editing, retrieval.

## Handoff notes

- Fallback intent gets no utterance text from Alexa, so it can only apologize and keep the buffer.
- A second skill with a different invocation name could use a different template (shared Lambda, chosen by skill ID); not built.
- An earcon (hosted audio) could replace spoken acknowledgements; not built.
- Stale or failed saves: Alexa says "I couldn't save that record."; details are in the Lambda logs.
- Resume by reading this file, then `src/index.ts`, `src/onedrive.ts`, `src/phrases.ts`.

## Known risks

- Alexa passes free text only after a carrier phrase (see the samples in the interaction model), so some utterances may be dropped; extend the phrase list as gaps appear.
- Microsoft expires the refresh token after 90 days unused; rerun `npm run auth` if saves start failing.
