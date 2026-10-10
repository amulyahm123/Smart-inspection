# Smart Risk Score – how it works

A transparent, **rule-based** score from 0 to 100 for every active site. It is **not** a machine-learning model: nothing is trained,
and no prediction accuracy is claimed. The engine is a pure function (`src/services/risk/riskEngine.js`) so a validated predictive
model could later replace or sit beside it once enough real history exists.

## Formula
```
points(factor) = weight(factor) × ratio(factor)          ratio is between 0 and 1
score          = round( Σ points of factors WITH data ÷ Σ weights of those factors × 100 )     → always 0–100
```
A factor is **scored**, **not applicable** (e.g. progress for an old site, a project not yet due to start, a site on hold) or
**no data** (e.g. no recorded inspection findings). The last two are left out of both sides of the fraction – missing data is never
counted as zero risk – and they lower the **data confidence**:
`coverage = scored weight ÷ (scored weight + no-data weight)` → High ≥ 85 %, Medium ≥ 60 %, otherwise Low.

Levels: **Low 0–30 (green) · Medium 31–60 (amber) · High 61–100 (red)**.

## Factors and default weights (configurable: Dashboard → High-risk sites → Settings, must add up to 100)
| Factor | Weight | Ratio |
|---|---|---|
| A. Unresolved issues | 30 | Σ(severity points × status factor × overdue × recurring) ÷ 30, capped at 1. Severity points: Critical 12, High 7, Medium 3, Low 1. Status factor: Reported/Verified/Assigned/In Progress 1 · **Resolved 0.25** (fixed, awaiting closure) · **Closed 0**. Past its deadline (Critical 3 d, High 7 d, Medium 14 d, Low 30 d) ×1.25; recurring ×1.2 |
| B. Missed / overdue inspections | 25 | missed in last 90 days: 0→0, 1→0.35, 2→0.65, 3+→1 (repeats weigh more) **plus** each overdue visit 0.2 + 0.2 × (days late ÷ the site's inspection interval); capped at 1. Not applicable for sites that are not started or on hold |
| C. Progress & delays | 15 | 0.7 × (progress behind expected ÷ 20) + 0.3 × (deadline passed ? 0.5 + 0.5 × days past ÷ 90 : 0). A project not yet due to start is **not penalised**; one past its start date but still "not started" is scored by days late (÷ 30). Existing sites: not applicable |
| D. Attendance & GPS verification | 15 | 0.4 per unresolved GPS verification failure (outside the radius with no verified check-in the same day) + 0.3 per visit checked in but never checked out. **Missing GPS data is not treated as misconduct** (it lowers confidence only). Confirmed no-shows are shown separately and scored only under B |
| E. Recent inspection findings | 15 | last 3 completed inspections in 60 days with recorded results, weighted 1 / 0.7 / 0.5: Good 0, Attention 0.5, Critical 1; +0.2 if 2 or more were below Good (repeated); +0.25 for failed fire-safety / electrical checklist items |

## No double counting
* An issue is scored only in **A**. Factor E uses the inspection *result*, never the issue records.
* A missed inspection is scored only in **B**; an overdue gap already explained by a missed or overdue visit is not scored again.
* Factor D never re-counts no-shows.

## Explanations
The sentence ("High Risk — Score 78/100. 2 unresolved critical issues; …") is generated from the counts in the stored calculation,
never from templates with invented numbers. Each reason names its factor; the Site page also shows every factor's points and any
missing-data notes.

## When scores are recalculated
Automatically after: an inspection is scheduled / submitted / completed, an issue is reported or its status changes (Resolved/Closed),
a site's details, status, progress or deadline change, or a GPS failure is logged. Time-based changes (a visit becoming overdue) are
picked up on the first use each day. Admin can press **Recalculate** (per site or for all). An unchanged input is never recalculated.
A snapshot is stored when the score or level changes, and once per day. History starts at implementation – nothing is back-filled.

## Alerts (Alerts page, Admin only; each can be acknowledged)
* Site enters **High Risk** · Critical issue unresolved beyond its deadline · **2+ missed inspections** · score rises **15+ points within 7 days**.
* Alert ids are built from the condition, so one unresolved condition is one alert. An acknowledgement stays valid only while the
  condition is the same one (e.g. a new High-risk episode needs a new acknowledgement).

## Recommendations
High → immediate review and inspection · Medium → inspect soon · Low → continue the normal schedule. They are advisory only and never
change a statutory inspection schedule or an administrative decision.
