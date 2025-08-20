/**
 * Gerenciador de Fusos Horários
 * Responsável por ajustar horários baseado na cidade selecionada
 */

class TimezoneManager {
    constructor() {
        // Configuração de fusos horários por cidade
        this.timezoneConfig = {
            // Mato Grosso do Sul - 1 hora atrás de Brasília
            'AQUIDAUANA': {
                offset: -1, // -1 hora em relação ao horário de Brasília
                timezone: 'America/Campo_Grande',
                state: 'MS'
            }
            // Outras cidades usam horário de Brasília (offset: 0)
        };
    }

    /**
     * Obtém a configuração de fuso horário para uma cidade
     * @param {string} cidade - Nome da cidade
     * @returns {Object} Configuração do fuso horário
     */
    getTimezoneConfig(cidade) {
        return this.timezoneConfig[cidade?.toUpperCase()] || {
            offset: 0,
            timezone: 'America/Sao_Paulo',
            state: 'Default'
        };
    }

    /**
     * Ajusta um horário baseado na cidade
     * @param {string} time - Horário no formato HH:MM
     * @param {string} cidade - Nome da cidade
     * @param {boolean} toLocal - Se true, converte de Brasília para local; se false, de local para Brasília
     * @returns {string} Horário ajustado no formato HH:MM
     */
    adjustTime(time, cidade, toLocal = true) {
        if (!time || !cidade) return time;

        const config = this.getTimezoneConfig(cidade);
        if (config.offset === 0) return time; // Sem ajuste necessário

        const [hours, minutes] = time.split(':').map(Number);
        let adjustedHours = hours;

        if (toLocal) {
            // Convertendo de Brasília para horário local
            adjustedHours += config.offset;
        } else {
            // Convertendo de horário local para Brasília
            adjustedHours -= config.offset;
        }

        // Ajustar para formato 24h
        if (adjustedHours < 0) {
            adjustedHours += 24;
        } else if (adjustedHours >= 24) {
            adjustedHours -= 24;
        }

        return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Ajusta uma data/hora completa baseada na cidade
     * @param {Date} dateTime - Objeto Date
     * @param {string} cidade - Nome da cidade
     * @param {boolean} toLocal - Se true, converte de Brasília para local
     * @returns {Date} Data/hora ajustada
     */
    adjustDateTime(dateTime, cidade, toLocal = true) {
        if (!dateTime || !cidade) return dateTime;

        const config = this.getTimezoneConfig(cidade);
        if (config.offset === 0) return dateTime;

        const adjustedDateTime = new Date(dateTime);
        const offsetMs = config.offset * 60 * 60 * 1000; // Converter horas para milissegundos

        if (toLocal) {
            adjustedDateTime.setTime(adjustedDateTime.getTime() + offsetMs);
        } else {
            adjustedDateTime.setTime(adjustedDateTime.getTime() - offsetMs);
        }

        return adjustedDateTime;
    }

    /**
     * Formata um horário para exibição com indicação de fuso horário
     * @param {string} time - Horário no formato HH:MM
     * @param {string} cidade - Nome da cidade
     * @returns {string} Horário formatado com indicação de fuso
     */
    formatTimeWithTimezone(time, cidade) {
        if (!time || !cidade) return time;

        const config = this.getTimezoneConfig(cidade);
        const localTime = this.adjustTime(time, cidade, true);

        if (config.offset === 0) {
            return localTime; // Horário de Brasília
        }

        return `${localTime} (${config.state})`;
    }

    /**
     * Obtém o horário atual ajustado para uma cidade
     * @param {string} cidade - Nome da cidade
     * @returns {string} Horário atual no formato HH:MM
     */
    getCurrentTimeForCity(cidade) {
        const now = new Date();
        const adjustedTime = this.adjustDateTime(now, cidade, true);
        return adjustedTime.toTimeString().slice(0, 5);
    }

    /**
     * Verifica se uma cidade tem fuso horário diferente
     * @param {string} cidade - Nome da cidade
     * @returns {boolean} True se tem fuso diferente
     */
    hasDifferentTimezone(cidade) {
        const config = this.getTimezoneConfig(cidade);
        return config.offset !== 0;
    }

    /**
     * Obtém informações sobre o fuso horário de uma cidade
     * @param {string} cidade - Nome da cidade
     * @returns {Object} Informações do fuso horário
     */
    getTimezoneInfo(cidade) {
        const config = this.getTimezoneConfig(cidade);
        return {
            city: cidade,
            state: config.state,
            offset: config.offset,
            offsetText: config.offset === 0 ? 'Horário de Brasília' : 
                       config.offset > 0 ? `+${config.offset}h em relação a Brasília` :
                       `${config.offset}h em relação a Brasília`,
            timezone: config.timezone,
            hasDifferentTimezone: config.offset !== 0
        };
    }
}

// Instância global do gerenciador de fuso horário
window.timezoneManager = new TimezoneManager();

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimezoneManager;
}