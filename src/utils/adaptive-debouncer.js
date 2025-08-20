/**
 * Sistema de Debouncing Adaptativo
 * Otimiza buscas e filtros baseado na performance da máquina
 * Transparente ao usuário - não altera a interface visual
 */

class AdaptiveDebouncer {
    constructor() {
        this.debouncedFunctions = new Map();
        this.defaultDelay = 300;
        this.slowMachineDelay = 500;
        this.fastMachineDelay = 150;
        
        this.init();
    }

    init() {
        // Aguarda o detector de performance estar pronto
        const checkDetector = () => {
            if (window.performanceDetector) {
                this.updateDelays();
            } else {
                setTimeout(checkDetector, 100);
            }
        };
        checkDetector();
    }

    updateDelays() {
        if (window.performanceDetector?.shouldUseDebouncing()) {
            this.defaultDelay = window.performanceDetector.getDebounceDelay();
            console.log(`Debouncing adaptativo ativado com delay de ${this.defaultDelay}ms`);
        } else {
            this.defaultDelay = this.fastMachineDelay;
        }
    }

    // Método principal para criar função debounced
    debounce(func, delay = null, key = null) {
        const actualDelay = delay || this.getOptimalDelay();
        const functionKey = key || func.toString();

        // Se já existe uma versão debounced desta função, limpa o timer anterior
        if (this.debouncedFunctions.has(functionKey)) {
            clearTimeout(this.debouncedFunctions.get(functionKey).timeoutId);
        }

        return (...args) => {
            const execute = () => {
                this.debouncedFunctions.delete(functionKey);
                func.apply(this, args);
            };

            const timeoutId = setTimeout(execute, actualDelay);
            
            this.debouncedFunctions.set(functionKey, {
                timeoutId,
                func,
                args,
                delay: actualDelay
            });
        };
    }

    // Debouncing específico para busca
    debounceSearch(searchFunction, customDelay = null) {
        const delay = customDelay || this.getSearchDelay();
        return this.debounce(searchFunction, delay, 'search');
    }

    // Debouncing específico para filtros
    debounceFilter(filterFunction, customDelay = null) {
        const delay = customDelay || this.getFilterDelay();
        return this.debounce(filterFunction, delay, 'filter');
    }

    // Debouncing específico para input de texto
    debounceInput(inputFunction, customDelay = null) {
        const delay = customDelay || this.getInputDelay();
        return this.debounce(inputFunction, delay, 'input');
    }

    // Debouncing específico para validação
    debounceValidation(validationFunction, customDelay = null) {
        const delay = customDelay || this.getValidationDelay();
        return this.debounce(validationFunction, delay, 'validation');
    }

    // Debouncing específico para auto-save
    debounceAutoSave(saveFunction, customDelay = null) {
        const delay = customDelay || this.getAutoSaveDelay();
        return this.debounce(saveFunction, delay, 'autosave');
    }

    getOptimalDelay() {
        if (!window.performanceDetector) {
            return this.defaultDelay;
        }

        if (window.performanceDetector.shouldUseDebouncing()) {
            return window.performanceDetector.getDebounceDelay();
        }

        return this.fastMachineDelay;
    }

    getSearchDelay() {
        const baseDelay = this.getOptimalDelay();
        // Busca pode ser mais agressiva
        return Math.max(100, baseDelay * 0.8);
    }

    getFilterDelay() {
        const baseDelay = this.getOptimalDelay();
        // Filtros podem ser mais rápidos
        return Math.max(150, baseDelay * 0.9);
    }

    getInputDelay() {
        const baseDelay = this.getOptimalDelay();
        // Input precisa ser responsivo
        return Math.max(200, baseDelay);
    }

    getValidationDelay() {
        const baseDelay = this.getOptimalDelay();
        // Validação pode esperar um pouco mais
        return Math.max(300, baseDelay * 1.2);
    }

    getAutoSaveDelay() {
        const baseDelay = this.getOptimalDelay();
        // Auto-save pode ser mais conservador
        return Math.max(1000, baseDelay * 3);
    }

    // Método para cancelar uma função debounced específica
    cancel(key) {
        if (this.debouncedFunctions.has(key)) {
            clearTimeout(this.debouncedFunctions.get(key).timeoutId);
            this.debouncedFunctions.delete(key);
            return true;
        }
        return false;
    }

    // Método para executar imediatamente uma função debounced
    flush(key) {
        if (this.debouncedFunctions.has(key)) {
            const { func, args } = this.debouncedFunctions.get(key);
            this.cancel(key);
            func.apply(this, args);
            return true;
        }
        return false;
    }

    // Método para cancelar todas as funções debounced
    cancelAll() {
        this.debouncedFunctions.forEach((item, key) => {
            clearTimeout(item.timeoutId);
        });
        this.debouncedFunctions.clear();
    }

    // Método para obter estatísticas
    getStats() {
        return {
            activeFunctions: this.debouncedFunctions.size,
            currentDelay: this.defaultDelay,
            isOptimized: window.performanceDetector?.shouldUseDebouncing() || false
        };
    }

    // Wrapper para elementos de input com debouncing automático
    attachToInput(inputElement, callback, options = {}) {
        const {
            delay = null,
            events = ['input', 'keyup'],
            immediate = false
        } = options;

        const debouncedCallback = this.debounceInput(callback, delay);
        const inputKey = `input_${inputElement.id || Math.random()}`;

        events.forEach(eventType => {
            inputElement.addEventListener(eventType, (event) => {
                if (immediate && event.type === 'input' && event.target.value === '') {
                    // Executa imediatamente quando limpa o campo
                    callback(event);
                } else {
                    debouncedCallback(event);
                }
            });
        });

        // Retorna função para remover listeners
        return () => {
            this.cancel(inputKey);
            events.forEach(eventType => {
                inputElement.removeEventListener(eventType, debouncedCallback);
            });
        };
    }

    // Wrapper para formulários com validação debounced
    attachToForm(formElement, validationCallback, options = {}) {
        const {
            delay = null,
            validateOnChange = true,
            validateOnBlur = true
        } = options;

        const debouncedValidation = this.debounceValidation(validationCallback, delay);
        const formKey = `form_${formElement.id || Math.random()}`;

        const inputs = formElement.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            if (validateOnChange) {
                input.addEventListener('input', debouncedValidation);
                input.addEventListener('change', debouncedValidation);
            }
            
            if (validateOnBlur) {
                input.addEventListener('blur', () => {
                    // No blur, executa imediatamente
                    this.flush(formKey);
                });
            }
        });

        return () => {
            this.cancel(formKey);
        };
    }

    // Método para criar throttle (limitação de frequência)
    throttle(func, delay = null) {
        const actualDelay = delay || this.getOptimalDelay();
        let lastCall = 0;
        let timeoutId = null;

        return (...args) => {
            const now = Date.now();
            const timeSinceLastCall = now - lastCall;

            if (timeSinceLastCall >= actualDelay) {
                lastCall = now;
                func.apply(this, args);
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    lastCall = Date.now();
                    func.apply(this, args);
                }, actualDelay - timeSinceLastCall);
            }
        };
    }
}

// Instância global
window.adaptiveDebouncer = new AdaptiveDebouncer();

// Exporta para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaptiveDebouncer;
}