import { BaseScraper } from '../utils/base-scraper.js';
import { logger } from '../utils/logger.js';
import { upsertTorrent } from '../utils/db-helper.js';
import { parseTorrentTitle, extractSize } from '../utils/parser.js';
import cheerio from 'cheerio';

/**
 * HDRTorrent Scraper
 * Website: https://hdtorrent.com.br (placeholder URL)
 */
export class HDRTorrentScraper extends BaseScraper {
  constructor() {
    super('hdrtorrent', 'HDRTorrent');
    this.baseUrl = 'https://hdtorrent.com.br';
  }

  async scrapeMovies(page = 1) {
    try {
      const url = `${this.baseUrl}/browse?c=2:1&p=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];
      $('tr.forum_header_border, div.torrent-row').each((idx, elem) => {
        try {
          // Typical format in torrent sites: title in first column/link
          const titleElem = $(elem).find('td:first a, a.torrent-title').first();
          const title = titleElem.text().trim();
          const seedsElem = $(elem).find('td:nth-child(9), .seeds').text(); // Typical position
          const sizeElem = $(elem).find('td:nth-child(8), .size').text();
          const dateElem = $(elem).find('td:nth-child(5), .date').text();

          if (title && title.length > 3) {
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
          logger.warn(`Failed to parse torrent`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} torrents from HDRTorrent page ${page}`);
      return torrents;
    } catch (error) {
      logger.error(`HDRTorrent.scrapeMovies failed`, { error: error.message });
      return [];
    }
  }

  async scrapeSeries(page = 1) {
    try {
      const url = `${this.baseUrl}/browse?c=2:2&p=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];
      $('tr.forum_header_border, div.torrent-row').each((idx, elem) => {
        try {
          const titleElem = $(elem).find('td:first a, a.torrent-title').first();
          const title = titleElem.text().trim();
          const seedsElem = $(elem).find('td:nth-child(9), .seeds').text();
          const sizeElem = $(elem).find('td:nth-child(8), .size').text();
          const dateElem = $(elem).find('td:nth-child(5), .date').text();

          if (title && title.length > 3) {
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
          logger.warn(`Failed to parse series torrent`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} series from HDRTorrent page ${page}`);
      return torrents;
    } catch (error) {
      logger.error(`HDRTorrent.scrapeSeries failed`, { error: error.message });
      return [];
    }
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
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
