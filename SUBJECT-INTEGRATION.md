# Add a subject to the shared PYQ Nexus

The existing GitHub Pages address remains the single platform URL. `catalog.js` defines the subject registry; `platform.js` provides shared subject workspaces, search, planner and progress. `app.js` owns the common question, exam and revision engine. Do not fork the app for a new subject.

## Integration contract

1. Use the subject ID from `PYQCatalog.subjects` (for example `thermodynamics`). Add a registry entry if a new subject is needed.
2. Save its reviewed question metadata in a new local JavaScript file. Append a bank to `window.PYQ_BANKS` before `app.js` runs:

```js
window.PYQ_BANKS = window.PYQ_BANKS || [];
window.PYQ_BANKS.push({subject: 'thermodynamics', questions: reviewedQuestions});
```

3. Load this file from `index.html` after `catalog.js` and before `app.js`. No engine changes are needed for cards, search, filters, subject stats or mixed-subject tests.
4. Each question needs `id` (stable within its bank), `title`, `chapter`, `source`, `exam`, `type`, and either `imageUrl` (relative, same-site path) or `pack` (a lazy-loaded JavaScript screenshot pack). Include `year`, `number`, `sourcePage`, `text`, `marks`, `keyStatus`, `keySource` and `explanation` when verified. Do not fabricate keys or mark unverified questions official.
5. Exam values: `gate-me`, `gate-xe`, `ese-prelims`, `ese-mains`, `cse-mains` (supplement only). Types: `MCQ`, `MSQ`, `NAT`, `TEXT` (historical short answers), `WRITTEN`, `UNCLASSIFIED`.
6. MCQ/MSQ key: `{options:['A']}` or `{options:['A','C']}`; verified official alternatives use `optionSets:[['A','B'],['A','B','D']]`. NAT key: `{min:1.2,max:1.4}` with optional `ranges:[[1.2,1.4],[2.2,2.4]]`. Missing keys are `null`; written questions use self-assessment. Usable keys require positive, verified marks and a source.
7. New bank IDs are namespaced automatically as `subject:original-id`. SOM IDs stay unchanged for backward compatibility. Duplicate IDs within one subject are rejected. Keep raw image filenames independent from generated IDs. The engine retains `assetId` for pack lookup.
8. Existing SOM screenshots retain the original `assets-*.js` loading scheme. New subjects can use ordinary files under `subjects/<subject-id>/images/` or self-contained packs assigning raw IDs to `window.PYQ_IMAGES`. Fluid Mechanics uses packs to preserve downloaded-folder practice and fit the upload delivery path. Keep packs below 4.5 MB and add a crop SHA-256 digest to each question. Archive entries use `archive:true`; assertion/reason questions can include reviewed `answerDirections`. Add a subject-specific formula reference before enabling that subject's reference tool; SOM formulas are not displayed for other subjects.

Run `npm test` for scoring and subject isolation checks. Validate new screenshots and answer keys against their source before publishing. Verify subject filtering, empty states, a mixed-subject session and backup restore in the browser. Rebuild `integrity.json` when changing shipped files.

## Storage compatibility

The browser key remains `som-lab-v1` intentionally. Existing answers, notes, sketches, attempts, keys and active timers are preserved. New subject selection and planner blocks are additive fields. Exports use `pyq-lab-backup` version 1; both this format and `som-lab-backup` version 1 are accepted. Progress remains local to each browser and origin, not synced between devices or the older OpenAI Sites host. Restore requires explicit confirmation.

Subjects without question banks show honest empty states. Subject cards and planners are not claims that their PYQs are imported or grading-verified.

## Answer and duplicate layers

Load additional banks before `answers-data.js` and `answers.js`, then `dedup-data.js` and `dedup.js`. Answer patches use fully namespaced stable IDs; unknown patch IDs and duplicate additional IDs fail validation. Retain raw banks and screenshot packs.

Use `keyStatus:official`, `book` or `solved` and specific `keySource` provenance. Written questions need `referenceAnswer`, `explanation` and checked marks. Historical short answers use `{acceptedText:["true"]}`; normalisation ignores case, whitespace and comma/semicolon/colon separators without claiming general symbolic equivalence.

Inconsistent source questions use `answerIssue`, an explained `referenceAnswer` and `key:null`. They remain accessible outside automatic scores. Merge only matching subject, exam and type, preserving aliases and option translations. Material sign, value or linked-subquestion changes stay separate. `recheck.js` updates past grades after preview and confirmation; original grades stay in `gradingHistory`.

## Curriculum integration

Add every ready subject to `PYQ_CURRICULUM_DATA.subjects` with stable chapter/topic IDs and numeric teaching orders. Assign every canonical question ID to exactly one topic in `assignments`; classify after answer patching and duplicate consolidation. Unknown assignments, absent mappings and subject mismatches fail rather than silently hiding questions. Keep source chapters in raw metadata. `PYQCurriculum.apply` retains them as `sourceChapter`/`sourceChapters` and leaves occurrence references unchanged.

Load `curriculum-data.js` and `curriculum.js` before Insights, and `curriculum-ui.js` before the app. New bank or dedup changes need matching curriculum assignments and a refreshed audit. Validate complete coverage, nested topic filtering and preserved answer/asset identity. New untimed practice uses curriculum ordering; do not reorder an already saved active session.
