import { BaseScraper } from '../utils/base-scraper.js';
import { logger } from '../utils/logger.js';
import { upsertTorrent } from '../utils/db-helper.js';
import { parseTorrentTitle, extractSize } from '../utils/parser.js';
import cheerio from 'cheerio';

/**
 * BaixaFilmesTorrentHD Scraper
 * Website: https://baixafilmes.net (placeholder URL)
 */
export class BaixaFilmesHDScraper extends BaseScraper {
  constructor() {
    super('baixafilmeshd', 'BaixaFilmesTorrentHD');
    this.baseUrl = 'https://baixafilmes.net';
  }

  async scrapeMovies(page = 1) {
    try {
      const url = `${this.baseUrl}/filmes?p=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];
      $('div.filmes-lista, article.filme').each((idx, elem) => {
        try {
          const titleElem = $(elem).find('h2, a.titulo').first();
          const title = titleElem.text().trim();
          const seedsElem = $(elem).find('span.seeds, .seed-count').text();
          const sizeElem = $(elem).find('span.size, .tamanho').text();
          const dateElem = $(elem).find('span.data, .data-upload').text();

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
          logger.warn(`Failed to parse movie`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} movies from BaixaFilmesHD page ${page}`);
      return torrents;
    } catch (error) {
      logger.error(`BaixaFilmesHD.scrapeMovies failed`, { error: error.message });
      return [];
    }
  }

  async scrapeSeries(page = 1) {
    try {
      const url = `${this.baseUrl}/series?p=${page}`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const torrents = [];
      $('div.series-lista, article.serie').each((idx, elem) => {
        try {
          const titleElem = $(elem).find('h2, a.titulo').first();
          const title = titleElem.text().trim();
          const seedsElem = $(elem).find('span.seeds, .seed-count').text();
          const sizeElem = $(elem).find('span.size, .tamanho').text();
          const dateElem = $(elem).find('span.data, .data-upload').text();

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
          logger.warn(`Failed to parse series`, { error: e.message });
        }
      });

      logger.info(`Scraped ${torrents.length} series from BaixaFilmesHD page ${page}`);
      return torrents;
    } catch (error) {
      logger.error(`BaixaFilmesHD.scrapeSeries failed`, { error: error.message });
      return [];
    }
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      const daysAgo = dateStr.match(/(\d+)\s*dias?\s*atrás/i);
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
