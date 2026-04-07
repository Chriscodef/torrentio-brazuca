import { BaseScraper } from '../utils/base-scraper.js';
import { logger } from '../utils/logger.js';
import { upsertTorrent } from '../utils/db-helper.js';
import { parseTorrentTitle, extractSize } from '../utils/parser.js';
import cheerio from 'cheerio';

/**
 * RedeTorrent Scraper
 * Website: https://www.rede-torrent.org (placeholder URL)
 */
export class RedeTorrentScraper extends BaseScraper {
  constructor() {
    super('redetorrent', 'RedeTorrent');
    this.baseUrl = 'https://www.rede-torrent.org';
  }

  async scrapeMovies(page = 1) {
    try {
      const url = `${this.baseUrl}/index.php?order=categoria&cat=1&page=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];
      $('div.torr, table tr[class*="hl"]').each((idx, elem) => {
        try {
          let title = '';
          let seeders = 0;
          let size = 0;
          let dateStr = '';

          // Try different selectors
          const titleElem = $(elem).find('a[href*="torrent"]').first();
          title = titleElem.text().trim() || $(elem).find('td:nth-child(1) a').text().trim();

          const seedsText = $(elem).find('div:contains("Seed")').text() || $(elem).find('td:nth-child(8)').text();
          seeders = parseInt(seedsText.match(/\d+/)?.[0]) || 0;

          const sizeText = $(elem).find('div:contains("Tamanho")').text() || $(elem).find('td:nth-child(7)').text();
          size = extractSize(sizeText);

          dateStr = $(elem).find('div:contains("Adicionado")').text() || $(elem).find('td:nth-child(6)').text();

          if (title && typeof title === 'string' && title.length > 3) {
            const parsed = parseTorrentTitle(title);
            torrents.push({
              title,
              infoHash: this.generateInfoHash(title, dateStr),
              type: 'movie',
              seeders,
              size,
              uploadDate: this.parseDate(dateStr) || new Date(),
              resolution: parsed.quality,
              languages: 'portuguese'
            });
          }
        } catch (e) {
          logger.warn(`Failed to parse torrent from RedeTorrent`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} movies from RedeTorrent page ${page}`);
      return torrents;
    } catch (error) {
      logger.error(`RedeTorrent.scrapeMovies failed`, { error: error.message });
      return [];
    }
  }

  async scrapeSeries(page = 1) {
    try {
      const url = `${this.baseUrl}/index.php?order=categoria&cat=2&page=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];
      $('div.torr, table tr[class*="hl"]').each((idx, elem) => {
        try {
          const titleElem = $(elem).find('a[href*="torrent"]').first();
          const title = titleElem.text().trim() || $(elem).find('td:nth-child(1) a').text().trim();

          if (title && typeof title === 'string' && title.length > 3) {
            const seedsText = $(elem).find('div:contains("Seed")').text() || $(elem).find('td:nth-child(8)').text();
            const sizeText = $(elem).find('div:contains("Tamanho")').text() || $(elem).find('td:nth-child(7)').text();
            const dateStr = $(elem).find('div:contains("Adicionado")').text() || $(elem).find('td:nth-child(6)').text();

            const parsed = parseTorrentTitle(title);
            torrents.push({
              title,
              infoHash: this.generateInfoHash(title, dateStr),
              type: parsed.isSeries ? 'series' : 'movie',
              seeders: parseInt(seedsText.match(/\d+/)?.[0]) || 0,
              size: extractSize(sizeText),
              uploadDate: this.parseDate(dateStr) || new Date(),
              resolution: parsed.quality,
              languages: 'portuguese'
            });
          }
        } catch (e) {
          logger.warn(`Failed to parse series from RedeTorrent`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} series from RedeTorrent page ${page}`);
      return torrents;
    } catch (error) {
      logger.error(`RedeTorrent.scrapeSeries failed`, { error: error.message });
      return [];
    }
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      if (dateStr.includes('hoje')) {
        return new Date();
      }
      if (dateStr.includes('ontem')) {
        const date = new Date();
        date.setDate(date.getDate() - 1);
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
