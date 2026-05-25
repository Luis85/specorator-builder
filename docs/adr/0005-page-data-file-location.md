# 0005 — Page data files live in a hidden `Specorator/.data/` subfolder

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

Each *Page* has a *Data File* (lossless Project Data JSON, 0002) separate from
its *Project Note* (ADR-0011). Where it lives trades off discoverability against
git/note-list noise — and, as surfaced in the interview, against Obsidian Sync
coverage.

## Decision

Store *Data Files* in a hidden, configurable `Specorator/.data/` **dot-folder**
(default), named by *Project Id*: `Specorator/.data/<id>.gjs.json`, linked from
the *Project Note* via `data-file`. A **visible** `Specorator/data/` folder was
considered (Vault API, Obsidian-Sync coverage, indexed) and **rejected** in
favour of an uncluttered, unindexed dot-folder.

## Consequences

- The note list, search, and graph stay clean; dot-folders are ignored by
  Obsidian, so the Data Files use the **adapter API**, not the Vault API.
- **Sync caveat:** dot-folders are **not** covered by Obsidian Sync by default
  (they sync via git/Dropbox/etc.). The README and a settings notice must warn
  Obsidian Sync users to also sync this folder, or risk syncing the Project Note
  without its page content.
- The folder is configurable for users who prefer a different layout.
