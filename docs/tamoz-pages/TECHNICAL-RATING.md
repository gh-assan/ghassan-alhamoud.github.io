# Tamoz technical page rating

Page: `projects/tamoz-technical.html`. Purpose: a fixed base for comparing rounds of
change. Scores are judgement against the anchors below, not measurements. A round
may change the page, but it may not change an anchor to earn a higher score.

## Reader

An engineer or technical reviewer deciding whether the design holds up, including
one reviewing Tamoz for a pilot. The page must work after the repositories go private.

## Dimensions

Each dimension is scored 1 to 10. The overall score is the unweighted mean, capped
at Accuracy plus 1, because a well-organised page with wrong facts is not a good page.

| Dimension | 6 means | 8 means | 10 means | How it is checked |
|---|---|---|---|---|
| Accuracy | Headline claims hold, several stale facts | No known wrong claim; minor unverified detail | Every checkable claim traced to a dated record | Claim audit against the three repositories and the run records |
| Honesty about limits | Limits exist but sit apart from claims | Each major result has its limits beside it | Also says what evidence would change the conclusion | Read each result next to its nearest limit |
| Engineering depth | Names the mechanisms | Explains why each boundary exists and how it fails | A reader could design a test that would break it | Can a reader state the failure mode of each section's mechanism? |
| Strength of evidence | Mostly scripted or simulated | Real-model and real-board runs, with limits | Repeated seeds, independent instrument, real operation | Project property. Editing can only present it, not raise it. |
| Ability to check claims | Claims rely on the author's word | Reader sees source, revision and date without repository access | Frozen records for all major results are on this site | Remove GitHub access: what can still be checked? |
| Structure and readability | One long chronological document | Grouped by question; reader paths; consistent numbering | Any question answered from the contents in one step | Contents review; figure and section numbering; cross-references |
| Clear audience | Mixed reader and mixed calls to action | One stated reader and one next step, no stale promotion | Every section earns its place for that reader | Search for promotion; compare opening and closing |

## Gates

These do not add points. A round cannot be committed unless all pass:

- `npm run validate`, `python3 -m unittest discover tests`, and `npm run test:motion`
- No duplicate IDs or missing same-page anchors. Inbound anchors stay: `#trial`,
  `#hardware`, `#rounds`, and `#rule-promotion`.
- No console errors and no page overflow at 1024 px wide. Owner decision, 2026-11-02:
  this page doesn't need to work on mobile.
- No em dashes in authored copy.

## Method

1. Score the page, using a fresh rater that has not seen the edits where possible.
2. Fix the largest gaps that editing can close, then run the gates.
3. Rescore, record the round below, and commit.
4. Stop when a round raises no dimension by at least 0.5, or when every remaining gap
   needs new evidence or an owner decision. At most four rounds.

## Rounds

| Round | Accuracy | Limits | Depth | Evidence | Checkable | Structure | Audience | Overall | Scored by |
|---|---|---|---|---|---|---|---|---|---|
| 0: baseline `51c5b60` | 6 | 8 | 7 | 6 | 6 | 6 | 6 | 6.4 | Fresh reviewer |
| 1: factual drift | 8 | 9 | 7 | 7 | 6 | 6 | 6 | 7.0 | Author, provisional |
| 2: structure, audience, frozen records | 7.5 | 8.5 | 8.5 | 7 | 7 | 8.5 | 8 | 7.8 | Fresh reviewer |
| 3: reviewer corrections, more records | 7.5 | 9 | 8.5 | 7 | 8.5 | 8.5 | 8 | 8.1 | Fresh reviewer |
| 4: budgets, gates, labels, investigation runs | 7 | 8.5 | 8 | 6.5 | 8 | 8.5 | 8 | 7.8 | Fresh reviewer |

The reviewer's round 4 findings were corrected afterwards, on 2026-11-03. Those corrections have not been rescored, because the round limit was reached.
