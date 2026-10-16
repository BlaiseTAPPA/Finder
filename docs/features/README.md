# Feature prompts

Each file here is the implementation brief for one feature: what to build, the limits to respect, and how to know it's done. It is written before the work starts and handed to whoever implements it, a person or an AI agent. Once the feature ships, it stays here as the record of what was asked and why.

## Workflow

1. **Write:** copy [`_template.md`](_template.md) to `NNNN-short-slug.md`, using the next free number, and fill it in. Set the status to `Draft`.
2. **Agree:** once the scope is settled, set it to `Ready`.
3. **Implement:** work on a branch named after the file (e.g. `feat/0002-short-slug`), and set the status to `In progress`.
4. **Ship:** when the PR is merged, set the status to `Done` and fill in the PR link. Don't delete the file.

If the scope changes during implementation, update the prompt in the same PR, so the file always matches what was actually built.

## Conventions

- **File names:** a four-digit number, then a kebab-case slug: `0002-price-alert-notifications.md`. Numbers are never reused.
- **Status:** `Draft` · `Ready` · `In progress` · `Done` · `Dropped`. Keep dropped prompts, and say why in one line.
- **One feature per file.** If a prompt grows several independent parts, split it.
- **Language:** English, like the root README. The app's UI copy stays in German, so quote it as it should appear on screen.

## Writing a good prompt

- **Goal:** say what the user gains, not only what to build.
- **Build:** describe the outcome, and name the files or modules you already know are involved.
- **Constraints:** the most useful section. List what must _not_ change (data model, API contracts, existing journeys, design tokens) and any tool or library limits.
- **Acceptance check:** write checkable statements, not intentions. "The search survives navigating to /alerts and back" can be verified; "the search is better" can't.
- **Not in this phase:** names what's out of scope, so it isn't added along the way.

## Index

| #                                   | Feature                          | Status | PR                                                 |
| ----------------------------------- | -------------------------------- | ------ | -------------------------------------------------- |
| [0001](0001-design-system-audit.md) | Design system audit and redesign | Done   | [#4](https://github.com/BlaiseTAPPA/Finder/pull/4) |
