#!/usr/bin/env node

/**
 * Manual scraping script
 * Uso: node scrape.js [provider] [type] [pages]
 *
 * Examples:
 *   node scrape.js                    # Scrape all providers
 *   node scrape.js apachetorrent      # Scrape only ApacheTorrent
 *   node scrape.js apachetorrent movies 10  # Movies only, 10 pages
 */

import 'dotenv/config';
import { logger } from './utils/logger.js';
import { initDatabase, closeDatabase } from './utils/db-helper.js';
import { ApacheTorrentScraper } from './providers/apache-torrent.js';
import { BaixaFilmesHDScraper } from './providers/baixa-filmes.js';
import { HDRTorrentScraper } from './providers/hdr-torrent.js';
import { RedeTorrentScraper } from './providers/rede-torrent.js';
import { VacaTorrentScraper } from './providers/vaca-torrent.js';

const SCRAPERS = {
  apachetorrent: new ApacheTorrentScraper(),
  baixafilmeshd: new BaixaFilmesHDScraper(),
  hdrtorrent: new HDRTorrentScraper(),
  redetorrent: new RedeTorrentScraper(),
  vacatorrent: new VacaTorrentScraper()
};

async function main() {
  const args = process.argv.slice(2);
  const [providerKey, type, pagesStr] = args;

  const maxPages = parseInt(pagesStr) || 3;
  const types = type ? [type] : ['movies', 'series'];
  const providers = providerKey ? [SCRAPERS[providerKey]] : Object.values(SCRAPERS);

  if (!providers[0]) {
    console.error(`Provider not found: ${providerKey}`);
    console.error(`Available: ${Object.keys(SCRAPERS).join(', ')}`);
    process.exit(1);
  }

  try {
    await initDatabase();
    logger.info(`Starting manual scrape...`);
    logger.info(`Providers: ${providers.map(p => p.providerKey).join(', ')}`);
    logger.info(`Types: ${types.join(', ')}`);
    logger.info(`Max pages: ${maxPages}`);

    let totalScraped = 0;

    for (const scraper of providers) {
      logger.info(`\n=== ${scraper.providerName} ===`);

      if (types.includes('movies')) {
        logger.info('Scraping movies...');
        for (let page = 1; page <= maxPages; page++) {
          const movies = await scraper.scrapeMovies(page);
          if (movies.length === 0) {
            logger.info(`No more movies at page ${page}`);
            break;
          }

          await scraper.batchSave(movies);
          totalScraped += movies.length;
          logger.info(`Page ${page}: ${movies.length} movies saved (total: ${totalScraped})`);
          await scraper.delay(500);
        }
      }

      if (types.includes('series')) {
        logger.info('Scraping series...');
        for (let page = 1; page <= maxPages; page++) {
          const series = await scraper.scrapeSeries(page);
          if (series.length === 0) {
            logger.info(`No more series at page ${page}`);
            break;
          }

          await scraper.batchSave(series);
          totalScraped += series.length;
          logger.info(`Page ${page}: ${series.length} series saved (total: ${totalScraped})`);
          await scraper.delay(500);
        }
      }
    }

    logger.info(`\n✓ Scraping complete! Total: ${totalScraped} torrents`);

  } catch (error) {
    logger.error('Scraping failed', { error: error.message });
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
