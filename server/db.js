const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'leaderboard.json');
const REPLAYS_DIR = path.join(__dirname, 'replays');

let pool = null;
let usePostgres = false;

// ============ INITIALIZATION ============

async function initialize() {
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });

      // Test the connection
      await pool.query('SELECT 1');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS scores (
          id SERIAL PRIMARY KEY,
          game_type VARCHAR(20) NOT NULL,
          uuid VARCHAR(36) NOT NULL,
          nickname VARCHAR(20) NOT NULL,
          score INTEGER NOT NULL,
          stats JSONB DEFAULT '{}',
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (game_type, uuid)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS replays (
          id VARCHAR(255) PRIMARY KEY,
          game_type VARCHAR(20) NOT NULL,
          user_id VARCHAR(36),
          nickname VARCHAR(20),
          score INTEGER,
          duration REAL,
          frames JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      usePostgres = true;
      console.log('Database: PostgreSQL connected');
    } catch (err) {
      console.error('PostgreSQL connection failed, falling back to JSON:', err.message);
      pool = null;
      usePostgres = false;
    }
  }

  if (!usePostgres) {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({}));
    }
    if (!fs.existsSync(REPLAYS_DIR)) {
      fs.mkdirSync(REPLAYS_DIR, { recursive: true });
    }
    console.log('Database: JSON file backend');
  }
}

// ============ JSON HELPERS ============

function readJSON() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading data:', err);
    return {};
  }
}

function writeJSON(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing data:', err);
    return false;
  }
}

// ============ SCORE FUNCTIONS ============

async function getLeaderboard(gameType) {
  if (usePostgres) {
    const { rows } = await pool.query(
      `SELECT uuid, nickname, score, stats, verified, created_at as date
       FROM scores WHERE game_type = $1
       ORDER BY score DESC LIMIT 10`,
      [gameType]
    );
    return rows;
  }
  const data = readJSON();
  return (data[gameType] || []).sort((a, b) => b.score - a.score).slice(0, 10);
}

async function getAllLeaderboards() {
  if (usePostgres) {
    const { rows } = await pool.query(
      `SELECT game_type, uuid, nickname, score, stats, verified, created_at as date
       FROM scores ORDER BY game_type, score DESC`
    );
    const result = {};
    for (const row of rows) {
      if (!result[row.game_type]) result[row.game_type] = [];
      if (result[row.game_type].length < 10) {
        const { game_type, ...entry } = row;
        result[row.game_type].push(entry);
      }
    }
    return result;
  }
  return readJSON();
}

async function upsertScore(gameType, entry) {
  if (usePostgres) {
    await pool.query(
      `INSERT INTO scores (game_type, uuid, nickname, score, stats, verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (game_type, uuid) DO UPDATE SET
         score = CASE WHEN EXCLUDED.score > scores.score THEN EXCLUDED.score ELSE scores.score END,
         nickname = EXCLUDED.nickname,
         stats = CASE WHEN EXCLUDED.score > scores.score THEN EXCLUDED.stats ELSE scores.stats END,
         verified = CASE WHEN EXCLUDED.score > scores.score THEN EXCLUDED.verified ELSE scores.verified END,
         created_at = CASE WHEN EXCLUDED.score > scores.score THEN NOW() ELSE scores.created_at END`,
      [gameType, entry.uuid, entry.nickname, entry.score, JSON.stringify(entry.stats || {}), entry.verified || false]
    );
    return getLeaderboard(gameType);
  }

  const data = readJSON();
  if (!data[gameType]) data[gameType] = [];

  const existingIndex = entry.uuid
    ? data[gameType].findIndex(e => e.uuid === entry.uuid)
    : data[gameType].findIndex(e => e.nickname === entry.nickname);

  if (existingIndex >= 0) {
    if (entry.score > data[gameType][existingIndex].score) {
      data[gameType][existingIndex] = entry;
    } else {
      data[gameType][existingIndex].nickname = entry.nickname;
    }
  } else {
    data[gameType].push(entry);
  }

  data[gameType] = data[gameType].sort((a, b) => b.score - a.score).slice(0, 10);
  writeJSON(data);
  return data[gameType];
}

async function updateNickname(uuid, nickname) {
  if (usePostgres) {
    await pool.query(
      `UPDATE scores SET nickname = $1 WHERE uuid = $2`,
      [nickname, uuid]
    );
    return;
  }

  const data = readJSON();
  Object.keys(data).forEach(gameType => {
    data[gameType].forEach(entry => {
      if (entry.uuid === uuid) {
        entry.nickname = nickname;
      }
    });
  });
  writeJSON(data);
}

async function clearLeaderboard(gameType) {
  if (usePostgres) {
    if (gameType) {
      await pool.query(`DELETE FROM scores WHERE game_type = $1`, [gameType]);
    } else {
      await pool.query(`DELETE FROM scores`);
    }
    return;
  }

  if (gameType) {
    const data = readJSON();
    delete data[gameType];
    writeJSON(data);
  } else {
    writeJSON({});
  }
}

