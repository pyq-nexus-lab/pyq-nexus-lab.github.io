# Add a subject to the shared PYQ Lab

The existing GitHub Pages address remains the single platform URL. `catalog.js` defines the subject registry; `platform.js` provides shared subject workspaces, search, planner and progress. `app.js` owns the common question, exam and revision engine. Do not fork the app for a new subject.

## Integration contract

1. Use the subject ID from `PYQCatalog.subjects` (for example `thermodynamics`). Add a registry entry if a new subject is needed.
2. Save its reviewed question metadata in a new local JavaScript file. Append a bank to `window.PYQ_BANKS` before `app.js` runs:

```js
window.PYQ_BANKS = window.PYQ_BANKS || [];
window.PYQ_BANKS.push({subject: 'thermodynamics', questions: reviewedQuestions});
```

3. Load this file from `index.html` after `catalog.js` and before `app.js`. No engine changes are needed for cards, search, filters, subject stats or mixed-subject tests.
4. Each question needs `id` (stable within its bank), `title`, `chapter`, `source`, `exam`, `type`, and `imageUrl` (relative, same-site path to its original cropped image). Include `year`, `number`, `sourcePage`, `text`, `marks`, `keyStatus`, `keySource` and `explanation` when verified. Do not fabricate keys or mark unverified questions official.
5. Exam values: `gate-me`, `gate-xe`, `ese-prelims`, `ese-mains`, `cse-mains` (supplement only). Types: `MCQ`, `MSQ`, `NAT`, `WRITTEN`, `UNCLASSIFIED`.
6. MCQ/MSQ key: `{options:['A']}` or `{options:['A','C']}`. NAT key: `{min:1.2,max:1.4}` with optional `ranges:[[1.2,1.4],[2.2,2.4]]`. Missing keys are `null`; written questions use self-assessment. Usable keys require positive, verified marks and a source.
7. New bank IDs are namespaced automatically as `subject:original-id`. SOM IDs stay unchanged for backward compatibility. Duplicate IDs within one subject are rejected. Keep raw image filenames independent from generated IDs by using `imageUrl`.
8. Existing SOM screenshots retain the original `assets-*.js` loading scheme. New subjects should prefer ordinary image files under `subjects/<subject-id>/images/`. Add a subject-specific formula reference before enabling that subject's reference tool; SOM formulas are not displayed for other subjects.

Run `npm test` for scoring and subject isolation checks. Validate new screenshots and answer keys against their source before publishing. Verify subject filtering, empty states, a mixed-subject session and backup restore in the browser. Rebuild `integrity.json` when changing shipped files.

## Storage compatibility

The browser key remains `som-lab-v1` intentionally. Existing answers, notes, sketches, attempts, keys and active timers are preserved. New subject selection and planner blocks are additive fields. Exports use `pyq-lab-backup` version 1; both this format and `som-lab-backup` version 1 are accepted. Progress remains local to each browser and origin, not synced between devices or the older OpenAI Sites host. Restore requires explicit confirmation.

Subjects without question banks show honest empty states. Subject cards and planners are not claims that their PYQs are imported or grading-verified.
