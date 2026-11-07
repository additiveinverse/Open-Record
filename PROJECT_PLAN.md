# Open Record: Project Plan

Source of truth for intent: [README.md](README.md). Prototype status and setup: [config.md](config.md).

## Goal

Voice in, flat markdown fragment out, with a topic and optional tags captured by voice. Capture over organization.

## Current status

- **Version:** `0.1.0` early alpha (private, pre-1.0; no formal release tag).
- **Deployment:** the initial Lambda deployment succeeded, and real Echo captures have been saved to OneDrive. Recent local handler changes still need deployment and device verification.
- **Implemented:** flat Markdown records, topic metadata, Alexa capture/session handling, optional topic at save time, and spoken formatting commands. Automated tests cover the handler and Markdown output; OneDrive tests use mocks.
- **Not implemented:** voice tags. The Markdown builder supports tag metadata, but the Alexa handler does not collect tags yet.
- **Validation still needed:** Alexa recognition of the current topic-at-end and formatting flow, OneDrive/Obsidian rendering, and reliable end-of-record behavior on device.

## Decisions

| Question | Decision |
| --- | --- |
| Topic | Optional free text, no fixed list. Can be set during capture or at save time; defaults to `Inbox`. |
| Tags | Optional voice command is planned, but not implemented yet. |
| Naming | Project name is Open Record; the current Alexa invocation name is `field log`. |
| Storage | Flat folder under OneDrive `Documents`, for example `Documents/OpenRecord/`. Obsidian opens it as the vault. |
| Filename | `YYYY-MM-DDTHHMMSS.md`, no year/month folders. |
| Text formatting | Preserve fragments rather than grammar-correcting. Separate Alexa turns become paragraphs; spoken `newline`/`new line`/`next line`, `period`, and `exclamation` commands add basic formatting. |
| Example names (Polygnome etc.) | Illustrative only. |

## Target conversation

```text
You:   "Alexa, open field log"
Alexa: "Making record. Go on."
You:   "A thought, newline another thought, period"
Alexa: "Go on."
You:   "End record"
Alexa: "Add a topic? Say no, or say topic followed by a name."
You:   "Topic Field Notes" (or "No")
Alexa: "Record saved."
```

Resulting file:

```markdown
---
id: 34d87cc6
topic: Field Notes
tags: []
created: 2026-11-05T09:41:55
source: Alexa
device: Kitchen Echo
---

A thought,
another thought.

[[Field Notes]]
```

## Implementation Status

| Area | Status | Notes |
| --- | --- | --- |
| Markdown format and flat path | Complete | Includes ID, topic, tags field, created time, source/device metadata, and topic link. |
| Topic capture | Implemented; live flow still needs testing | Topic can be set while recording or after `end record`; otherwise it defaults to `Inbox`. |
| Voice tags | Not implemented | Add `TagIntent`, session state, and handler support; keep tags out of the body. |
| Spoken formatting | Implemented; recognition needs device testing | Maps newline/next line, period, and exclamation phrases from a captured utterance. |
| Alexa to OneDrive | Initial deployment and real captures confirmed | Recent local changes have not yet been verified on the Echo. |
| Obsidian | Not verified | Confirm front-matter properties, tags, and topic links in the vault. |

## Design Notes and Risks

- Alexa capture is turn-based. Say the end command separately from dictation; a broad capture phrase or speech recognition may otherwise absorb it into the record.
- Alexa's `AMAZON.SearchQuery` slot supplies recognized text, not pause timing. Formatting commands work only if Alexa includes their words in the slot transcript.
- The formatting words `period` and `exclamation` are reserved commands wherever they occur in a capture transcript.
- Multiword tags should be normalized to lowercase hyphenated values, as already supported by the Markdown builder.
- Topic and YAML values are quoted when needed; Graph writes to the flat OneDrive folder using the existing delegated `Files.ReadWrite` permission.
- Filename collisions use Graph's rename behavior.

## Phases

No migration is needed. The initial prototype was deployed before the final format; current records use the flat Markdown layout. The work now is to complete voice metadata and validate the latest flow on the device.

### Phase 1: Format and path (complete)
- Flat `Documents/OpenRecord/YYYY-MM-DDTHHMMSS.md` path.
- Front matter includes a short ID, topic, tags field, created time, source, and device; body ends with a `[[topic]]` link.
- Markdown builder and path tests are in place.

### Phase 2: Voice metadata and capture (in progress)
- Topic capture is implemented; finish real-device verification of setting it during capture and at save time.
- Add optional voice tags, including session storage, tag intent/model samples, normalization, and focused tests.
- Verify spoken line-break and punctuation commands with Alexa recognition.

### Phase 3: Deployment and device validation (in progress)
- Initial SAM deployment and real Echo-to-OneDrive captures succeeded.
- Deploy the latest local handler changes, then test topic-at-end, ending behavior, line breaks, and punctuation on device.
- Tags can be tested after Phase 2 implements them.

### Phase 4: Obsidian verification (not verified)
- Open `Documents/OpenRecord` as a vault and confirm properties, tags, and graph links render as expected.

### Phase 5: Hardening (later)
- Token expiry handling, fallback-intent limits, optional earcon.

### Later
- Automatic topic and tag extraction.
- Local LLM librarian reading the vault (read-only).

## Out of scope (matches README non-goals)
Task or project management, templates, auto-structuring, editing, replacing human review.

## Risks
- Free-text slot recognition depends on Alexa's model and carrier phrases; some speech may be missed or normalized.
- Spoken topics may be misrecognized; the `Inbox` default avoids losing a record.
- The refresh token expires after 90 days unused.
- Personal accounts only; no work PC or tenant.

## Open Questions
1. What tag command and acknowledgement are least disruptive in the capture loop?
2. Do spoken formatting commands survive Alexa transcription consistently on the target Echo?

## Project log

Newest first. One entry per working session: what happened, what was decided, what is next.

### 2026-11-07: First device tests and capture-flow refinement
- **Version:** package remains `0.1.0` early alpha; this is not a 1.0 release.
- **Confirmed:** initial SAM deployment works, and real Echo captures reached OneDrive with topic metadata.
- **Implemented since initial deployment:** flat Markdown format, optional topic-at-save flow, paragraph spacing between turns, and spoken newline/period/exclamation formatting commands; automated tests cover these behaviors.
- **Still outstanding:** tags, device validation of the latest local flow, and Obsidian rendering checks.
- **Next:** deploy the latest handler, test the revised end/topic/formatting flow on the Echo, then implement tags.

### 2026-11-06: Deploy the prototype as-is
- **Decision:** deploy the current prototype before building Phases 1-2. Real-device behavior of carrier phrases and free-text capture is the biggest unknown, and nothing else can be validated without it.
- **Consequence:** the first test files use the old `Records/YYYY/MM/...` layout. Treat them as throwaway and delete them before Phase 1 ships the flat format.
- **Blocked on:** personal machine and personal AWS account (steps 1-7 in [config.md](config.md)). Not the work PC or tenant.
- **Ideas explored (not committed):**
  - Standalone core `capture(text, topic, tags)` with Alexa as one adapter among several.
  - Alexa+ add-ons (Category SDK, MCP Toolkit) are currently select-partner only; unconfirmed whether an individual developer can use them.
  - Telegram voice-note bot: free-form Whisper transcription, topic spoken first and fuzzy-matched to existing topics, tags inferred by an LLM, audio stored outside the vault.
  - Topic by voice is a requirement; tags may be inferred.
- **Next:** run config.md steps 1-7, test "open record" with a real utterance, record what the speech recognizer drops, then decide between the Alexa path and a Telegram prototype.
