import 'dotenv/config';
import cron from 'node-cron';
import { logger } from './utils/logger.js';
import { initDatabase, closeDatabase } from './utils/db-helper.js';

// Import all scrapers
import { ApacheTorrentScraper } from './providers/apache-torrent.js';
import { BaixaFilmesHDScraper } from './providers/baixa-filmes.js';
import { HDRTorrentScraper } from './providers/hdr-torrent.js';
import { RedeTorrentScraper } from './providers/rede-torrent.js';
import { VacaTorrentScraper } from './providers/vaca-torrent.js';

const SCRAPER_INTERVAL = process.env.SCRAPER_INTERVAL || '0 */6 * * *'; // Every 6 hours by default
const MAX_PAGES = parseInt(process.env.MAX_PAGES) || 5; // Pages to scrape per provider

class ScraperOrchestrator {
  constructor() {
    this.scrapers = [
      new ApacheTorrentScraper(),
      new BaixaFilmesHDScraper(),
      new HDRTorrentScraper(),
      new RedeTorrentScraper(),
      new VacaTorrentScraper()
    ];
    this.isRunning = false;
  }

  async initialize() {
    try {
      logger.info('Initializing ScraperOrchestrator...');
      await initDatabase();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database', { error: error.message });
      throw error;
    }
  }

  async scrapeAllProviders() {
    if (this.isRunning) {
      logger.warn('Scraper already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    logger.info('Starting complete provider scrape...');

    try {
      const results = {
        total: 0,
        providers: {}
      };

      // Scrape movies
      logger.info('Scraping movies from all providers...');
      for (const scraper of this.scrapers) {
        const providerKey = scraper.providerKey;
        let count = 0;

        try {
          for (let page = 1; page <= MAX_PAGES; page++) {
            const movies = await scraper.scrapeMovies(page);
            if (movies.length === 0) {
              logger.info(`No more movies found at page ${page} for ${providerKey}`);
              break;
            }

            await scraper.batchSave(movies);
            count += movies.length;

            // Be nice to the server
            await scraper.delay(1000);
          }

          results.providers[providerKey] = { movies: count };
          results.total += count;
          logger.info(`Completed ${providerKey}: ${count} movies scraped`);
        } catch (error) {
          logger.error(`Failed to scrape ${providerKey}`, { error: error.message });
          results.providers[providerKey] = { error: error.message };
        }
      }

      // Scrape series
      logger.info('Scraping series from all providers...');
      for (const scraper of this.scrapers) {
        const providerKey = scraper.providerKey;
        let count = 0;

        try {
          for (let page = 1; page <= MAX_PAGES; page++) {
            const series = await scraper.scrapeSeries(page);
            if (series.length === 0) {
              logger.info(`No more series found at page ${page} for ${providerKey}`);
              break;
            }

            await scraper.batchSave(series);
            count += series.length;

            // Be nice to the server
            await scraper.delay(1000);
          }

          if (!results.providers[providerKey]) {
            results.providers[providerKey] = {};
          }
          results.providers[providerKey].series = count;
          results.total += count;
          logger.info(`Completed ${providerKey}: ${count} series scraped`);
        } catch (error) {
          logger.error(`Failed to scrape series for ${providerKey}`, { error: error.message });
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      logger.info(`Scraping completed successfully`, {
        results,
        duration: `${duration}s`
      });

      return results;
    } catch (error) {
      logger.error('Scraping failed', { error: error.message });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  startScheduledScraping() {
    logger.info(`Scheduling scraper to run: ${SCRAPER_INTERVAL}`);

    // Run immediately on startup
    setImmediate(() => this.scrapeAllProviders());

    // Schedule recurring scrapes
    cron.schedule(SCRAPER_INTERVAL, () => {
      logger.info('Cron job triggered: starting scheduled scrape');
      this.scrapeAllProviders().catch(error => {
        logger.error('Scheduled scrape failed', { error: error.message });
      });
    });

    logger.info('Scheduled scraping started');
  }

  async shutdown() {
    logger.info('Shutting down...');
    try {
      await closeDatabase();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }
}

// Export orchestrator for use in other files
export const orchestrator = new ScraperOrchestrator();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  orchestrator.shutdown();
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  orchestrator.shutdown();
});

// Main execution
async function main() {
  try {
    await orchestrator.initialize();
    orchestrator.startScheduledScraping();

    logger.info('ScraperOrchestrator is running');
    logger.info(`Environment: NODE_ENV=${process.env.NODE_ENV || 'development'}`);
    logger.info(`Max pages per provider: ${MAX_PAGES}`);
    logger.info(`Interval: ${SCRAPER_INTERVAL}`);
  } catch (error) {
    logger.error('Failed to start orchestrator', { error: error.message });
    await orchestrator.shutdown();
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
