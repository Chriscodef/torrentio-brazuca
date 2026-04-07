/**
 * Extract resolution/quality from title
 * Examples: "1080p", "720p", "4k", "BluRay", "HDRip", etc.
 */
export function extractQuality(title) {
  const qualityPatterns = [
    /\b4k\b/i,
    /\b2160p\b/i,
    /\b1080p\b/i,
    /\b720p\b/i,
    /\b480p\b/i,
    /\b360p\b/i,
    /\bBluRay\b/i,
    /\bBRRip\b/i,
    /\bWEB[- ]?DL\b/i,
    /\bWEBRip\b/i,
    /\bHDRip\b/i,
    /\bDVDRip\b/i,
    /\bCam\b/i,
    /\bTeleSync\b/i,
    /\bSCR\b/i,
    /\bHDTV\b/i
  ];

  for (const pattern of qualityPatterns) {
    const match = title.match(pattern);
    if (match) {
      return match[0].toLowerCase();
    }
  }

  return null;
}

/**
 * Extract size from string like "2.5 GB"
 * Returns bytes
 */
export function extractSize(sizeStr) {
  if (!sizeStr) return null;

  const match = sizeStr.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return null;

  const [, value, unit] = match;
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 ** 2,
    'gb': 1024 ** 3,
    'tb': 1024 ** 4
  };

  const multiplier = units[unit.toLowerCase()] || 1;
  return Math.round(parseFloat(value) * multiplier);
}

/**
 * Format bytes to human-readable size
 */
export function formatSize(bytes) {
  if (!bytes) return null;

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size > 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Extract year from title
 * Examples: "Movie 2023", "The Matrix (1999)"
 */
export function extractYear(title) {
  const match = title.match(/[(\s](\d{4})[)\s]/);
  if (match) {
    return parseInt(match[1]);
  }
  return null;
}

/**
 * Extract season and episode from title
 * Examples: "S01E05", "1x05", "Season 1 Episode 5"
 */
export function extractSeasonEpisode(title) {
  // S01E05 format
  let match = title.toUpperCase().match(/S(\d+)E(\d+)/);
  if (match) {
    return {
      season: parseInt(match[1]),
      episode: parseInt(match[2])
    };
  }

  // 1x05 format
  match = title.match(/(\d+)x(\d+)/);
  if (match) {
    return {
      season: parseInt(match[1]),
      episode: parseInt(match[2])
    };
  }

  return null;
}

/**
 * Normalize title by removing common artifact characters
 */
export function normalizeTitle(title) {
  if (!title) return '';

  return title
    .replace(/[^\w\s\-()[\].:]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Extract seeders count from various formats
 */
export function extractSeeders(seedsStr) {
  if (!seedsStr) return 0;

  const match = seedsStr.toString().match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }

  return 0;
}

/**
 * Determine if title is a series based on keywords
 */
export function isSeries(title) {
  const seriesKeywords = [
    /\bS\d+E\d+\b/i,
    /\bSeason\b/i,
    /\bEpisode\b/i,
    /\b\d+x\d+\b/,
    /\bTemporada\b/i,
    /\bEpisódio\b/i
  ];

  return seriesKeywords.some(keyword => keyword.test(title));
}

/**
 * Determine if title is anime
 */
export function isAnime(title) {
  const animeIndicators = [
    /\[SubtítulO\]/i,
    /\[Sub\]/i,
    /\[BD\]/i,
    /\[DVD\]/i,
    /RAW\]/i,
    /720p\]/i
  ];

  return animeIndicators.some(indicator => indicator.test(title));
}

/**
 * Parse a complete torrent title and extract all metadata
 */
export function parseTorrentTitle(title) {
  return {
    title: normalizeTitle(title),
    quality: extractQuality(title),
    year: extractYear(title),
    seEp: extractSeasonEpisode(title),
    isSeries: isSeries(title),
    isAnime: isAnime(title)
  };
}
