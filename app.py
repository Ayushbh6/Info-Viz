from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np
import os

app = Flask(__name__)

# Disable file caching to prevent browsers from serving stale layouts
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['TEMPLATES_AUTO_RELOAD'] = True

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

def _load_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Data file {filename} not found.")
    return pd.read_csv(path)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/streamgraph')
def get_streamgraph_data():
    try:
        df = _load_csv("ufc_annual_streamgraph_data.csv")
        # Sort chronologically
        df = df.sort_values('year')
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/fighter_years')
def get_fighter_years():
    try:
        df = _load_csv("ufc_fighter_years_evolution.csv")
        # Optional filter by year to allow fast client queries if requested
        yr = request.args.get('year', type=int)
        if yr is not None:
            df = df[df['year'] == yr]
            
        # Select key columns to minimize transfer size
        cols = [
            'fighter', 'year', 'weight_class', 'cumulative_fights',
            'pca_x', 'pca_y', 'archetype', 'win_rate'
        ]
        df_sub = df[cols].copy()
        
        # Replace sub-elements
        df_sub = df_sub.fillna({
            'pca_x': 0.0, 'pca_y': 0.0, 
            'cumulative_fights': 1, 'win_rate': 0.0
        })
        
        return jsonify(df_sub.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/fighter_profiles')
def get_fighter_profiles():
    try:
        df = _load_csv("ufc_fighter_profiles.csv")
        # Minimizing payload size
        cols = [
            'fighter', 'total_fights', 'archetype', 
            'weight_class', 'first_active_year', 'last_active_year'
        ]
        return jsonify(df[cols].to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/compare')
def compare_fighters():
    try:
        f1_name = request.args.get('f1')
        f2_name = request.args.get('f2')

        if not f1_name and not f2_name:
            return jsonify({"error": "At least one fighter name is required."}), 400

        df = _load_csv("ufc_fighter_profiles.csv")

        result = {}

        if f1_name:
            f1_profile = df[df['fighter'].str.upper() == f1_name.upper()]
            if f1_profile.empty:
                result["f1"] = None
            else:
                result["f1"] = f1_profile.iloc[0].to_dict()

        if f2_name:
            f2_profile = df[df['fighter'].str.upper() == f2_name.upper()]
            if f2_profile.empty:
                result["f2"] = None
            else:
                result["f2"] = f2_profile.iloc[0].to_dict()

        for key in result:
            if result[key] is not None:
                for col in result[key]:
                    if pd.isna(result[key][col]):
                        result[key][col] = None

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Start the server on port 5012 to avoid default port collisions
    app.run(host='127.0.0.1', port=5012, debug=True)
