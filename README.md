# Open Record

> Offload Brain.

Open Record is a voice-first fragment capture system designed to reduce idea loss.

It provides a near-frictionless way to externalize thoughts, observations, decisions, questions, jokes, architectural insights, project ideas, and creative fragments before they disappear from working memory.

The system prioritizes **capture over organization**.

---

# Purpose

The human brain is an excellent idea generator and a mediocre long-term storage mechanism.

Open Record exists to capture transient thoughts before they evaporate.

---

# Core Principle

A captured fragment is more valuable than an uncaptured perfect note.

Organization can happen later.

Capture must happen immediately.

---

# What Open Record Is

Open Record is:

- External working memory
- Idea preservation
- Fragment capture
- Thought routing
- Knowledge accumulation

---

# What Open Record Is Not

Open Record is not:

- Task management
- Project management
- Documentation
- Journaling
- A PKM system
- A note-taking application

Those may emerge from the captured corpus.

They are not the primary objective.

---

# Mental Model

```text
Think
 ↓
Speak
 ↓
Transcribe
 ↓
Assign Topic
 ↓
Store
```

Nothing else should be required.

Every additional step introduces friction.

Every additional step increases the chance that the idea is lost.

---

# Canonical Object: Fragment

Everything in Open Record is a fragment.

Examples:

- Ideas
- Questions
- Decisions
- Research observations
- Architectural insights
- Project thoughts
- Future work
- Joke concepts
- Random realizations

Fragments do not need to be complete.

Fragments do not need to be refined.

Fragments do not need to be actionable.

They only need to be captured.

---

# Topics

Topics are the primary organizational structure.

Topics answer:

> Where does this belong right now?

Examples:

- Book-I
- Book-II
- Frontier
- Personal

Topics are routing.

Not categorization.

---

# Tags

Tags are secondary metadata.

Tags answer:

> What is this about?

Examples:

- #launchpad
- #sequencing
- #decision
- #research

Tags support discovery and retrieval.

Topics support routing.

---

# Storage Philosophy

The canonical source of truth is markdown.

Everything else is a consumer.

```text
Markdown Corpus
        │
        ├── Obsidian
        ├── Search
        ├── Future Librarian
        └── Future Tooling
```

The markdown corpus remains authoritative.

All other systems exist to read from it.

---

# Vault Philosophy

Prefer flat storage.

Avoid deep folder hierarchies.

Relationships should emerge through metadata and links rather than directory structures.

Example:

```text
vault/

2026-11-05T094155.md
2026-11-05T095811.md
2026-11-05T103022.md
```

The file name identifies the fragment.

Metadata identifies its meaning.

---

# Fragment Structure

Example:

```markdown
---
id: 34d87cc6
topic: Barry
tags:
  - polygome
  - launchpad
created: 2026-11-05T09:41:55
---

Barry is synth engines first.

Polygome belongs behind the secret door as an
experimental sequencer environment.

Related:
[[Barry]]
[[Polygome]]
[[Launchpad]]
```

---

# Obsidian's Role

Obsidian is not the capture interface.

Obsidian is the discovery interface.

Open Record creates fragments.

Obsidian reveals patterns.

Capabilities include:

- Search
- Backlinks
- Graph views
- Organization
- Human review
- Knowledge discovery

---

# Future Librarian

A future local LLM may serve as a librarian for the corpus.

The librarian does not own the data.

The librarian reads the corpus.

Example queries:

> What have I decided about Book II?

> Summarize my thoughts on Polygome.

> Show me every fragment related to MLRV.

> What decisions have I made about Barry?

---

# Architecture

```text
┌─────────────────────────────┐
│        Richard Brain        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         Open Record         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│        Speech to Text       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Topic Extraction       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Fragment Builder       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│    Markdown Generation      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Markdown Corpus       │
└───────┬─────────┬──────────┘
        │         │
        ▼         ▼

   Obsidian   Future Librarian
```

---

# Success Criteria

Open Record succeeds when:

- Capturing a thought takes less effort than remembering it
- Fragments accumulate naturally
- Organization emerges through usage
- The corpus becomes more valuable over time
- Retrieval is possible without excessive structure
- The system reduces idea loss

---

# Non-Goals

Open Record is not trying to:

- Create perfect notes
- Force ideas into templates
- Automatically structure knowledge
- Replace human thinking
- Predict future organization requirements

---

# Mission Statement

**Open Record is a voice-first fragment capture system that converts transient thoughts into a searchable markdown corpus for humans, tools, and future intelligence systems.**
