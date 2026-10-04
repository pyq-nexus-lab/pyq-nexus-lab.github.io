# PYQ Lab

A unified, extensible multi-subject practice workspace for **GATE ME, GATE XE, ESE Prelims and ESE Mains**, with a separate CSE Mains supplement.

## Open the lab

**Live website: https://shobhit2507.github.io/som-pyq-lab/**

GitHub Pages hosts the public practice app. Progress stays in each browser; use Export backup and Restore backup when moving between devices.

Download this repository with **Code → Download ZIP**, extract it, and open **index.html**. Keep the `assets-*.js` files beside it. The interface and question screenshots work without a build step or account. Optional web fonts require an internet connection; system fonts work offline.

For a consistent local URL, install Node.js 18 or later, open a terminal in this folder and run:

```sh
npm start
```

Open **http://127.0.0.1:4173**. This server listens only on your computer. Changing between the file and local-server versions creates separate browser storage, so export a backup before switching.

## One platform for every subject

The subject hub contains 17 Mechanical Engineering and foundational subject spaces. Only Strength of Materials currently has imported questions; the other subjects explicitly await question banks. Search, subject workspaces, revision, progress, the study planner and mixed-subject test selection share one engine. The existing URL and SOM question identifiers are retained, so existing browser progress and old SOM backups remain compatible.

Use the subject scope selector for the question library, revision and detailed performance. Home and the cross-subject performance summary always show the whole platform. Active tests keep their original question set when the subject scope changes.

See `SUBJECT-INTEGRATION.md` to add the next bank.

## What is included

- Original cropped question screenshots, including diagrams, across all five supplied DOCX compilations: **797 question entries**.
- Additional chapterwise archive questions cropped from the supplied GATE solved book and ESE Volume 2. Original and book versions are retained separately; the total is an entry count, not a claim of unique exam questions.
- GATE MCQ, MSQ and NAT answer controls; a numerical keypad; exact MSQ matching; accepted NAT ranges including alternative ranges; one-third MCQ penalties; marks-to-all support.
- ESE Prelims objective practice with one-third negative marking and no calculator in that track.
- ESE Mains and supplementary CSE Mains written answers, saved working notes, a sketchpad and an explicitly **self-assessed** rubric. Written work is never presented as automatically verified.
- Timed sectional tests, automatic submission, persistent answers and timer recovery after reload, review flags, bookmarks, revision queues, chapter analytics, dark/light themes and progress backups.
- A scientific calculator using a restricted parser, not executable input; trigonometric functions use degrees.

## Content and grading coverage

The in-app **Data & settings** view and `coverage.json` report the shipped counts and gaps. Official GATE keys are mapped where year, section and question numbering can be identified reliably. Book answer-table keys have a separate provenance label. Personal key edits are labelled as personal and stay in browser storage.

**Not every question has a verified grading key.** Questions without a usable key or reliable marks save responses but are excluded from automatic score and accuracy. Book numerical reference values are not turned into invented tolerance bands. Unclear question types are flagged for review; older types inferred from the screenshot are recorded as inferred metadata. This is a usable practice engine with an explicit content-review backlog, not a claim that every source entry is fully verified.

The five original screenshot compilations are fully imported. Scanned-book extraction is supplementary and automated: some OCR markers and poor original scans require manual review. The source books are not exhaustively transcribed. ESE Volume 1 was reviewed and covers fluid/thermal subjects; its contents are outside this SOM lab. Applied SOM problems already present in the original compilations are included.

OCR text powers search only. **The screenshot is the source of truth.** Formula recognition in OCR can be imperfect. Each question identifies its source and, for book crops, its PDF page. Printed book question numbers are not official paper question numbers. Retain the original uploaded documents for reference.

## Honest results

Accuracy uses only submitted correct/incorrect automatically graded attempts. Skipped, ungraded and written responses do not enter that denominator. Session marks use the total marks of questions with usable keys, so a test with missing keys never claims a fully graded paper score. Written self-assessment is shown separately. The simulator creates SOM sectional tests; it does not reproduce the full multidisciplinary GATE or ESE paper or claim official-interface equivalence.

Progress, personal keys, notes and drawings remain in this browser's local storage. There is no server account, analytics service, cloud sync or automatic upload of responses. Use **Data & settings → Export backup** regularly. Restoring a backup replaces this browser's saved progress only after an explicit confirmation.

## Development

This is a dependency-free static application. `index.html`, `styles.css`, `platform.css`, `app.js`, `platform.js`, `catalog.js` and `core.js` implement the workspace. `bank.js` holds question metadata. `assets-*.js` are lazy-loaded screenshot packs so the complete app also works from a downloaded folder. `server.cjs` is an optional local-only server.

```sh
npm test
npm run check
```

The tests exercise scoring edge cases, mixed-session totals and calculator safety. The data validator checks question identifiers, asset references, formats and key metadata. Browser checks cover answer selection, reload persistence, timer expiry and written practice.

## References and privacy

- [Official GATE marking rules and 2026 keys](https://gate2026.iitg.ac.in/QPs-answer-keys.html)
- [Official GATE historical papers and keys](https://gate2026.iitg.ac.in/download.html)
- [UPSC ESE examination scheme](https://upsc.gov.in/sites/default/files/Notif-ESEP-25-Engl-18092024.pdf)

This repository and its GitHub Pages website are public at the owner's request. Question screenshots and publisher content retain their original rights; their inclusion here does not grant redistribution rights. No access credentials are included. GitHub Pages publishes the main branch.
