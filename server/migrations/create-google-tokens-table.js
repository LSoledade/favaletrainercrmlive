
const Database = require('better-sqlite3');
const path = require('path');

function createGoogleTokensTable() {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'database.db');
  const db = new Database(dbPath);

  try {
    // Criar tabela para tokens do Google OAuth2
    db.exec(`
      CREATE TABLE IF NOT EXISTS google_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        accessToken TEXT NOT NULL,
        refreshToken TEXT,
        expiryDate INTEGER NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId)
      )
    `);

    console.log('✅ Tabela google_tokens criada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar tabela google_tokens:', error);
    throw error;
  } finally {
    db.close();
  }
}

if (require.main === module) {
  createGoogleTokensTable();
}

module.exports = { createGoogleTokensTable };
