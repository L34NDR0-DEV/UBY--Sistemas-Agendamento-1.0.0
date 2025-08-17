/**
 * Sistema de Banco de Dados para Post-its
 * Gerencia todos os post-its usando SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class PostItDatabase {
    constructor(dbPath = null) {
        // Definir caminho do banco de dados
        this.dbPath = dbPath || path.join(process.cwd(), 'data', 'postits.db');
        this.db = null;
        
        // Garantir que o diretório existe
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.init();
    }

    // Inicializar banco de dados
    init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Erro ao conectar com o banco de dados:', err);
                    reject(err);
                    return;
                }
                
                console.log('✅ Conectado ao banco de dados SQLite');
                this.createTables().then(resolve).catch(reject);
            });
        });
    }

    // Criar tabelas necessárias
    createTables() {
        return new Promise((resolve, reject) => {
            const createPostItsTable = `
                CREATE TABLE IF NOT EXISTS postits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    content TEXT NOT NULL,
                    color TEXT DEFAULT '#ffeb3b',
                    position_x INTEGER DEFAULT 100,
                    position_y INTEGER DEFAULT 100,
                    width INTEGER DEFAULT 200,
                    height INTEGER DEFAULT 150,
                    font_size INTEGER DEFAULT 14,
                    font_family TEXT DEFAULT 'Arial',
                    is_pinned BOOLEAN DEFAULT 0,
                    is_minimized BOOLEAN DEFAULT 0,
                    z_index INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    deleted_at DATETIME NULL
                )
            `;

            const createIndexes = `
                CREATE INDEX IF NOT EXISTS idx_postits_uuid ON postits(uuid);
                CREATE INDEX IF NOT EXISTS idx_postits_deleted ON postits(deleted_at);
                CREATE INDEX IF NOT EXISTS idx_postits_created ON postits(created_at);
            `;

            this.db.run(createPostItsTable, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela postits:', err);
                    reject(err);
                    return;
                }

                this.db.exec(createIndexes, (err) => {
                    if (err) {
                        console.error('Erro ao criar índices:', err);
                        reject(err);
                        return;
                    }

                    console.log('✅ Tabelas e índices criados com sucesso');
                    resolve();
                });
            });
        });
    }

    // Criar novo post-it
    createPostIt(postItData) {
        return new Promise((resolve, reject) => {
            const {
                uuid,
                content,
                color = '#ffeb3b',
                position_x = 100,
                position_y = 100,
                width = 200,
                height = 150,
                font_size = 14,
                font_family = 'Arial',
                is_pinned = false,
                is_minimized = false,
                z_index = 1
            } = postItData;

            const sql = `
                INSERT INTO postits (
                    uuid, content, color, position_x, position_y, 
                    width, height, font_size, font_family, 
                    is_pinned, is_minimized, z_index
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                uuid, content, color, position_x, position_y,
                width, height, font_size, font_family,
                is_pinned ? 1 : 0, is_minimized ? 1 : 0, z_index
            ];

            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Erro ao criar post-it:', err);
                    reject(err);
                    return;
                }

                console.log(`✅ Post-it criado com ID: ${this.lastID}`);
                resolve({
                    id: this.lastID,
                    uuid,
                    ...postItData
                });
            });
        });
    }

    // Buscar todos os post-its ativos
    getAllPostIts() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM postits 
                WHERE deleted_at IS NULL 
                ORDER BY z_index ASC, created_at ASC
            `;

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar post-its:', err);
                    reject(err);
                    return;
                }

                // Converter valores booleanos
                const postits = rows.map(row => ({
                    ...row,
                    is_pinned: Boolean(row.is_pinned),
                    is_minimized: Boolean(row.is_minimized)
                }));

                resolve(postits);
            });
        });
    }

    // Buscar post-it por UUID
    getPostItByUuid(uuid) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM postits 
                WHERE uuid = ? AND deleted_at IS NULL
            `;

            this.db.get(sql, [uuid], (err, row) => {
                if (err) {
                    console.error('Erro ao buscar post-it:', err);
                    reject(err);
                    return;
                }

                if (row) {
                    row.is_pinned = Boolean(row.is_pinned);
                    row.is_minimized = Boolean(row.is_minimized);
                }

                resolve(row);
            });
        });
    }

    // Atualizar post-it
    updatePostIt(uuid, updateData) {
        return new Promise((resolve, reject) => {
            const allowedFields = [
                'content', 'color', 'position_x', 'position_y',
                'width', 'height', 'font_size', 'font_family',
                'is_pinned', 'is_minimized', 'z_index'
            ];

            const updates = [];
            const params = [];

            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    updates.push(`${key} = ?`);
                    let value = updateData[key];
                    
                    // Converter booleanos para inteiros
                    if (key === 'is_pinned' || key === 'is_minimized') {
                        value = value ? 1 : 0;
                    }
                    
                    params.push(value);
                }
            });

            if (updates.length === 0) {
                resolve({ message: 'Nenhum campo válido para atualizar' });
                return;
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(uuid);

            const sql = `
                UPDATE postits 
                SET ${updates.join(', ')} 
                WHERE uuid = ? AND deleted_at IS NULL
            `;

            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Erro ao atualizar post-it:', err);
                    reject(err);
                    return;
                }

                console.log(`✅ Post-it ${uuid} atualizado. Linhas afetadas: ${this.changes}`);
                resolve({ 
                    changes: this.changes,
                    uuid,
                    updated: updateData
                });
            });
        });
    }

    // Deletar post-it (soft delete)
    deletePostIt(uuid) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE postits 
                SET deleted_at = CURRENT_TIMESTAMP 
                WHERE uuid = ? AND deleted_at IS NULL
            `;

            this.db.run(sql, [uuid], function(err) {
                if (err) {
                    console.error('Erro ao deletar post-it:', err);
                    reject(err);
                    return;
                }

                console.log(`🗑️ Post-it ${uuid} deletado. Linhas afetadas: ${this.changes}`);
                resolve({ 
                    changes: this.changes,
                    uuid,
                    deleted: true
                });
            });
        });
    }

    // Deletar post-it permanentemente
    deletePostItPermanently(uuid) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM postits WHERE uuid = ?`;

            this.db.run(sql, [uuid], function(err) {
                if (err) {
                    console.error('Erro ao deletar post-it permanentemente:', err);
                    reject(err);
                    return;
                }

                console.log(`🗑️ Post-it ${uuid} deletado permanentemente. Linhas afetadas: ${this.changes}`);
                resolve({ 
                    changes: this.changes,
                    uuid,
                    deletedPermanently: true
                });
            });
        });
    }

    // Restaurar post-it deletado
    restorePostIt(uuid) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE postits 
                SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP 
                WHERE uuid = ? AND deleted_at IS NOT NULL
            `;

            this.db.run(sql, [uuid], function(err) {
                if (err) {
                    console.error('Erro ao restaurar post-it:', err);
                    reject(err);
                    return;
                }

                console.log(`♻️ Post-it ${uuid} restaurado. Linhas afetadas: ${this.changes}`);
                resolve({ 
                    changes: this.changes,
                    uuid,
                    restored: true
                });
            });
        });
    }

    // Buscar post-its deletados (lixeira)
    getDeletedPostIts() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM postits 
                WHERE deleted_at IS NOT NULL 
                ORDER BY deleted_at DESC
            `;

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar post-its deletados:', err);
                    reject(err);
                    return;
                }

                const postits = rows.map(row => ({
                    ...row,
                    is_pinned: Boolean(row.is_pinned),
                    is_minimized: Boolean(row.is_minimized)
                }));

                resolve(postits);
            });
        });
    }

    // Limpar lixeira (deletar todos os post-its deletados permanentemente)
    emptyTrash() {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM postits WHERE deleted_at IS NOT NULL`;

            this.db.run(sql, [], function(err) {
                if (err) {
                    console.error('Erro ao limpar lixeira:', err);
                    reject(err);
                    return;
                }

                console.log(`🗑️ Lixeira limpa. ${this.changes} post-its deletados permanentemente`);
                resolve({ 
                    changes: this.changes,
                    message: 'Lixeira limpa com sucesso'
                });
            });
        });
    }

    // Obter estatísticas
    getStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active,
                    COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted,
                    COUNT(CASE WHEN is_pinned = 1 AND deleted_at IS NULL THEN 1 END) as pinned
                FROM postits
            `;

            this.db.get(sql, [], (err, row) => {
                if (err) {
                    console.error('Erro ao obter estatísticas:', err);
                    reject(err);
                    return;
                }

                resolve(row);
            });
        });
    }

    // Fechar conexão com o banco
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Erro ao fechar banco de dados:', err);
                        reject(err);
                        return;
                    }
                    
                    console.log('🔒 Conexão com banco de dados fechada');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = PostItDatabase;