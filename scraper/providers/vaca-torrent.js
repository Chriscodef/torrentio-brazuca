import { BaseScraper } from '../utils/base-scraper.js';
import { logger } from '../utils/logger.js';
import { upsertTorrent } from '../utils/db-helper.js';
import { parseTorrentTitle, extractSize } from '../utils/parser.js';
import cheerio from 'cheerio';

/**
 * VacaTorrent Scraper
 * Website: https://www.vacatorrent.com (placeholder URL)
 */
export class VacaTorrentScraper extends BaseScraper {
  constructor() {
    super('vacatorrent', 'VacaTorrent');
    this.baseUrl = 'https://www.vacatorrent.com';
  }

  async scrapeMovies(page = 1) {
    try {
      const url = `${this.baseUrl}/filmes?page=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];
      $('div.movie, article[data-type="movie"]').each((idx, elem) => {
        try {
          const titleElem = $(elem).find('h3 a, .movie-title').first();
          const title = titleElem.text().trim();

          const seedsElem = $(elem).find('span.seeds, .seed-badge').text();
          const sizeElem = $(elem).find('span.size, .file-size').text();
          const dateElem = $(elem).find('span.date, time').attr('datetime') ||
                          $(elem).find('span.date, .upload-date').text();

          if (title && title.length > 3) {
            const parsed = parseTorrentTitle(title);
            torrents.push({
              title,
              infoHash: this.generateInfoHash(title, dateElem),
              type: 'movie',
              seeders: parseInt(seedsElem.match(/\d+/)?.[0]) || 0,
              size: extractSize(sizeElem),
              uploadDate: this.parseDate(dateElem) || new Date(),
              resolution: parsed.quality,
              languages: 'portuguese'
            });
          }
        } catch (e) {
          logger.warn(`Failed to parse movie from VacaTorrent`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} movies from VacaTorrent page ${page}`);
      return torrents;
    } catch (error) {
      logger.error(`VacaTorrent.scrapeMovies failed`, { error: error.message });
      return [];
    }
  }

  async scrapeSeries(page = 1) {
    try {
      const url = `${this.baseUrl}/series?page=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];
      $('div.serie, article[data-type="series"]').each((idx, elem) => {
        try {
          const titleElem = $(elem).find('h3 a, .series-title').first();
          const title = titleElem.text().trim();

          const seedsElem = $(elem).find('span.seeds, .seed-badge').text();
          const sizeElem = $(elem).find('span.size, .file-size').text();
          const dateElem = $(elem).find('span.date, time').attr('datetime') ||
                          $(elem).find('span.date, .upload-date').text();

          if (title && title.length > 3) {
            const parsed = parseTorrentTitle(title);
            torrents.push({
              title,
              infoHash: this.generateInfoHash(title, dateElem),
              type: parsed.isSeries ? 'series' : 'movie',
              seeders: parseInt(seedsElem.match(/\d+/)?.[0]) || 0,
              size: extractSize(sizeElem),
              uploadDate: this.parseDate(dateElem) || new Date(),
              resolution: parsed.quality,
              languages: 'portuguese'
            });
          }
        } catch (e) {
          logger.warn(`Failed to parse series from VacaTorrent`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} series from VacaTorrent page ${page}`);
      return torrents;
    } catch (error) {
      logger.error(`VacaTorrent.scrapeSeries failed`, { error: error.message });
      return [];
    }
  }

  parseDate(dateStr) {
    if (!dateStr) return null;

    try {
      // Handle ISO timestamps from data attributes
      if (dateStr.match(/\d{4}-\d{2}-\d{2}T/)) {
        return new Date(dateStr);
      }

      // Handle relative dates
      const relativeMatch = dateStr.match(/há\s+(\d+)\s+(horas?|dias?|semanas?|meses?)/i);
      if (relativeMatch) {
        const [, amount, unit] = relativeMatch;
        const date = new Date();
        const num = parseInt(amount);

        if (unit.includes('hora')) date.setHours(date.getHours() - num);
        else if (unit.includes('dia')) date.setDate(date.getDate() - num);
        else if (unit.includes('semana')) date.setDate(date.getDate() - (num * 7));
        else if (unit.includes('mês')) date.setMonth(date.getMonth() - num);

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