async function isTop3Score(gameType, score) {
  if (usePostgres) {
    const { rows } = await pool.query(
      `SELECT score FROM scores WHERE game_type = $1 ORDER BY score DESC LIMIT 3`,
      [gameType]
    );
    if (rows.length < 3) return true;
    return score >= rows[rows.length - 1].score;
  }

  const data = readJSON();
  const leaderboard = data[gameType] || [];
  if (leaderboard.length < 3) return true;
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
  return score >= (sorted[2]?.score || 0);
}

// ============ REPLAY FUNCTIONS ============

async function saveReplay(replayData) {
  if (usePostgres) {
    await pool.query(
      `INSERT INTO replays (id, game_type, user_id, nickname, score, duration, frames)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         game_type = EXCLUDED.game_type,
         user_id = EXCLUDED.user_id,
         nickname = EXCLUDED.nickname,
         score = EXCLUDED.score,
         duration = EXCLUDED.duration,
         frames = EXCLUDED.frames`,
      [
        replayData.id,
        replayData.gameType,
        replayData.userId,
        replayData.nickname,
        replayData.score,
        replayData.duration,
        JSON.stringify(replayData.frames),
      ]
    );
    return;
  }

  if (!fs.existsSync(REPLAYS_DIR)) {
    fs.mkdirSync(REPLAYS_DIR, { recursive: true });
  }
  const filePath = path.join(REPLAYS_DIR, `${replayData.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(replayData));
}

async function getReplay(replayId) {
  if (usePostgres) {
    const { rows } = await pool.query(
      `SELECT id, game_type as "gameType", user_id as "userId", nickname, score, duration, frames, created_at as timestamp
       FROM replays WHERE id = $1`,
      [replayId]
    );
    return rows[0] || null;
  }

  const filePath = path.join(REPLAYS_DIR, `${replayId}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('Error reading replay:', err);
    return null;
  }
}

async function getReplaysForGame(gameType) {
  if (usePostgres) {
    const { rows } = await pool.query(
      `SELECT id, game_type as "gameType", user_id as "userId", nickname, score, duration, created_at as timestamp
       FROM replays WHERE game_type = $1
       ORDER BY score DESC LIMIT 3`,
      [gameType]
    );
    return rows;
  }

  if (!fs.existsSync(REPLAYS_DIR)) {
    fs.mkdirSync(REPLAYS_DIR, { recursive: true });
  }
  const files = fs.readdirSync(REPLAYS_DIR);
  const replays = [];

  files.forEach(file => {
    if (file.endsWith('.json')) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(REPLAYS_DIR, file), 'utf8'));
        if (data.gameType === gameType) {
          replays.push({
            id: data.id,
            gameType: data.gameType,
            userId: data.userId,
            nickname: data.nickname,
            score: data.score,
            duration: data.duration,
            timestamp: data.timestamp,
          });
        }
      } catch (err) {
        console.error(`Error reading replay file ${file}:`, err);
      }
    }
  });

  return replays.sort((a, b) => b.score - a.score).slice(0, 3);
}

async function deleteReplay(replayId) {
  if (usePostgres) {
    const { rowCount } = await pool.query(`DELETE FROM replays WHERE id = $1`, [replayId]);
    return rowCount > 0;
  }

  const filePath = path.join(REPLAYS_DIR, `${replayId}.json`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

async function cleanupReplays(gameType) {
  if (usePostgres) {
    // Keep only top 3 replays per game type (by score)
    await pool.query(
      `DELETE FROM replays WHERE game_type = $1 AND id NOT IN (
        SELECT id FROM replays WHERE game_type = $1 ORDER BY score DESC LIMIT 3
      )`,
      [gameType]
    );
    return;
  }

  const data = readJSON();
  const leaderboard = (data[gameType] || []).sort((a, b) => b.score - a.score).slice(0, 3);
  const top3UserIds = leaderboard.map(e => e.uuid);

  if (!fs.existsSync(REPLAYS_DIR)) return;
  const files = fs.readdirSync(REPLAYS_DIR);

  files.forEach(file => {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(REPLAYS_DIR, file);
        const replayData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (replayData.gameType === gameType) {
          if (!top3UserIds.includes(replayData.userId)) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up replay: ${file}`);
          }
        }
      } catch (err) {
        console.error(`Error processing replay file ${file}:`, err);
      }
    }
  });
}

module.exports = {
  initialize,
  getLeaderboard,
  getAllLeaderboards,
  upsertScore,
  updateNickname,
  clearLeaderboard,
  isTop3Score,
  saveReplay,
  getReplay,
  getReplaysForGame,
  deleteReplay,
  cleanupReplays,
};
