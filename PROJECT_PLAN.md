# Open Record: Project Plan

Source of truth for intent: [README.md](README.md). Prototype status and setup: [config.md](config.md).

## Goal

Voice in, flat markdown fragment out, with a topic and optional tags captured by voice. Capture over organization.

## Where the prototype stands

Working (unit-tested with mocks, not yet live): Alexa capture loop, markdown builder, OneDrive upload via Graph, SSM-stored refresh token, SAM deploy template.

## Decisions

| Question | Decision |
| --- | --- |
| Topic | Asked at the start. Free text, no fixed topic list. |
| Tags | Spoken as their own utterance ("tag veganaf"). Optional. |
| Naming | Keep "record" everywhere (matches the invocation name). |
| Storage | Flat folder under OneDrive `Documents`, for example `Documents/OpenRecord/`. Obsidian opens it as the vault. |
| Filename | `YYYY-MM-DDTHHMMSS.md`, no year/month folders. |
| Example names (Polygnome etc.) | Illustrative only. |

## Target conversation

```text
You:   "Computer, open record"
Alexa: "Topic?"
You:   "chickens as food"
Alexa: "Go ahead."
You:   "Things are crazy."
Alexa: "Okay."
You:   "tag veganaf"
You:   "tag food sources"
You:   "End record."
Alexa: "Record saved."
```

Resulting file:

```markdown
---
id: 34d87cc6
topic: chickens as food
tags:
  - veganaf
  - food-sources
created: 2026-11-05T09:41:55
source: Alexa
device: Kitchen Echo
---

Things are crazy.

[[chickens as food]]
```

## Gaps between README and prototype

| # | README says | Prototype does | Change |
| --- | --- | --- | --- |
| 1 | Topic is part of the core flow | No topic | Prompt "Topic?" on launch; first utterance is the topic |
| 2 | Front matter `id`, `topic`, `tags`, `created` | `created`, `source`, `device` only | Add `id`, `topic`, `tags` |
| 3 | Flat vault, `2026-11-05T094155.md` | `Records/YYYY/MM/YYYY-MM-DD-HHMMSS.md` | Flat `Documents/OpenRecord/YYYY-MM-DDTHHMMSS.md` |
| 4 | Tags are secondary metadata | None | Voice tag command, kept out of the body |
| 5 | `[[links]]` for Obsidian | None | Emit `[[topic]]` link |

## Design notes and risks

- **Topic recognition is the weak point.** `CaptureIntent` only matches carrier phrases ("i ...", "the ..."), so "chickens as food" will not match it. Add a `TopicIntent` (`AMAZON.SearchQuery`) with its own carrier phrases and test on a real device early. If bare free text proves unreliable, fall back to "about chickens as food".
- **Session state:** `awaitingTopic`, then capturing. Attributes hold `topic`, `tags`, `buffer`.
- **Tags:** `TagIntent` ("tag {tag}") must be its own utterance, not mid-sentence. Multiword tags are allowed; normalize to lowercase with hyphens so Obsidian accepts them.
- **Default topic:** `Inbox` if the topic is skipped or unrecognized, so capture never fails.
- **YAML safety:** quote topic and tags containing `:` or `#`.
- **Documents folder:** Graph writes by path with the existing `Files.ReadWrite` scope and creates the folder on upload.
- **Filename collisions:** `conflictBehavior=rename` already covers same-second saves.

## Phases

Nothing is deployed yet, so there is no data to migrate. Code changes come first and the first deploy ships the final format.

### Phase 1: Format and path
- `src/markdown.ts`: flat path under `Documents/OpenRecord`, `T`-separated name; front matter with `id`, `topic`, `tags`.
- Short hex ID generator, tag normalizer, `[[topic]]` line.
- Update `test/markdown.test.ts`.

### Phase 2: Topic and tags by voice
- Interaction model: `TopicIntent` and `TagIntent` (both `AMAZON.SearchQuery`) with carrier phrases.
- `src/index.ts`: launch asks "Topic?"; session attributes hold `topic`, `tags`, `buffer`; flush passes them to the builder.
- `src/phrases.ts`: topic prompt and tag acknowledgement.
- Tests for state flow and the `Inbox` default.
- Update config.md decisions and out-of-scope list.

### Phase 3: First deploy (blocked on personal machine)
Follow the steps in [config.md](config.md): build, test, `npm run auth`, create the Alexa skill, `sam deploy`, set endpoint, test "open record". Test topic and tag recognition on a real device and adjust carrier phrases.

### Phase 4: Obsidian
- Open `Documents/OpenRecord` as a vault; confirm properties, tags and graph links render.

### Phase 5: Hardening
- Token expiry handling, fallback-intent limits, optional earcon.

### Later
- Automatic topic and tag extraction.
- Local LLM librarian reading the vault (read-only).

## Out of scope (matches README non-goals)
Task or project management, templates, auto-structuring, editing, replacing human review.

## Risks
- Free-text slot recognition depends on carrier phrases; some speech will be missed.
- Spoken topics may be misrecognized; the `Inbox` default and a fixed topic list limit the damage.
- Refresh token expires after 90 days unused.
- Personal accounts only; no work PC or tenant.

## Open questions
1. Tags: hyphenate multiword tags ("food-sources")? Recommended, for Obsidian.
2. Emit the `[[topic]]` link always, or skip it for `Inbox`?

## Project log

Newest first. One entry per working session: what happened, what was decided, what is next.

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
