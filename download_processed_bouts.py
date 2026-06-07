import urllib.request
import os

def download_processed_bouts():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(project_dir, "data")
    os.makedirs(data_dir, exist_ok=True)

    url = 'https://raw.githubusercontent.com/komaksym/UFC-DataLab/main/data/stats/stats_processed_all_bouts.csv'
    target_path = os.path.join(data_dir, "stats_processed_all_bouts.csv")
    print(f"Downloading UFC-DataLab complete processed bouts dataset (1993 - 2026) from {url}...")
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
        print(f"Downloaded {len(content)} bytes. Saving to {target_path}...")
        with open(target_path, "wb") as target:
            target.write(content)
        print("Done!")
    except Exception as e:
        print(f"Error downloading complete bouts dataset: {e}")

if __name__ == "__main__":
    download_processed_bouts()
