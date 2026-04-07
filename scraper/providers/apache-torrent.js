import { BaseScraper } from '../utils/base-scraper.js';
import { logger } from '../utils/logger.js';
import { upsertTorrent } from '../utils/db-helper.js';
import { parseTorrentTitle, extractSize } from '../utils/parser.js';
import cheerio from 'cheerio';

/**
 * ApacheTorrent Scraper
 * Website: https://apachetorrent.com (placeholder URL)
 */
export class ApacheTorrentScraper extends BaseScraper {
  constructor() {
    super('apachetorrent', 'ApacheTorrent');
    this.baseUrl = 'https://apachetorrent.com';
  }

  async scrapeMovies(page = 1) {
    try {
      const url = `${this.baseUrl}/filmes?page=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];
      $('div.torrent-item, tr.movie-row').each((idx, elem) => {
        try {
          const titleElem = $(elem).find('a.title, .movie-title').first();
          const title = titleElem.text().trim();
          const seedsElem = $(elem).find('.seeds, .seeders').text();
          const sizeElem = $(elem).find('.size, .file-size').text();
          const dateElem = $(elem).find('.date, .upload-date').text();

          if (title) {
            const parsed = parseTorrentTitle(title);
            torrents.push({
              title,
              infoHash: this.generateInfoHash(title, dateElem),
              type: 'movie',
              seeders: parseInt(seedsElem) || 0,
              size: extractSize(sizeElem),
              uploadDate: this.parseDate(dateElem) || new Date(),
              resolution: parsed.quality,
              languages: 'portuguese'
            });
          }
        } catch (e) {
          logger.warn(`Failed to parse movie item`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} movies from ApacheTorrent page ${page}`);
      return torrents;
    } catch (error) {
      logger.error(`ApacheTorrent.scrapeMovies failed`, { error: error.message });
      return [];
    }
  }

  async scrapeSeries(page = 1) {
    try {
      const url = `${this.baseUrl}/series?page=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];
      $('div.torrent-item, tr.series-row').each((idx, elem) => {
        try {
          const titleElem = $(elem).find('a.title, .series-title').first();
          const title = titleElem.text().trim();
          const seedsElem = $(elem).find('.seeds, .seeders').text();
          const sizeElem = $(elem).find('.size, .file-size').text();
          const dateElem = $(elem).find('.date, .upload-date').text();

          if (title) {
            const parsed = parseTorrentTitle(title);
            torrents.push({
              title,
              infoHash: this.generateInfoHash(title, dateElem),
              type: parsed.isSeries ? 'series' : 'movie',
              seeders: parseInt(seedsElem) || 0,
              size: extractSize(sizeElem),
              uploadDate: this.parseDate(dateElem) || new Date(),
              resolution: parsed.quality,
              languages: 'portuguese'
            });
          }
        } catch (e) {
          logger.warn(`Failed to parse series item`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} series from ApacheTorrent page ${page}`);
      return torrents;
    } catch (error) {
      logger.error(`ApacheTorrent.scrapeSeries failed`, { error: error.message });
      return [];
    }
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      // Handle various date formats: "2 days ago", "Jan 15, 2024", etc.
      const daysAgo = dateStr.match(/(\d+)\s*days?\s*ago/i);
      if (daysAgo) {
        const date = new Date();
        date.setDate(date.getDate() - parseInt(daysAgo[1]));
        return date;
      }

      return new Date(dateStr);
    } catch {
      return null;
    }
  }

  async batchSave(torrents) {
    for (const torrent of torrents) {
      try {
        const normalized = this.normalizeTorrent(torrent);
        await upsertTorrent(normalized);
      } catch (e) {
        logger.error(`Failed to save torrent`, { title: torrent.title, error: e.message });
      }
    }
  }
}
