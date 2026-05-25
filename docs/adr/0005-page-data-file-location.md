# 0005 — Page data files live in a hidden `Specorator/.data/` subfolder

- **Status:** Accepted
- **Date:** 2026-05-25

## Context

Each *Page* has a *Data File* (lossless Project Data JSON, 0002) separate from
its *Page Note*. Where it lives trades off discoverability against git/note-list
noise. Options: beside the note (`<note>.gjs.json`); a hidden data subfolder;
or the plugin data folder outside the vault.

## Decision

Store *Data Files* in a hidden, configurable `Specorator/.data/` subfolder
(default), e.g. `Specorator/.data/<page>.gjs.json`, linked from the *Page Note*
via `data_file`. They remain vault-resident (portable, git-versionable) but out
of the way.

## Consequences

- The note list and graph stay clean; JSON sidecars don't clutter folders.
- Files are still in the vault, so they sync and version with the user's notes.
- The folder is configurable for users who prefer co-location.
