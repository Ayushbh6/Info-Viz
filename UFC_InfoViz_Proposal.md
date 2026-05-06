# Project Proposal: The Octagon Archetypes
**Visualizing the 30-Year Evolution of Mixed Martial Arts (1993–2026)**

**Course:** Information Visualization (Master's Project)  
**Institution:** TU Wien  

### Team Members
*   Ayush Bhattacharya (12225408)
*   Defin Biju (12551221)
*   Ricardo Gereda (12550976)

---

## 1. Data Understanding
**What data are we investigating?**  
We are investigating a high-dimensional, historical dataset of over 7,000 professional fights from the Ultimate Fighting Championship (UFC), spanning from UFC 1 in 1993 to the events of April 2026. The data contains detailed metadata (fighter physical attributes, reach, stance) and highly granular "micro-stats" for every fight. These micro-stats include significant strikes categorized by anatomical target (Head, Body, Leg), tactical position (Distance, Clinch, Ground), and grappling metrics (Takedowns, Submission Attempts, Control Time).

**What are our questions about the data?**  
1.  **The Evolution of the Meta:** How has the statistical footprint of a "successful" fighter evolved from the era of pure specialists in the 1990s (e.g., pure Jiu-Jitsu vs. pure Boxer) to the hyper-optimized hybrid athletes of 2026?
2.  **Tactical Shifts:** Can we visually map the rise of specific modern tactics, such as the "Calf Kick Meta" or "Dagestani Control Wrestling," using target and position data?
3.  **The Champion's DNA:** Do champions across different weight classes share a convergent statistical "Archetype," regardless of their initial martial arts background?

**Why is this interesting/relevant?**  
Sports analytics provides a rich domain for Information Visualization. Mixed Martial Arts is unique because while the ruleset has remained relatively stable, the human approach to the sport has undergone drastic evolutionary leaps. Visualizing this data allows us to map the literal evolution of a sport's "meta," moving beyond basic win/loss records to uncover the underlying tactical DNA of human combat.

## 2. Data Mining
**Where and how will we find the necessary data?**  
To ensure the highest level of data richness and recency, we are employing a hybrid data mining strategy:
1.  **Historical Foundation (1993–2021):** We will utilize the established "UFC-Fight historical data" Kaggle archive, which provides a highly structured, 140-column baseline of legacy fight statistics.
2.  **Modern Web Scraping (2022–2026):** Because the sport's tactical meta has shifted dramatically in the last five years, relying solely on legacy data is insufficient. We have developed a custom Python scraper (using `BeautifulSoup` and `requests`) to extract the latest micro-stats directly from `ufcstats.com`. This script navigates into individual fight-detail pages to extract live, high-frequency data (e.g., Head vs. Body vs. Leg strike ratios).

## 3. Data Cleaning
**Merging and Handling Uncertain Data:**
*   **Schema Harmonization:** We will merge the live-scraped JSON/CSV data with the legacy Kaggle CSV schema.
*   **Missing Values:** Early UFC events (1993–1999) did not track advanced FightMetric data like "Control Time" or specific strike targets. We will handle this by dynamically filtering visualizations based on the selected era, or by imputing stylistic proxies where statistically viable.
*   **Time Normalization:** To prevent a fighter with a single 15-second knockout from skewing the dataset, we will normalize all absolute strike and takedown volumes to "per 15-minute" (Per/15) rates.

## 4. Feature Engineering
**Which attributes will we extract?**  
To answer our core questions, we will engineer composite "Fighter DNA" features from the raw micro-stats:
*   *Strike Target Ratio:* (Leg Strikes / Total Strikes)
*   *Positional Dominance:* (Ground Strikes + Clinch Strikes) vs. (Distance Strikes)
*   *Grappling Efficiency:* (Control Time / Total Fight Time)

**Unsupervised Clustering:** We will apply clustering algorithms (K-Means or DBSCAN) to these engineered features to group the 4,000+ fighters into distinct, data-driven "Archetypes" (e.g., *The Distance Sniper, The Control Grappler, The Hybrid*).

## 5. Data Exploration (Visual Encoding & Interaction)
**Visual Techniques:**
*   **The Archetype Streamgraph:** A stacked area chart spanning the X-axis of Time (1993–2026). The volume bands will represent our clustered Archetypes, visualizing how pure specialists died out and hybrid styles emerged.
*   **The Great Migration (Dimensionality Reduction):** A 2D scatter plot using t-SNE or UMAP. As the user scrubs a timeline slider, they will see fighter data points migrate from isolated, disparate clusters (1990s) into a dense, centralized "hybrid" cluster (2026).
*   **Fighter DNA Radar Charts & Heatmaps:** Interactive stylistic profiles allowing users to select any two fighters and overlay their normalized anatomical target ratios and positional dominance.

**Tools:**  
Data processing will be conducted in **Python** (`pandas`, `scikit-learn`). The interactive visualizations will be built using **Python visualization libraries** (such as Plotly, Altair, or Bokeh) or **D3.js**, compiled into an interactive dashboard or notebook layout.

## 6. (Optional) Predictive Modeling
**Training & Strategy:**  
We plan to train a Random Forest or XGBoost classification model to predict the winner of a bout based *solely* on the clash of their historical Archetypes. The goal is not just prediction accuracy, but feature importance extraction: we want the model to tell us which specific engineered feature (e.g., Takedown Defense vs. Leg Kick Volume) is statistically the highest predictor of victory in the modern era. We will validate this using a standard 80/20 train-test split, ensuring no data leakage from future events.