# PYQ Nexus

A shared GATE ME, GATE XE and ESE practice website, with a separately labelled CSE Mains supplement.

**Open the lab: https://pyq-nexus-lab.github.io/**

## Question and answer library

- **2,747 unique questions:** 1,209 Strength of Materials and 1,538 Fluid Mechanics.
- **3,031 source entries** preserved; **284 duplicate copies** consolidated in 274 groups. Each merged question retains its appearances, years, chapters and source references. Material changes in signs, values or linked subquestions stay separate.
- **2,541 automatically gradable questions:** 817 official-key matches, 1,239 printed-book keys and 485 independently derived keys. Grades include MCQ penalties, exact MSQ sets, inclusive NAT ranges and historical short-answer controls.
- **197 written model references** for ESE Mains and the CSE supplement, with an explicitly self-assessed rubric for method, working, result and presentation.
- **9 explained objective source inconsistencies**, available for study and excluded from automatic marks. No unexplained missing references remain in this release.
- **19 restored or repaired screenshots**, including one previously omitted SOM archive entry. The original 37 screenshot packs stay intact.

The raw Fluid Mechanics solved-book sequence includes 223 GATE entries from 1987–2020, with 181 entries before 2017, plus 634 ESE Prelims archive entries. These are source-sequence counts before duplicate consolidation. Imported compilations and supplied book chapters define this bank's scope; other subjects await source files.

Every answer identifies its provenance. **Independently derived answers and Mains references are not official marking schemes.** Conditional references state missing information, approximations or inconsistent source data. Printed book question numbers are not official paper question numbers. OCR aids search; use the screenshot as the statement.

## Practice, tests and revision

Practice is **untimed**, with answer checking and View answer reference. Timed exam simulations hide answers until submission, preserve the countdown after reload and submit automatically at expiry. ESE Prelims disables the calculator. These are sectional and mixed-subject simulations, not complete official examination papers.

Confidence, spaced revision, a mistake journal, attempt history, notes, bookmarks and a sketchpad support learning. Again / Hard / Good / Easy schedules the next review; same-day ratings never compound intervals. Secure recall requires success on at least three separate study days, a confident latest answer and a seven-day or longer interval. It is a study indicator, not an exam prediction.

Home combines subject scores, answer coverage, revision priorities, targets, daily activity, chapter performance, planner progress and recent submissions. Choose an exam track, date period and latest-attempt or all-attempt calculation. Coverage uses all-time answered unique questions; skips do not count. Written self-scores remain separate from objective grades.

Advanced settings control exam and set defaults, adaptive selection, revision, targets, text size, density, focus layout and reduced motion. The subject hub has 17 spaces; SOM and Fluid Mechanics have banks. Empty subjects show honest empty states.

## Saved progress and updated keys

Progress stays in this browser on this device, without server accounts or cloud sync. Export a complete backup before changing browsers or website addresses. PYQ Nexus and legacy SOM Lab backups restore after preview and confirmation.

**Data & settings → Recheck saved answers** previews old objective results with current keys. Original grades stay in the backup's `gradingHistory`; responses, dates, notes and written self-scores are retained. An incompatible old response format requires a fresh attempt and is excluded from scores. Rechecking never advances revision schedules.

Duplicate migration preserves old IDs, translates reordered option responses, merges flags and notes, and retains conflicting data and original active navigators in backup recovery.

## Run locally

Download with **Code → Download ZIP**, extract and open `index.html`. Keep all screenshot packs and answer layers beside it. No build step is needed; optional web fonts fall back to local fonts offline.

For a stable local address, use Node.js 18 or later:

```sh
npm start
```

Open http://127.0.0.1:4173. Each origin has separate browser storage; export a backup before switching between file, local-server and public versions.

## Development and audits

The app is dependency-free static JavaScript. Raw `bank.js` and `fluid-bank.js` metadata is prepared by `catalog.js`, enriched by `answers-data.js` / `answers.js`, then consolidated by `dedup-data.js` / `dedup.js`. Screenshots load as needed. `repair-assets.js` supplies restored scans. The app, dashboard, learning and answer UI are shared across subjects. See `SUBJECT-INTEGRATION.md` to add a bank.

Screenshot corrections in `crops-data.js` / `crops.js` apply after answer enrichment and before deduplication. They can only replace image fields and source-crop provenance; they cannot change answers or curriculum metadata. `crop-assets-*.js` bundles load only when a question or preview needs them. `crop-source-audit.json` records source panels and image digests. Book screenshots were reconstructed with complete statements, diagrams, choices and shared data; matching original GATE papers recover clipped document screenshots. Complete clean originals are retained when a book scan is distorted. Original scan quality remains a limitation, and this audit does not certify every unchanged screenshot as perfect.

The question library offers **Preview**, **View at original size** and a source-appearance selector. Previewing does not start a practice session or change saved responses. `crops.test.cjs` checks metadata preservation, assets, provenance, linked context and grading. The original uploaded source documents remain unchanged.

```sh
npm test
npm run check
```

Tests cover scoring, NAT boundaries, short answers, errata, written self-assessment, grade rechecking, retained history, duplicate migration, option translation, subject isolation, analytics and spaced revision. Validation checks original assets, crop digests, archive numbering, repaired images, canonical marks and full reference coverage. Browser checks cover controls, references, written scoring, grade refresh, reload persistence and exam answer hiding.

`coverage.json`, `fluid-coverage.json`, `platform-coverage.json`, `dedup-audit.json`, `answer-audit.json` and `integrity.json` document counts, source appearances, reference limitations, repaired crops and file hashes. Retain the original uploaded documents for reference.

Official references: [GATE 2026 papers and keys](https://gate2026.iitg.ac.in/QPs-answer-keys.html) and [UPSC ESE scheme](https://upsc.gov.in/sites/default/files/Notif-ESEP-25-Engl-18092024.pdf).

## Chapter and topic learning path (v4.1)

All 2,747 canonical questions are organised into 36 chapters and 159 populated topics. SOM follows the detailed ESE volume 2 chapter order; Fluid Mechanics follows ESE volume 1. The GATE contents provide the crosswalk, with additional GATE/Mains applications appended after the core path. Topic categories progress from foundations to applications. These topic names are editorial, not claimed as official syllabus headings.

The library is grouped and sorted by chapter and topic. Year remains a filter and source reference. Subject workspaces provide expandable chapter/topic maps with real practice counts. Topic filters stay within their chapter. New practice navigators use learning order; timed exam simulations keep their chosen test order. Chapter practice includes the entire chapter; broad library sets offer the next 200 unanswered questions.

Quick practice now defaults to the earliest unanswered questions in teaching order. A one-time preference migration records the previous selection and preserves other settings. Existing sessions, question IDs, source appearances, screenshots, keys, saved answers, grades and notes retain their data. The user may still explicitly select adaptive or random practice in Settings.

`curriculum-data.js` contains the registry and complete canonical-ID assignments; `curriculum.js` validates and applies them after answer patching and deduplication. `curriculum-audit.json` records contents-page evidence, counts and classification basis. `curriculum.test.cjs` checks full coverage, ordering, filters, intact answer/source data and progress preservation. All 54 tests pass.
