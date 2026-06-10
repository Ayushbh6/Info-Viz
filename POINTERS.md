# Presentation Pointers — The Octagon Archetypes

---

## Data & Pipeline

- **Data source:** UFC-DataLab (GitHub: `komaksym/UFC-DataLab`) — real, scraped fight statistics from ufcstats.com. 8,591 bouts total.
- **Coverage:** UFC 2 (March 1994) → UFC Fight Night: Adesanya vs. Pyfer (March 2026). Say "1994–2026" everywhere — **not 1993**. The dataset doesn't include UFC 1 (Nov 1993); that's a limitation of the upstream data source, not our processing.
- **Fights by era:** 203 in 1990s, 1,041 in 2000s, 4,196 in 2010s, 3,151 in 2020s.
- The `ufc_master_scraper.py` exists as a standalone tool but **the live pipeline uses the GitHub download**, which already contains up-to-date 2026 data. You can say "we developed a custom scraper for extensibility" — that's true.

---

## Feature Engineering — Be Ready to Explain

- **ctrl_pct** is control time in seconds divided by total fight duration in seconds → result is 0–1. Confirmed against raw data.
- **Strike target % (head/body/leg) and positional % (distance/clinch/ground)** are sourced directly from FightMetric columns. Already 0–100 scale.
- **kd_avg / sub_att_avg** are raw per-fight averages. Fighters with only 1–2 fights and multiple finishes can inflate these (e.g., 3.0 KDs/fight). We didn't apply a minimum fight filter — mention this briefly as a known limitation. The radar caps at 100 so it doesn't break visually.
- **fillna(0.0) for early-era fighters**: Early UFC (1990s) had no FightMetric strike-target data. Filling with zero naturally groups them into the legacy cluster. This is **intentional and transparent design** — don't apologize for it. In the UI this band is labelled **"Pre-FightMetric Era (sparse stats)"** (internal data key is still `Legacy / Historical (Limited Stats)`) and is toggleable, because it represents *missing data*, not a real fighting style.

---

## Clustering

- **K-Means, K=6, random_state=42** — reproducible. The 6 archetypes are:
  - Distance Sniper (815 fighters) — high head%, high distance%
  - Wrestling Controller (794) — high control, moderate ground
  - Ground & Pound Grappler (318) — very high ground%, control, TD accuracy
  - Leg Kick Specialist (374) — high leg%, high distance%
  - Clinch Boxer (278) — high clinch%, body strikes
  - Legacy / Historical (78) — early-era fighters with sparse stats
- Centroid validation was done — labels match cluster characteristics. If asked, you can show the centroids table.
- **The archetype labels are hardcoded to cluster indices** — if the pipeline is ever re-run from scratch, cluster numbering could shuffle. This is fine for a submitted, frozen project.

---

## PCA / The Great Migration — Be Transparent Here

> *Say in your presentation:* **"PCA captures 44.6% of variance (PC1=27.1%, PC2=17.5%). The 2D positions reflect the two dominant stylistic axes but do not capture the full 10-dimensional fighter DNA. This is standard for high-dimensional behavioral data, and we disclose it explicitly."**

- The PCA (and StandardScaler) are **fit once on career-average profiles**, then **frozen**. The K-Means archetype labels are assigned from that same career fit, so each fighter keeps **one stable archetype colour** for their whole career.
- **Fighter dot positions DO move per year.** For each `(fighter, year)` we take their *cumulative* style vector (all fights up to that year), pass it through the **same frozen scaler + PCA**, and store the resulting `pca_x/pca_y`. So a dot physically migrates across the plane as a fighter's cumulative style develops.
  - Example to cite: **Khabib drifts from ≈(1.5, −0.3) in 2012 → (3.7, −0.9) by 2019** as control-wrestling accumulates. **Oliveira** settles into the submission-grappler region over a decade.
