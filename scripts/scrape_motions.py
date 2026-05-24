import requests
from bs4 import BeautifulSoup
import json
import time

BASE = 'https://motions.info'
motions = []

print("Starting scrape of motions.info...")

for page in range(1, 50):
    try:
        res = requests.get(f'{BASE}/motions?page={page}')
        soup = BeautifulSoup(res.text, 'html.parser')
        rows = soup.select('table tr')

        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 3:
                motions.append({
                    'text': cells[0].text.strip(),
                    'tournament': cells[1].text.strip(),
                    'year': cells[2].text.strip(),
                })
        print(f"Scraped page {page}")
        time.sleep(1)  # be polite to the server
    except Exception as e:
        print(f"Error scraping page {page}: {e}")

with open('motions_raw.json', 'w') as f:
    json.dump(motions, f, indent=2)

print(f'Done. Scraped {len(motions)} motions into motions_raw.json')
