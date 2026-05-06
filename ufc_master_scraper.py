import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import re
import os

class UFCMasterScraper:
    def __init__(self, base_url="http://ufcstats.com/statistics/events/completed?page=all"):
        self.base_url = base_url
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    def parse_stat_ratio(self, stat_str):
        """Splits '10 of 20' into (10, 20) integers."""
        parts = stat_str.split('of')
        if len(parts) == 2:
            return parts[0].strip(), parts[1].strip()
        return "0", "0"

    def get_event_links(self, limit=None):
        """Fetches links to all completed events."""
        print(f"Fetching event list...")
        response = requests.get(self.base_url, headers=self.headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        events = []
        
        rows = soup.find_all('tr', class_='b-statistics__table-row')
        for row in rows:
            link_tag = row.find('a', class_='b-link b-link_style_black')
            if not link_tag: continue
            
            events.append({
                'name': link_tag.text.strip(),
                'url': link_tag['href'],
                'date': row.find('span', class_='b-statistics__date').text.strip()
            })
            if limit and len(events) >= limit: break
            
        return events

    def get_fight_urls_from_event(self, event_url):
        """Extracts individual fight URLs from an event page."""
        response = requests.get(event_url, headers=self.headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        fight_links = []
        
        rows = soup.find_all('tr', class_='b-fight-details__table-row')
        for row in rows:
            if row.has_attr('data-link'):
                fight_links.append(row['data-link'])
        return fight_links

    def scrape_fight_details(self, fight_url):
        """Deep scrapes micro-stats for a single fight."""
        response = requests.get(fight_url, headers=self.headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Metadata
        event_name = soup.find('h2', class_='b-content__title').text.strip()
        fighters = soup.find_all('div', class_='b-fight-details__person')
        f1_name = fighters[0].find('h3').text.strip()
        f2_name = fighters[1].find('h3').text.strip()
        f1_status = fighters[0].find('i', class_='b-fight-details__person-status').text.strip()
        
        details_section = soup.find('div', class_='b-fight-details__content')
        def get_detail(label):
            tag = details_section.find('i', string=lambda s: s and label in s) or \
                  details_section.find('i', class_='b-fight-details__label', string=lambda s: s and label in s)
            return tag.parent.get_text(strip=True).replace(label, '').strip() if tag else "N/A"

        data = {
            'fight_url': fight_url,
            'event': event_name,
            'f1_red': f1_name,
            'f2_blue': f2_name,
            'winner': f1_name if f1_status == 'W' else f2_name,
            'method': get_detail("Method:"),
            'round': get_detail("Round:"),
            'time': get_detail("Time:")
        }

        # Tables (Totals and Sig Strikes)
        tables = soup.find_all('table')
        for table in tables:
            header = table.text.lower()
            rows = table.find_all('tr', class_='b-fight-details__table-row')
            if len(rows) < 2: continue
            cols = rows[1].find_all('td')

            if 'kd' in header and 'td' in header: # Totals Table
                f1_td = cols[5].find_all('p')[0].text.strip()
                f2_td = cols[5].find_all('p')[1].text.strip()
                data['f1_td_l'], data['f1_td_a'] = self.parse_stat_ratio(f1_td)
                data['f2_td_l'], data['f2_td_a'] = self.parse_stat_ratio(f2_td)
                data['f1_ctrl'] = cols[9].find_all('p')[0].text.strip()
                data['f2_ctrl'] = cols[9].find_all('p')[1].text.strip()

            if 'head' in header and 'leg' in header: # Sig Strikes Table
                def get_rb(idx):
                    ps = cols[idx].find_all('p')
                    return ps[0].text.strip(), ps[1].text.strip()

                for idx, part in enumerate(['head', 'body', 'leg', 'dist', 'clinch', 'ground'], 3):
                    f1_s, f2_s = get_rb(idx)
                    data[f'f1_{part}_l'], data[f'f1_{part}_a'] = self.parse_stat_ratio(f1_s)
                    data[f'f2_{part}_l'], data[f'f2_{part}_a'] = self.parse_stat_ratio(f2_s)

        return data

if __name__ == "__main__":
    scraper = UFCMasterScraper()
    # Sample run: 1 event, all its fights
    events = scraper.get_event_links(limit=1)
    all_data = []
    
    for event in events:
        print(f"Scraping Event: {event['name']}")
        fights = scraper.get_fight_urls_from_event(event['url'])
        for f_url in fights:
            try:
                all_data.append(scraper.scrape_fight_details(f_url))
                time.sleep(1) # Be polite to ufcstats.com
            except Exception as e:
                print(f"Error on {f_url}: {e}")

    df = pd.DataFrame(all_data)
    df.to_csv("ufc_scraped_data_master.csv", index=False)
    print(f"\nDone! Saved {len(all_data)} fights to ufc_scraped_data_master.csv")
