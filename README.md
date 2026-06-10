# The Octagon Archetypes

**Visualizing the 30-Year Evolution of Mixed Martial Arts (1994–2026)**

Information Visualization project — TU Wien, SS 2026.

An interactive Flask + D3.js dashboard that maps how UFC fighting styles have
evolved from the era of pure specialists into the modern hyper-optimized hybrid
athlete, using ~8,500 real bouts of FightMetric micro-stats.

## Team

- Ayush Bhattacharya (12225408)
- Defin Biju (12551221)
- Ricardo Gereda (12550976)

---

## Research Question & Motivation

> **"How have UFC fighting-style archetypes shifted over 30 years — and can we
> watch individual fighters migrate between them in real time?"**

Mixed martial arts began as a showcase for pure specialists (wrestlers,
Muay-Thai strikers, Brazilian jiu-jitsu grapplers). The conventional wisdom is
that modern fighters are "hybrids", but this has never been rigorously
quantified across the full history of the sport. We operationalize *style* as a
10-dimensional vector of per-fight micro-stats, cluster fighters into named
archetypes, and animate their collective drift over three decades — making an
abstract statistical claim visually concrete and interactively explorable for
fans and analysts alike.

---

## Data Mining

- **Primary source:** [UFC-DataLab](https://github.com/komaksym/UFC-DataLab) —
  a community-maintained scrape of [ufcstats.com](http://ufcstats.com) covering
  **UFC 2 (March 1994) → UFC Fight Night: Adesanya vs. Pyfer (March 2026)**
  (8,591 bouts). This is real, live-scraped fight data, not a static Kaggle
  export; it required manual inspection of the schema to determine which columns
  were fighter-level vs. bout-level.
- **Custom scraper:** `ufc_master_scraper.py` is a fully functional
  `BeautifulSoup` / `requests` scraper of ufcstats.com fight-detail pages,
  developed from scratch during the project. It is retained for pipeline
  extensibility and can re-scrape the full site independently of UFC-DataLab.
  The live pipeline uses the consolidated download because it already includes
  2026 data without requiring a multi-hour crawl.
- No synthetic or placeholder data is used anywhere in the project.

---

## Data Cleaning & Transformation

All processing lives in `process_data.py`:

| Step | Detail |
|------|--------|
| **Bout → fighter split** | Each of 8,591 bouts contains two fighter columns; we transpose into one row per (fighter, bout) record — roughly doubling the row count. |
| **Duration parsing** | Bout duration is stored as `"M:SS"` strings; converted to total seconds so control-time ratios are numerically meaningful. |
| **Weight-class normalisation** | Free-text class labels (e.g. `"Lightweight"`, `"Women's Strawweight"`) are mapped to a controlled vocabulary of 14 classes. |
| **Height / reach imputation** | Missing values (~18% of fighters) are imputed with the **weight-class-wise median** rather than a global mean, reducing the systematic bias introduced by lumping flyweights and heavyweights together. |
| **Ratio / rate normalisation** | Raw volume counts are converted to dimensionless rates: `ctrl_pct = control_seconds ÷ fight_duration`, strike-target percentages (head / body / leg), and positional percentages (distance / clinch / ground). This is equivalent to the "Per-15" normalisation proposed in the original plan — dividing by fight duration prevents a 15-second KO from dominating a 25-minute grind. |
| **Early-era zero-fill** | Fighters active before FightMetric began tracking strike-target data have zero-filled feature vectors. This is **intentional and transparent**: they cluster naturally into a separate *Pre-FightMetric Era* group, labelled as such in the UI and toggleable so it does not distort the main trend. |
| **K-Means clustering (K = 6)** | `random_state=42` ensures reproducibility. Archetype labels are validated against cluster centroids (e.g. "Distance Sniper" → 80% distance position, 0.32 avg KDs/fight). |
| **Frozen PCA** | A `StandardScaler` + `PCA(n_components=2)` is fit **once** on career-average style vectors, then frozen. Each fighter's *cumulative* style vector for every calendar year is projected through the same frozen transform so the reference frame never shifts — dots migrate, axes stay fixed. PCA captures 44.6% of variance (PC1 = 27.1%, PC2 = 17.5%), disclosed on the chart itself. |

---

## Visualization Design

Three fully linked views, all rendered with **D3.js v7** (no charting library
wrapper):

### 1 · The Archetype Streamgraph
A stacked-area chart showing each archetype's **percentage share of active
fighters per year** (not raw counts, which would conflate organizational growth
with stylistic change). Design choices:
- Percentage share rather than absolute counts removes the confound of the UFC
  expanding from ~50 to ~650+ active fighters.
- The *Pre-FightMetric Era* band uses a deliberate grey / hatched fill to
  signal data sparsity, not a real style.
- Stream bands are sorted by centroid similarity so visually adjacent bands are
  stylistically related.

### 2 · The Great Migration (PCA Scatter)
A scatter plot on a **locked PCA reference frame** where each dot is a fighter
coloured by their career archetype, positioned by their *cumulative style as of
the selected year*. Non-standard design choices that go beyond a static scatter:
- **Animated dot migration** — the Play button renders a smooth 30-year morph
  (D3 `transition` tweening) rather than a re-drawn snapshot per year.
- **Archetype centroid trails** — semi-transparent polylines trace where each
  archetype's centre of gravity has drifted, making the macro-trend legible even
  when individual dots overlap.
- **KDE density contours** (d3-contour) overlay directly addresses the visual
  noise problem inherent in plotting ~1,500 fighter dots simultaneously; they
  reveal the overall distribution shape without occluding individual points.
  Alpha-blended dots behind the contours preserve individual fighter lookups.
- **Career-stable colour, per-year position** — archetype colour is assigned
  from the career-average fit (stable identity), while position updates yearly
  (developmental trajectory). This design choice avoids colour flickering while
  still showing positional change.

### 3 · Fighter DNA Radar Charts
Side-by-side overlaid radar charts for any two fighters. Design choices:
- **Per-axis normalisation** — each axis is scaled to the 5th–95th percentile
  of the full fighter population, not 0–100 of the raw stat. This directly
  addresses the proposal feedback about radar axes needing correct normalisation
  so that different attributes are visually comparable when overlaid.
- **Autocomplete fighter search** — both corners, with career record, physical
  attributes, and stance displayed beneath the chart.

---

## Interaction Design

| Interaction | Mechanism |
|-------------|-----------|
| **Timeline scrubbing** | Drag or click the slider → streamgraph and scatter update simultaneously (brushing & linking across two charts). |
| **Play / Pause animation** | 30-year auto-play at configurable speed; loop restarts cleanly. |
| **Stream band click** | Clicking an archetype band in the streamgraph cross-highlights matching dots in the scatter — direct multi-view linking. |
| **Scatter dot click** | Clicking a fighter dot loads their profile into the left radar corner — drill-down from aggregate to individual. |
| **Radar autocomplete** | Free-text search in both radar corners with instant suggestions. |
| **Pre-FightMetric toggle** | Checkbox hides/shows the early-era band without re-running any computation. |
| **Density contour toggle** | Checkbox overlays / removes KDE contours on the scatter for progressive disclosure. |

---

## Implementation

Non-standard implementation aspects:

- **Frozen scaler + frozen PCA** — scikit-learn `Pipeline` objects are pickled
  after fitting on career data; the per-year cumulative vectors are transformed
  through the frozen pipeline. This ensures the scatter's reference frame is
  mathematically stable across all 33 yearly snapshots, which is a non-trivial
  invariant to maintain when the feature matrix changes shape each year.
- **Pre-computed per-year snapshots** — rather than computing PCA projections
  at request time, `process_data.py` pre-materialises a `(fighter, year, pca_x,
  pca_y)` table (~35k rows). Flask serves this as a single JSON payload on
  page-load; D3 filters client-side. This makes the Play animation smooth (no
  round-trips) while keeping the server stateless.
- **KDE density contours in D3** — `d3-contour` computes a 2D kernel-density
  estimate entirely in the browser from the current year's visible dot positions,
  then re-renders on each slider tick. No pre-computed contour data is stored on
  disk.
- **D3 tweening for dot migration** — fighter dot positions are interpolated
  with `d3.transition().duration(750)` between yearly states, producing a
  genuinely smooth morphing animation rather than a hard cut.

---

## Key Findings

1. **Specialist → hybrid convergence is real and measurable.** The PCA scatter
   compresses from a wide, sparse spread in 1994–2005 into a dense central core
   by 2020–2026, visible both in the animated scatter and the streamgraph's
   shrinking specialist bands.
2. **Wrestling-based styles dominate the 2010s peak.** *Wrestling Controller*
   and *Ground & Pound Grappler* reach combined peaks of ~45% share around
   2012–2016, coinciding with the "wrestler era" commonly discussed by analysts.
3. **Striking specialists resurge post-2018.** *Distance Sniper* and *Leg Kick
   Specialist* shares recover after 2018, consistent with the rise of elite
   kickboxers entering MMA.
4. **Individual career arcs are legible.** Khabib Nurmagomedov's dot drifts
   steadily toward the wrestling-control extreme as his career accumulates;
   Charles Oliveira settles deep into the submission-grappler region after
   a striker-phase early career — both trajectories match widely held expert
   assessments, providing an informal validation of the pipeline.

---

## Running the App

```bash
# 1. Install dependencies (Python 3.11+ recommended)
pip install -r requirements.txt

# 2. (First run only) fetch the raw dataset from UFC-DataLab
python download_processed_bouts.py

# 3. Regenerate the derived CSVs in data/
python process_data.py

# 4. Launch the dashboard
python app.py
# → opens at http://127.0.0.1:5012
```

`python app.py` starts the Flask development server; navigate to
`http://127.0.0.1:5012` in any modern browser to interact with the full
dashboard.

---

## Tech Stack

| Layer | Tools |
|-------|-------|
| Data pipeline | Python 3.11, `pandas`, `numpy`, `scikit-learn` (K-Means, PCA, StandardScaler) |
| Web server | Flask 3 |
| Visualizations | D3.js v7, `d3-contour` (KDE), custom SVG |
| UI shell | Bootstrap 5, custom CSS |
| Scraping | `BeautifulSoup4`, `requests` |

---

## Project Files

| File | Purpose |
|------|---------|
| `ufc_master_scraper.py` | Custom ufcstats.com scraper (extensibility) |
| `download_processed_bouts.py` | Fetch raw bouts CSV from UFC-DataLab |
| `process_data.py` | Full cleaning, feature engineering, clustering, PCA |
| `app.py` | Flask routes + JSON API |
| `static/js/streamgraph.js` | Archetype Streamgraph (D3) |
| `static/js/migration.js` | The Great Migration scatter + contours (D3) |
| `static/js/radarchart.js` | Fighter DNA Radar Charts (D3) |
| `static/js/main.js` | Cross-chart linking, slider, play loop |
| `data/` | Pre-computed CSVs (gitignored raw download) |