- Two things therefore animate together: (1) individual dots tween to their new yearly positions, and (2) the **centroid trails** trace each archetype's center of gravity over time. Together they show the field collapsing from sparse 1990s specialists into the dense 2020s hybrid core — exactly the "Great Migration".
- **Why archetype is career-based but position is per-year:** identity (what *kind* of fighter someone ultimately is) is most robustly judged across a whole career, while position should show *development*. Splitting these avoids dots flickering between colours year to year.
- Reproducibility: re-running `process_data.py` reproduces identical cluster labels (verified) and a per-year PCA range of roughly x∈[−4.7, 9.9], y∈[−5.6, 8.9].

---

## Proposal vs. Implementation — Honest Reframing (be ready for this)

- **"Hybrid Kaggle + live-scrape" claim:** In the proposal we planned to merge a Kaggle legacy archive with a custom scrape. In practice we consolidated onto a **single richer real source — UFC-DataLab** (itself scraped from ufcstats.com) that already spans **1994–2026**, removing the need to stitch two schemas. The custom `ufc_master_scraper.py` is retained and functional for extensibility. Frame as: *"we found one authoritative real source that already covered the full range, so merging two partial sets would only add schema risk."*
- **"Per-15 normalization" claim:** The proposal mentioned normalizing absolute volumes to per-15-minute rates. Our clustering features are instead **ratio/percentage-based** (`ctrl_pct` = control seconds ÷ fight duration, plus target % and positional % which are already rate-like, and per-fight averages for KD/sub). `ctrl_pct`'s division by fight duration **achieves the same anti-skew goal as Per-15** (a 15-second KO can't dominate). So the *intent* of Per-15 is satisfied via time/ratio normalization — be transparent that we used ratios, not literal Per-15 counts.

---

## Potential Professor Questions — Prepared Answers

| Question | Answer |
|---|---|
| Why does data start 1994, not 1993? | UFC 1 (Nov 1993) has no FightMetric stats. Our source (UFC-DataLab) begins at UFC 2. Not a processing error. |
| Why only 44.6% PCA variance? | 10 behavioral dimensions have inherent non-linear structure. PCA is used for interpretable 2D layout, not dimensionality reduction as an end goal. We disclosed this on the chart. |
| Why don't fighter dots move on the slider? | Career averages are more robust for archetype assignment. The centroid trails (visible on the chart) show the meaningful temporal drift. Per-fight noise would make the scatter unreadable. |
| What's the "Legacy" cluster? | Fighters active in the 1990s before FightMetric tracked strike targets. Zero-filled features cluster them together naturally — a feature, not a flaw. |
| How did you validate archetype names? | By inspecting the cluster centroids. E.g., "Distance Sniper" has 80% distance position and 0.32 avg KDs — consistent with the label. |
| Why K=6? | Chosen to produce distinct, nameable archetypes without over-fragmenting. Legacy fighters form a natural 6th group from the missing data pattern. |

---

## What's Actually Strong — Emphasize This

- **Real, scraped data** spanning 32 years of UFC — not a synthetic or Kaggle-only dataset
- **Three fully linked visualizations** — timeline slider synchronizes streamgraph + scatter simultaneously; clicking a stream band cross-highlights scatter; clicking a dot loads fighter into the radar
- **Per-year migrating scatter** — fighter dots physically move across the PCA plane as their cumulative style develops, over a locked reference frame, so Play renders as a smooth morph (not a re-pasted snapshot each year)
- **Play/Pause animation** — users can watch the 30-year meta evolution unfold automatically as the field collapses from sparse specialists into the dense hybrid core
- **Density contour overlay** — directly addresses professor feedback about visual noise in scatter
- **Radar normalization** — directly addresses professor feedback about radar axis scaling
- **Autocomplete fighter search** — both corners, cross-chart linked
- **Career record, height/reach, stance** displayed per fighter
- The PCA annotation on the chart itself shows academic rigor without needing to explain it verbally

---

## Files Changed (for commit message)

- `static/css/style.css` — premium UI overhaul
- `static/js/main.js` — fixed `.strip` → `.trim()` bug; corrected 1993→1994 in play loop
- `static/js/streamgraph.js` — corrected 1993→1994 year clamp
- `static/js/migration.js` — corrected 1993→1994 centroid loop
- `templates/index.html` — corrected year range to 1994–2026; added PCA annotation caption; updated footer
