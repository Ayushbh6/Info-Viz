import pandas as pd
import numpy as np
import os
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

def clean_and_process_data():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(project_dir, "data")
    raw_path = os.path.join(data_dir, "stats_processed_all_bouts.csv")
    
    if not os.path.exists(raw_path):
        print(f"Error: Raw data file {raw_path} does not exist!")
        return

    print("Loading raw bouts dataset...")
    df = pd.read_csv(raw_path, sep=';')
    
    # Sort chronologically
    df['event_date_dt'] = pd.to_datetime(df['event_date'], format='%d/%m/%Y')
    df = df.sort_values('event_date_dt').reset_index(drop=True)
    
    # 1. Parse bout times into seconds
    # Standard: round length usually 5 mins (300 sec). Some early might differ but 300 is standard
    def parse_time(time_str):
        if pd.isna(time_str) or not isinstance(time_str, str) or ':' not in time_str:
            return 300 # fallback
        try:
            parts = time_str.split(':')
            return int(parts[0]) * 60 + int(parts[1])
        except:
            return 300

    # Let's extract fighter-bouts (dual rows per fight)
    print("Normalizing bout durations and splitting fighter-bout records...")
    rows = []
    
    for idx, bout in df.iterrows():
        # Calculate fight duration in seconds
        last_round = bout['round']
        last_round_time_sec = parse_time(bout['time'])
        
        # Approximate: total fight duration is (last_round - 1) * 300 + last_round_time
        try:
            total_duration_sec = (float(last_round) - 1.0) * 300.0 + float(last_round_time_sec)
        except:
            total_duration_sec = 900.0 # Standard 3 rounds default
            
        if total_duration_sec <= 0:
            total_duration_sec = 300.0

        # Extract features for Red
        r_ctrl = float(bout['red_fighter_ctrl']) if not pd.isna(bout['red_fighter_ctrl']) else 0.0
        r_kd = float(bout['red_fighter_KD']) if not pd.isna(bout['red_fighter_KD']) else 0.0
        r_sub = float(bout['red_fighter_sub_att']) if not pd.isna(bout['red_fighter_sub_att']) else 0.0
        r_rev = float(bout['red_fighter_rev']) if not pd.isna(bout['red_fighter_rev']) else 0.0
        
        # Build Red record
        rows.append({
            'fight_id': idx,
            'date': bout['event_date_dt'],
            'event': bout['event_name'],
            'weight_class': bout['bout_type'],
            'fighter': bout['red_fighter_name'],
            'opponent': bout['blue_fighter_name'],
            'result': 1.0 if bout['winner'] == 'red' else (0.0 if bout['winner'] == 'blue' else 0.5), # Draw fallback
            'kd': r_kd,
            'sub_att': r_sub,
            'rev': r_rev,
            'ctrl_sec': r_ctrl,
            'ctrl_pct': min(1.0, r_ctrl / total_duration_sec),
            'duration_sec': total_duration_sec,
            'sig_str_pct': float(bout['red_fighter_sig_str_pct']) if not pd.isna(bout['red_fighter_sig_str_pct']) else 0.0,
            'td_pct': float(bout['red_fighter_TD_pct']) if not pd.isna(bout['red_fighter_TD_pct']) else 0.0,
            'head_tar_pct': float(bout['red_fighter_sig_str_head_tar_pct']) if not pd.isna(bout['red_fighter_sig_str_head_tar_pct']) else 0.0,
            'body_tar_pct': float(bout['red_fighter_sig_str_body_tar_pct']) if not pd.isna(bout['red_fighter_sig_str_body_tar_pct']) else 0.0,
            'leg_tar_pct': float(bout['red_fighter_sig_str_leg_tar_pct']) if not pd.isna(bout['red_fighter_sig_str_leg_tar_pct']) else 0.0,
            'dist_pos_pct': float(bout['red_fighter_sig_str_distance_pos_pct']) if not pd.isna(bout['red_fighter_sig_str_distance_pos_pct']) else 0.0,
            'clinch_pos_pct': float(bout['red_fighter_sig_str_clinch_pos_pct']) if not pd.isna(bout['red_fighter_sig_str_clinch_pos_pct']) else 0.0,
            'ground_pos_pct': float(bout['red_fighter_sig_str_ground_pos_pct']) if not pd.isna(bout['red_fighter_sig_str_ground_pos_pct']) else 0.0,
            'height': bout['red_fighter_height'],
            'reach': bout['red_fighter_reach'],
            'stance': bout['red_fighter_stance'],
        })

        # Extract features for Blue
        b_ctrl = float(bout['blue_fighter_ctrl']) if not pd.isna(bout['blue_fighter_ctrl']) else 0.0
        b_kd = float(bout['blue_fighter_KD']) if not pd.isna(bout['blue_fighter_KD']) else 0.0
        b_sub = float(bout['blue_fighter_sub_att']) if not pd.isna(bout['blue_fighter_sub_att']) else 0.0
        b_rev = float(bout['blue_fighter_rev']) if not pd.isna(bout['blue_fighter_rev']) else 0.0
        
        rows.append({
            'fight_id': idx,
            'date': bout['event_date_dt'],
            'event': bout['event_name'],
            'weight_class': bout['bout_type'],
            'fighter': bout['blue_fighter_name'],
            'opponent': bout['red_fighter_name'],
            'result': 1.0 if bout['winner'] == 'blue' else (0.0 if bout['winner'] == 'red' else 0.5),
            'kd': b_kd,
            'sub_att': b_sub,
            'rev': b_rev,
            'ctrl_sec': b_ctrl,
            'ctrl_pct': min(1.0, b_ctrl / total_duration_sec),
            'duration_sec': total_duration_sec,
            'sig_str_pct': float(bout['blue_fighter_sig_str_pct']) if not pd.isna(bout['blue_fighter_sig_str_pct']) else 0.0,
            'td_pct': float(bout['blue_fighter_TD_pct']) if not pd.isna(bout['blue_fighter_TD_pct']) else 0.0,
            'head_tar_pct': float(bout['blue_fighter_sig_str_head_tar_pct']) if not pd.isna(bout['blue_fighter_sig_str_head_tar_pct']) else 0.0,
            'body_tar_pct': float(bout['blue_fighter_sig_str_body_tar_pct']) if not pd.isna(bout['blue_fighter_sig_str_body_tar_pct']) else 0.0,
            'leg_tar_pct': float(bout['blue_fighter_sig_str_leg_tar_pct']) if not pd.isna(bout['blue_fighter_sig_str_leg_tar_pct']) else 0.0,
            'dist_pos_pct': float(bout['blue_fighter_sig_str_distance_pos_pct']) if not pd.isna(bout['blue_fighter_sig_str_distance_pos_pct']) else 0.0,
            'clinch_pos_pct': float(bout['blue_fighter_sig_str_clinch_pos_pct']) if not pd.isna(bout['blue_fighter_sig_str_clinch_pos_pct']) else 0.0,
            'ground_pos_pct': float(bout['blue_fighter_sig_str_ground_pos_pct']) if not pd.isna(bout['blue_fighter_sig_str_ground_pos_pct']) else 0.0,
            'height': bout['blue_fighter_height'],
            'reach': bout['blue_fighter_reach'],
            'stance': bout['blue_fighter_stance'],
        })

    long_df = pd.DataFrame(rows)
    
    # Clean Weight Classes
    print("Normalizing weight classes...")
    def normalize_weight(w_str):
        if pd.isna(w_str) or not isinstance(w_str, str):
            return "Catchweight"
        w_lower = w_str.lower()
        if "women's strawweight" in w_lower: return "Women's Strawweight"
        if "women's flyweight" in w_lower: return "Women's Flyweight"
        if "women's bantamweight" in w_lower: return "Women's Bantamweight"
        if "women's featherweight" in w_lower: return "Women's Featherweight"
        if "strawweight" in w_lower: return "Strawweight"
        if "flyweight" in w_lower: return "Flyweight"
        if "bantamweight" in w_lower: return "Bantamweight"
        if "featherweight" in w_lower: return "Featherweight"
        if "lightweight" in w_lower: return "Lightweight"
        if "welterweight" in w_lower: return "Welterweight"
        if "middleweight" in w_lower: return "Middleweight"
        if "light heavyweight" in w_lower: return "Light Heavyweight"
        if "heavyweight" in w_lower: return "Heavyweight"
        if "catch weight" in w_lower or "catchweight" in w_lower: return "Catchweight"
        if "open weight" in w_lower: return "Open Weight"
        return "Other"
        
    long_df['weight_class_clean'] = long_df['weight_class'].apply(normalize_weight)
    
    # 2. Compute Career-level overall averages of style features for all unique fighters
    # These represent the defining DNA of each fighter's style
    print("Computing career-level style profiles for all fighters...")
    fighter_groups = long_df.groupby('fighter')
    
    fighter_profiles = []
    for name, grp in fighter_groups:
        total_fights = len(grp)
        # Average combat percentages
        fighter_profiles.append({
            'fighter': name,
            'total_fights': total_fights,
            'head_tar_pct': grp['head_tar_pct'].mean(),
            'body_tar_pct': grp['body_tar_pct'].mean(),
            'leg_tar_pct': grp['leg_tar_pct'].mean(),
            'dist_pos_pct': grp['dist_pos_pct'].mean(),
            'clinch_pos_pct': grp['clinch_pos_pct'].mean(),
            'ground_pos_pct': grp['ground_pos_pct'].mean(),
            'ctrl_pct': grp['ctrl_pct'].mean(),
            'kd_avg': grp['kd'].mean(),
            'sub_att_avg': grp['sub_att'].mean(),
            'td_pct': grp['td_pct'].mean(),
            'sig_str_pct': grp['sig_str_pct'].mean(),
            'win_rate': grp['result'].mean(),
            # Keep height/reach (taking first non-null or fallback)
            'height': grp['height'].dropna().iloc[0] if grp['height'].dropna().any() else np.nan,
            'reach': grp['reach'].dropna().iloc[0] if grp['reach'].dropna().any() else np.nan,
            'stance': grp['stance'].dropna().iloc[0] if grp['stance'].dropna().any() else 'Orthodox',
            'weight_class': grp['weight_class_clean'].iloc[-1], # most recent weight class
            'first_active_year': grp['date'].dt.year.min(),
            'last_active_year': grp['date'].dt.year.max(),
        })
        
    f_prof_df = pd.DataFrame(fighter_profiles)
    
    # 3. Handle physical attribute NaNs in fighter profiles (imputation!)
    print("Imputing physical attributes with class-wise medians...")
    # Fill Height and Reach based on weight class medians
    h_medians = f_prof_df.groupby('weight_class')['height'].transform('median')
    r_medians = f_prof_df.groupby('weight_class')['reach'].transform('median')
    f_prof_df['height'] = f_prof_df['height'].fillna(h_medians).fillna(f_prof_df['height'].median())
    f_prof_df['reach'] = f_prof_df['reach'].fillna(r_medians).fillna(f_prof_df['reach'].median())
    
    # 4. Perform K-Means Clustering on Style Profiles
    cluster_features = [
        'head_tar_pct', 'body_tar_pct', 'leg_tar_pct',
        'dist_pos_pct', 'clinch_pos_pct', 'ground_pos_pct',
        'ctrl_pct', 'kd_avg', 'sub_att_avg', 'td_pct'
    ]
    
    print("Normalizing features and running K-Means clustering (K=6)...")
    X = f_prof_df[cluster_features].copy()
    
    # Fill any remaining NaNs in features with 0
    X = X.fillna(0.0)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # We choose K=6 stable custom fighter archetypes
    kmeans = KMeans(n_clusters=6, random_state=42, n_init=10)
    f_prof_df['cluster'] = kmeans.fit_predict(X_scaled)
    
    archetype_mappings = {
        0: "Leg Kick Specialist",
        1: "Ground Controller",
        2: "Ground & Pound Wrestler",
        3: "Clinch Boxer",
        4: "Distance Sniper",
        5: "Legacy / Historical (Limited Stats)"
    }
    
    print("\nBase Archetype Cluster Mappings:", archetype_mappings)
    f_prof_df['archetype'] = f_prof_df['cluster'].map(archetype_mappings)

    # 4b. RULE-BASED OVERRIDE FOR ADVANCED GRAPPLING SPLIT
    # The user requested 3 distinct wrestling/grappling categories.
    # We guarantee "Submission Grappler" is uniquely identified by isolating fighters
    # who average >= 0.80 submission attempts per fight (e.g. Charles Oliveira, Demian Maia).
    f_prof_df.loc[f_prof_df['sub_att_avg'] >= 0.80, 'archetype'] = "Submission Grappler"
    print("Rule-Based Override Applied: 'Submission Grappler' isolated based on Sub Attempts.")
    
    # 5. Run PCA on the 10-dimensional space to reduce to 2D for "The Great Migration" plot
    print("Running PCA to reduce features to 2D coordinates...")
    pca = PCA(n_components=2, random_state=42)
    X_pca = pca.fit_transform(X_scaled)
    f_prof_df['pca_x'] = X_pca[:, 0]
    f_prof_df['pca_y'] = X_pca[:, 1]

    print(f"PCA explained variance ratio: PC1={pca.explained_variance_ratio_[0]:.3f}, PC2={pca.explained_variance_ratio_[1]:.3f}")
    print(f"Total variance captured in 2D projection: {pca.explained_variance_ratio_.sum():.1%}")
    
    # Save the calculated Fighter Profiles (Static coordinates & profiles)
    profiles_output_path = os.path.join(data_dir, "ufc_fighter_profiles.csv")
    f_prof_df.to_csv(profiles_output_path, index=False)
    print(f"Saved {len(f_prof_df)} fighter profiles to {profiles_output_path}")
    
    # 6. Build the Fighter-Year table for the Evolution & Migration Timeline
    print("Building historical fighter-year milestones dataset...")
    # This lists each fighter's cumulative profile active *per year* so we have a chronological timeline
    # We want a record for (fighter, year) with their style profile derived from fights up to that year (cumulative).
    fighter_year_records = []
    
    # Let's map fighter to their static archetype and coordinates
    fighter_archetype_map = f_prof_df.set_index('fighter')['archetype'].to_dict()
    fighter_px_map = f_prof_df.set_index('fighter')['pca_x'].to_dict()
    fighter_py_map = f_prof_df.set_index('fighter')['pca_y'].to_dict()
    fighter_hg_map = f_prof_df.set_index('fighter')['height'].to_dict()
    fighter_rc_map = f_prof_df.set_index('fighter')['reach'].to_dict()
    fighter_st_map = f_prof_df.set_index('fighter')['stance'].to_dict()

    for fighter_name, grp in long_df.groupby('fighter'):
        # For each year this fighter was active
        years = sorted(grp['date'].dt.year.unique())
        
        # Accumulate metrics fight by fight chronologically
        cum_head = 0.0
        cum_body = 0.0
        cum_leg = 0.0
        cum_dist = 0.0
        cum_clinch = 0.0
        cum_ground = 0.0
        cum_ctrl = 0.0
        cum_kd = 0.0
        cum_sub = 0.0
        cum_td_pct = 0.0
        cum_sig_str = 0.0
        cum_wins = 0.0
        n_bouts = 0
        
        # Sort fights by date
        grp_sorted = grp.sort_values('date')
        
        # We index by year. For each year, we capture the performance cumulative state up to the end of that year.
        active_years_data = {}
        for _, bout in grp_sorted.iterrows():
            yr = bout['date'].year
            n_bouts += 1
            cum_head += bout['head_tar_pct']
            cum_body += bout['body_tar_pct']
            cum_leg += bout['leg_tar_pct']
            cum_dist += bout['dist_pos_pct']
            cum_clinch += bout['clinch_pos_pct']
            cum_ground += bout['ground_pos_pct']
            cum_ctrl += bout['ctrl_pct']
            cum_kd += bout['kd']
            cum_sub += bout['sub_att']
            cum_td_pct += bout['td_pct']
            cum_sig_str += bout['sig_str_pct']
            cum_wins += bout['result']
            
            # Save career snapshot for this year (overwrites if multiple fights in same year, which is correct because we want final snapshot of that year)
            active_years_data[yr] = {
                'fighter': fighter_name,
                'year': yr,
                'weight_class': bout['weight_class_clean'],
                'cumulative_fights': n_bouts,
                'head_tar_pct': cum_head / n_bouts,
                'body_tar_pct': cum_body / n_bouts,
                'leg_tar_pct': cum_leg / n_bouts,
                'dist_pos_pct': cum_dist / n_bouts,
                'clinch_pos_pct': cum_clinch / n_bouts,
                'ground_pos_pct': cum_ground / n_bouts,
                'ctrl_pct': cum_ctrl / n_bouts,
                'kd_avg': cum_kd / n_bouts,
                'sub_att_avg': cum_sub / n_bouts,
                'td_pct': cum_td_pct / n_bouts,
                'sig_str_pct': cum_sig_str / n_bouts,
                'win_rate': cum_wins / n_bouts,
                'archetype': fighter_archetype_map[fighter_name],
                'pca_x': fighter_px_map[fighter_name],
                'pca_y': fighter_py_map[fighter_name],
                'height': fighter_hg_map[fighter_name],
                'reach': fighter_rc_map[fighter_name],
                'stance': fighter_st_map[fighter_name],
            }
            
        for yr, yr_data in active_years_data.items():
            fighter_year_records.append(yr_data)
            
    f_yr_df = pd.DataFrame(fighter_year_records)

    # 6b. Recompute PER-YEAR PCA positions so each fighter's dot MIGRATES over their career.
    # We reuse the SAME fitted scaler + PCA from the career-level fit (no re-fit), so the
    # 2D space and the archetype cluster labels stay identical and reproducible. Only the
    # positions evolve: each (fighter, year) row is projected from its *cumulative* style
    # vector up to that year. This is what produces the visible "Great Migration".
    print("Projecting per-year cumulative style vectors into the frozen PCA space...")
    X_yr = f_yr_df[cluster_features].copy().fillna(0.0)
    X_yr_scaled = scaler.transform(X_yr)
    X_yr_pca = pca.transform(X_yr_scaled)
    f_yr_df['pca_x'] = X_yr_pca[:, 0]
    f_yr_df['pca_y'] = X_yr_pca[:, 1]
    print(f"Per-year PCA range: x=[{f_yr_df['pca_x'].min():.2f}, {f_yr_df['pca_x'].max():.2f}], "
          f"y=[{f_yr_df['pca_y'].min():.2f}, {f_yr_df['pca_y'].max():.2f}]")

    # Save the Fighter-Year evolution sequence
    fy_output_path = os.path.join(data_dir, "ufc_fighter_years_evolution.csv")
    f_yr_df.to_csv(fy_output_path, index=False)
    print(f"Saved {len(f_yr_df)} fighter-year snapshots to {fy_output_path}")

    # 7. Precompute the Annual Streamgraph Aggregates
    print("Computing yearly streamgraph archetype distributions...")
    stream_rows = []
    all_years = sorted(f_yr_df['year'].unique())
    # We must explicitly list the 7 archetypes, not just the 6 base mappings
    archetype_list = list(archetype_mappings.values()) + ["Submission Grappler"]
    
    for yr in all_years:
        yr_active = f_yr_df[f_yr_df['year'] == yr]
        total_active_str = len(yr_active)
        
        # Count styles
        counts = yr_active['archetype'].value_counts()
        row = {'year': int(yr), 'total_active': total_active_str}
        for arch in archetype_list:
            # Percentage of style present in that year
            raw_c = counts.get(arch, 0)
            row[arch] = (raw_c / total_active_str) * 100.0 if total_active_str > 0 else 0.0
        stream_rows.append(row)
        
    stream_df = pd.DataFrame(stream_rows)
    stream_output_path = os.path.join(data_dir, "ufc_annual_streamgraph_data.csv")
    stream_df.to_csv(stream_output_path, index=False)
    print(f"Saved annual streamgraph aggregates ({len(stream_df)} years) to {stream_output_path}")
    
    print("\nAll data processing files generated successfully inside data/!")

if __name__ == "__main__":
    clean_and_process_data()