/**
 * Sistema de banco de dados SQLite para persistência
 * Gerencia agendamentos, usuários e sincronização
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../../data/app.db');
        this.ensureDataDirectory();
    }

    /**
     * Garantir que o diretório de dados existe
     */
    ensureDataDirectory() {
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    /**
     * Inicializar banco de dados
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('[ERROR] Erro ao conectar ao banco de dados:', err);
                    reject(err);
                } else {
                    console.log('[SUCCESS] Conectado ao banco de dados SQLite');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    /**
     * Criar tabelas do banco de dados
     */
    async createTables() {
        const tables = [
            // Tabela de usuários
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabela de agendamentos
            `CREATE TABLE IF NOT EXISTS appointments (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                user_id TEXT NOT NULL,
                shared_with TEXT,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Tabela de notificações
            `CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                from_user_id TEXT,
                title TEXT NOT NULL,
                message TEXT,
                type TEXT DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (from_user_id) REFERENCES users (id)
            )`,

            // Tabela de sincronização
            `CREATE TABLE IF NOT EXISTS sync_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                record_id TEXT NOT NULL,
                action TEXT NOT NULL,
                user_id TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                data TEXT
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        console.log('[SUCCESS] Tabelas do banco de dados criadas');
    }

    /**
     * Executar query SQL
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * Executar query de seleção
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Executar query de seleção múltipla
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Gerenciar usuários
     */
    async createUser(userId, username, displayName) {
        const sql = `
            INSERT OR REPLACE INTO users (id, username, display_name, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `;
        return this.run(sql, [userId, username, displayName]);
    }

    async getUser(userId) {
        return this.get('SELECT * FROM users WHERE id = ?', [userId]);
    }

    async getAllUsers() {
        return this.all('SELECT * FROM users ORDER BY display_name');
    }

    /**
     * Gerenciar agendamentos
     */
    async createAppointment(appointment) {
        const sql = `
            INSERT INTO appointments (
                id, title, description, start_date, end_date, 
                user_id, shared_with, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        
        const params = [
            appointment.id,
            appointment.title,
            appointment.description || '',
            appointment.startDate,
            appointment.endDate,
            appointment.userId,
            appointment.sharedWith || null,
            appointment.status || 'active'
        ];

        await this.run(sql, params);
        await this.logSync('appointments', appointment.id, 'create', appointment.userId, appointment);
        
        return appointment;
    }

    async updateAppointment(appointment) {
        const sql = `
            UPDATE appointments SET
                title = ?, description = ?, start_date = ?, end_date = ?,
                shared_with = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const params = [
            appointment.title,
            appointment.description || '',
            appointment.startDate,
            appointment.endDate,
            appointment.sharedWith || null,
            appointment.status || 'active',
            appointment.id
        ];

        await this.run(sql, params);
        await this.logSync('appointments', appointment.id, 'update', appointment.userId, appointment);
        
        return appointment;
    }

    async deleteAppointment(appointmentId, userId) {
        const sql = 'DELETE FROM appointments WHERE id = ?';
        await this.run(sql, [appointmentId]);
        await this.logSync('appointments', appointmentId, 'delete', userId);
    }

    async getAppointments(userId) {
        const sql = `
            SELECT * FROM appointments 
            WHERE user_id = ? OR shared_with = ?
            ORDER BY start_date DESC
        `;
        return this.all(sql, [userId, userId]);
    }

    async getAppointment(appointmentId) {
        return this.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    }

    async getAppointmentsUpdatedSince(timestamp) {
        const sql = `
            SELECT * FROM appointments 
            WHERE updated_at > ? 
            ORDER BY updated_at DESC
        `;
        return this.all(sql, [timestamp]);
    }

    /**
     * Buscar notificações criadas desde um timestamp específico
     */
    getNotificationsSince(timestamp) {
        const sql = `
            SELECT * FROM notifications 
            WHERE created_at > ? 
            ORDER BY created_at DESC
        `;
        return this.all(sql, [timestamp]);
    }

    /**
     * Buscar mudanças de status desde um timestamp específico
     */
    getStatusChangesSince(timestamp) {
        const sql = `
            SELECT * FROM appointments 
            WHERE updated_at > ? 
            AND status != 'active'
            ORDER BY updated_at DESC
        `;
        return this.all(sql, [timestamp]);
    }

    /**
     * Gerenciar notificações
     */
    async createNotification(notification) {
        const sql = `
            INSERT INTO notifications (
                id, user_id, from_user_id, title, message, type, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        const params = [
            notification.id,
            notification.userId,
            notification.fromUserId || null,
            notification.title,
            notification.message || '',
            notification.type || 'info'
        ];

        await this.run(sql, params);
        return notification;
    }

    async markNotificationAsRead(notificationId) {
        const sql = 'UPDATE notifications SET is_read = TRUE WHERE id = ?';
        return this.run(sql, [notificationId]);
    }

    async getNotifications(userId) {
        const sql = `
            SELECT n.*, u.display_name as from_user_name
            FROM notifications n
            LEFT JOIN users u ON n.from_user_id = u.id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
        `;
        return this.all(sql, [userId]);
    }

    /**
     * Log de sincronização
     */
    async logSync(tableName, recordId, action, userId, data = null) {
        const sql = `
            INSERT INTO sync_log (table_name, record_id, action, user_id, data, timestamp)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        const dataStr = data ? JSON.stringify(data) : null;
        return this.run(sql, [tableName, recordId, action, userId, dataStr]);
    }

    async getSyncLog(since = null) {
        let sql = 'SELECT * FROM sync_log ORDER BY timestamp DESC';
        let params = [];
        
        if (since) {
            sql = 'SELECT * FROM sync_log WHERE timestamp > ? ORDER BY timestamp DESC';
            params = [since];
        }
        
        return this.all(sql, params);
    }

    /**
     * Fechar conexão
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('[CLOSE] Conexão com banco de dados fechada');
        }
    }
}

module.exports = Database;