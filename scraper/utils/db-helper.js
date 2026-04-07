import { Sequelize } from 'sequelize';
import { logger } from './logger.js';

const DATABASE_URI = process.env.DATABASE_URI || 'postgresql://torrentio:password@localhost:5432/torrentio';
const database = new Sequelize(DATABASE_URI, {
  logging: (sql) => logger.debug(sql),
  pool: { max: 10, min: 2, idle: 10 * 60 * 1000 }
});

// Import models from addon
const Torrent = database.define('torrent', {
  infoHash: { type: Sequelize.STRING(64), primaryKey: true },
  provider: { type: Sequelize.STRING(32), allowNull: false },
  torrentId: { type: Sequelize.STRING(128) },
  title: { type: Sequelize.STRING(256), allowNull: false },
  size: { type: Sequelize.BIGINT },
  type: { type: Sequelize.STRING(16), allowNull: false },
  uploadDate: { type: Sequelize.DATE, allowNull: false },
  seeders: { type: Sequelize.SMALLINT },
  trackers: { type: Sequelize.STRING(4096) },
  languages: { type: Sequelize.STRING(4096) },
  resolution: { type: Sequelize.STRING(16) }
});

const File = database.define('file', {
  id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
  infoHash: {
    type: Sequelize.STRING(64),
    allowNull: false,
    references: { model: Torrent, key: 'infoHash' },
    onDelete: 'CASCADE'
  },
  fileIndex: { type: Sequelize.INTEGER },
  title: { type: Sequelize.STRING(256), allowNull: false },
  size: { type: Sequelize.BIGINT },
  imdbId: { type: Sequelize.STRING(32) },
  imdbSeason: { type: Sequelize.INTEGER },
  imdbEpisode: { type: Sequelize.INTEGER },
  kitsuId: { type: Sequelize.INTEGER },
  kitsuEpisode: { type: Sequelize.INTEGER }
});

/**
 * Create or update a torrent in the database
 */
export async function upsertTorrent(torrentData) {
  try {
    const [torrent, created] = await Torrent.findOrCreate({
      where: { infoHash: torrentData.infoHash },
      defaults: torrentData
    });

    if (!created) {
      // Update if it already exists (e.g., update seeders)
      await torrent.update(torrentData);
    }

    logger.info(`Torrent ${created ? 'created' : 'updated'}: ${torrentData.title}`, {
      provider: torrentData.provider,
      infoHash: torrentData.infoHash
    });

    return torrent;
  } catch (error) {
    logger.error(`Failed to upsert torrent`, {
      title: torrentData.title,
      error: error.message
    });
    throw error;
  }
}

/**
 * Create or update a file association
 */
export async function upsertFile(fileData) {
  try {
    const file = await File.findOrCreate({
      where: {
        infoHash: fileData.infoHash,
        fileIndex: fileData.fileIndex || 0
      },
      defaults: fileData
    });

    logger.info(`File associated: ${fileData.title}`, {
      infoHash: fileData.infoHash
    });

    return file;
  } catch (error) {
    logger.error(`Failed to upsert file`, {
      title: fileData.title,
      error: error.message
    });
    throw error;
  }
}

/**
 * Bulk upsert multiple torrents
 */
export async function bulkUpsertTorrents(torrents) {
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const torrent of torrents) {
    try {
      const existing = await Torrent.findByPk(torrent.infoHash);
      if (existing) {
        await existing.update(torrent);
        updated++;
      } else {
        await Torrent.create(torrent);
        created++;
      }
    } catch (error) {
      failed++;
      logger.error(`Failed to process torrent: ${torrent.title}`, { error: error.message });
    }
  }

  logger.info(`Bulk upsert completed`, { created, updated, failed, total: torrents.length });
  return { created, updated, failed };
}

/**
 * Update seeders for a torrent
 */
export async function updateTorrentSeeders(infoHash, seeders) {
  try {
    const [updated] = await Torrent.update(
      { seeders, updatedAt: new Date() },
      { where: { infoHash } }
    );
    return updated > 0;
  } catch (error) {
    logger.error(`Failed to update seeders`, { infoHash, error: error.message });
    throw error;
  }
}

/**
 * Get torrent by infoHash
 */
export async function getTorrent(infoHash) {
  try {
    return await Torrent.findOne({ where: { infoHash } });
  } catch (error) {
    logger.error(`Failed to get torrent`, { infoHash, error: error.message });
    throw error;
  }
}

/**
 * Get torrents by provider
 */
export async function getTorrentsByProvider(provider, limit = 100) {
  try {
    return await Torrent.findAll({
      where: { provider },
      limit,
      order: [['uploadDate', 'DESC']]
    });
  } catch (error) {
    logger.error(`Failed to get torrents by provider`, { provider, error: error.message });
    throw error;
  }
}

/**
 * Initialize database connection
 */
export async function initDatabase() {
  try {
    await database.authenticate();
    logger.info('Database connection established');

    await database.sync({ alter: true });
    logger.info('Database models synchronized');

    return database;
  } catch (error) {
    logger.error('Failed to initialize database', { error: error.message });
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  try {
    await database.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Failed to close database', { error: error.message });
    throw error;
  }
}

export { Torrent, File };
