import axios from 'axios';
import { logger } from './logger.js';
import crypto from 'crypto';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

export class BaseScraper {
  constructor(providerKey, providerName) {
    this.providerKey = providerKey;
    this.providerName = providerName;
    this.baseUrl = '';
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  async fetchPage(url, retries = 0) {
    try {
      logger.info(`Fetching: ${url} (${this.providerName})`, { provider: this.providerKey });

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      if (retries < this.maxRetries) {
        logger.warn(`Retry ${retries + 1}/${this.maxRetries} for ${url}`, {
          provider: this.providerKey,
          error: error.message
        });
        await this.delay(this.retryDelay);
        return this.fetchPage(url, retries + 1);
      }
      logger.error(`Failed to fetch ${url}`, {
        provider: this.providerKey,
        error: error.message
      });
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateInfoHash(title, date) {
    return crypto
      .createHash('sha1')
      .update(`${this.providerKey}:${title}:${date}`)
      .digest('hex');
  }

  /**
   * Parse a torrent title to extract metadata
   * Override in subclasses if needed
   */
  parseTorrentTitle(title) {
    const match = title.match(/(\d{4})/);
    const year = match ? match[1] : null;

    // Regex patterns for common resolutions/formats
    const resolutions = ['4k', '1080p', '720p', '480p'];
    let resolution = null;
    resolutions.forEach(res => {
      if (title.toLowerCase().includes(res)) {
        resolution = res;
      }
    });

    return {
      year,
      resolution,
      title: title.trim()
    };
  }

  /**
   * Extract size from string like "2.5 GB" -> bytes
   */
  extractSize(sizeStr) {
    if (!sizeStr) return null;

    const match = sizeStr.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
    if (!match) return null;

    const [, value, unit] = match;
    const units = { 'b': 1, 'kb': 1024, 'mb': 1024 ** 2, 'gb': 1024 ** 3, 'tb': 1024 ** 4 };
    return Math.round(parseFloat(value) * (units[unit.toLowerCase()] || 1));
  }

  /**
   * Should be implemented by subclasses
   */
  async scrapeMovies() {
    throw new Error('scrapeMovies() must be implemented');
  }

  async scrapeSeries() {
    throw new Error('scrapeSeries() must be implemented');
  }

  /**
   * Normalize torrent data to standard format
   */
  normalizeTorrent(torrentData) {
    return {
      infoHash: torrentData.infoHash || this.generateInfoHash(torrentData.title, torrentData.uploadDate),
      provider: this.providerKey,
      torrentId: torrentData.torrentId || null,
      title: torrentData.title,
      size: torrentData.size,
      type: torrentData.type || 'movie',
      uploadDate: torrentData.uploadDate || new Date(),
      seeders: torrentData.seeders || 0,
      trackers: torrentData.trackers || null,
      languages: torrentData.languages || 'portuguese',
      resolution: torrentData.resolution || null
    };
  }
}
