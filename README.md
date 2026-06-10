# The Octagon Archetypes

**Visualizing the 30-Year Evolution of Mixed Martial Arts (1994–2026)**

Information Visualization project — TU Wien.

An interactive Flask + D3.js dashboard that maps how UFC fighting styles have
evolved from the era of pure specialists into the modern hyper-optimized hybrid
athlete, using ~8,500 real bouts of FightMetric micro-stats.

## Team

- Ayush Bhattacharya (12225408)
- Defin Biju (12551221)
- Ricardo Gereda (12550976)

## Data

- **Source:** [UFC-DataLab](https://github.com/komaksym/UFC-DataLab) — real fight
  statistics scraped from [ufcstats.com](http://ufcstats.com). It already spans
  **UFC 2 (March 1994) → March 2026** (8,590 bouts), so it serves as a single
  authoritative source rather than merging multiple partial archives.
- **Custom scraper:** `ufc_master_scraper.py` is a working `BeautifulSoup`
  scraper of ufcstats.com fight-detail pages, retained for extensibility. The
  live pipeline uses the consolidated UFC-DataLab download.
- No synthetic or placeholder data is used anywhere.

## Pipeline

1. `download_processed_bouts.py` — fetches the raw bouts CSV into `data/`.
2. `process_data.py` — cleans and feature-engineers the data:
   - Splits each bout into two fighter-records; parses bout durations to seconds.
   - Normalizes weight classes; imputes missing height/reach with class-wise medians.
   - Engineers ratio-based style features (control %, head/body/leg target %,
     distance/clinch/ground position %, per-fight KD / submission averages,
     takedown %). Ratio normalization (e.g. control-time ÷ fight-duration)
     prevents short fights from skewing the data — the goal of "Per-15" rates.
   - **K-Means (K=6, `random_state=42`)** clusters fighters into named archetypes,
     with a rule-based override isolating *Submission Grappler* (≥ 0.80 sub
     attempts/fight). Archetype labels are reproducible.
   - **PCA (2D)** is fit once on the career profiles and **frozen**, then applied
     to each fighter's *per-year cumulative* style vector so positions migrate
     over time (see "The Great Migration" below).
   - Emits three derived CSVs into `data/`.

## Visualizations

- **The Archetype Streamgraph** — stacked % bands per year showing how specialist
  styles gave way to hybrids. The grey *Pre-FightMetric Era* band (sparse early
  stats) is toggleable.
- **The Great Migration** — a PCA scatter on a locked reference frame. Each dot
  is a fighter, coloured by their (career-stable) archetype, positioned by their
  *cumulative style as of the selected year*. Scrubbing/playing the timeline
  animates dots migrating from sparse 1990s specialists into the dense 2020s
  hybrid core, with archetype **centroid trails** tracing each style's drift.
- **Fighter DNA Radar Charts** — pick any two fighters (autocomplete) and overlay
  their normalized striking-target, tactical-position, and grappling profiles.

All three views are linked: the timeline slider drives both top charts, clicking
a stream band cross-highlights the scatter, and clicking a dot loads that fighter
into the radar comparison.

## Running locally

```bash
# from this directory, with a Python 3.11+ environment
pip install -r requirements.txt

# (first run only) fetch the raw dataset
python download_processed_bouts.py

# regenerate the derived CSVs in data/
python process_data.py

# launch the dashboard
python app.py
# open http://127.0.0.1:5012
```

## Tech stack

Python (`pandas`, `numpy`, `scikit-learn`), Flask, D3.js v7, Bootstrap 5.
