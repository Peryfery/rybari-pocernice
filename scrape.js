name: ČRS Web Synchronizace

on:
  schedule:
    - cron: '0 3 * * 0' # Spustí se každou neděli přesně ve 03:00 ráno
  workflow_dispatch: # Umožní ti spustit stahování kdykoliv ručně kliknutím na tlačítko v GitHubu

# Vynucení spuštění všech interních JavaScriptových akcí pod Node.js 24
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

jobs:
  scrape-and-save:
    runs-on: ubuntu-latest
    steps:
      - name: Načtení kódu z repozitáře
        uses: actions/checkout@v4

      - name: Nastavení prostředí Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24' # Aktualizováno z verze 20 na verzi 24

      - name: Instalace potřebných knihoven pro robota
        run: |
          npm init -y
          npm install axios cheerio @supabase/supabase-js

      - name: Spuštění stahovacího skriptu
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: node scrape.js
