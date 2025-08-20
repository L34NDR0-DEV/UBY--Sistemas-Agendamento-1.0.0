/**
 * Sistema de Throttling Adaptativo
 * Otimiza eventos de scroll, resize e outros eventos frequentes
 * Baseado na performance da máquina, transparente ao usuário
 */

class AdaptiveThrottler {
    constructor() {
        this.throttledFunctions = new Map();
        this.defaultDelay = 100;
        this.slowMachineDelay = 200;
        this.fastMachineDelay = 50;
        this.activeListeners = new Map();
        
        this.init();
    }

    init() {
        // Aguarda o detector de performance estar pronto
        const checkDetector = () => {
            if (window.performanceDetector) {
                this.configureThrottling();
                this.setupGlobalListeners();
            } else {
                setTimeout(checkDetector, 100);
            }
        };
        checkDetector();
    }

    configureThrottling() {
        if (window.performanceDetector?.shouldUseThrottling()) {
            this.defaultDelay = window.performanceDetector.getThrottleDelay();
            console.log(`Throttling adaptativo ativado com delay de ${this.defaultDelay}ms`);
        } else {
            this.defaultDelay = this.fastMachineDelay;
        }
    }

    // Método principal para criar função throttled
    throttle(func, delay = null, options = {}) {
        const {
            leading = true,
            trailing = true,
            maxWait = null
        } = options;

        const actualDelay = delay || this.getOptimalDelay();
        let lastCallTime = 0;
        let lastInvokeTime = 0;
        let timerId = null;
        let lastArgs = null;
        let lastThis = null;

        const invokeFunc = (time) => {
            const args = lastArgs;
            const thisArg = lastThis;
            
            lastArgs = lastThis = null;
            lastInvokeTime = time;
            
            return func.apply(thisArg, args);
        };

        const leadingEdge = (time) => {
            lastInvokeTime = time;
            timerId = setTimeout(timerExpired, actualDelay);
            return leading ? invokeFunc(time) : undefined;
        };

        const remainingWait = (time) => {
            const timeSinceLastCall = time - lastCallTime;
            const timeSinceLastInvoke = time - lastInvokeTime;
            const timeWaiting = actualDelay - timeSinceLastCall;
            
            return maxWait !== null
                ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
                : timeWaiting;
        };

        const shouldInvoke = (time) => {
            const timeSinceLastCall = time - lastCallTime;
            const timeSinceLastInvoke = time - lastInvokeTime;
            
            return (lastCallTime === 0 || 
                    timeSinceLastCall >= actualDelay ||
                    timeSinceLastCall < 0 ||
                    (maxWait !== null && timeSinceLastInvoke >= maxWait));
        };

        const timerExpired = () => {
            const time = Date.now();
            if (shouldInvoke(time)) {
                return trailingEdge(time);
            }
            timerId = setTimeout(timerExpired, remainingWait(time));
        };

        const trailingEdge = (time) => {
            timerId = null;
            if (trailing && lastArgs) {
                return invokeFunc(time);
            }
            lastArgs = lastThis = null;
            return undefined;
        };

        const throttled = function(...args) {
            const time = Date.now();
            const isInvoking = shouldInvoke(time);
            
            lastArgs = args;
            lastThis = this;
            lastCallTime = time;
            
            if (isInvoking) {
                if (timerId === null) {
                    return leadingEdge(lastCallTime);
                }
                if (maxWait !== null) {
                    timerId = setTimeout(timerExpired, actualDelay);
                    return invokeFunc(lastCallTime);
                }
            }
            if (timerId === null) {
                timerId = setTimeout(timerExpired, actualDelay);
            }
            return undefined;
        };

        throttled.cancel = () => {
            if (timerId !== null) {
                clearTimeout(timerId);
            }
            lastInvokeTime = 0;
            lastArgs = lastCallTime = lastThis = timerId = null;
        };

        throttled.flush = () => {
            return timerId === null ? undefined : trailingEdge(Date.now());
        };

        return throttled;
    }

    // Throttling específico para scroll
    throttleScroll(scrollFunction, customDelay = null) {
        const delay = customDelay || this.getScrollDelay();
        return this.throttle(scrollFunction, delay, { leading: true, trailing: true });
    }

    // Throttling específico para resize
    throttleResize(resizeFunction, customDelay = null) {
        const delay = customDelay || this.getResizeDelay();
        return this.throttle(resizeFunction, delay, { leading: false, trailing: true });
    }

    // Throttling específico para mouse move
    throttleMouseMove(mouseMoveFunction, customDelay = null) {
        const delay = customDelay || this.getMouseMoveDelay();
        return this.throttle(mouseMoveFunction, delay, { leading: true, trailing: false });
    }

    // Throttling específico para input events
    throttleInput(inputFunction, customDelay = null) {
        const delay = customDelay || this.getInputDelay();
        return this.throttle(inputFunction, delay, { leading: true, trailing: true });
    }

    getOptimalDelay() {
        if (!window.performanceDetector) {
            return this.defaultDelay;
        }

        if (window.performanceDetector.shouldUseThrottling()) {
            return window.performanceDetector.getThrottleDelay();
        }

        return this.fastMachineDelay;
    }

    getScrollDelay() {
        const baseDelay = this.getOptimalDelay();
        // Scroll precisa ser mais responsivo
        return Math.max(16, baseDelay * 0.6); // Mínimo 16ms (60fps)
    }

    getResizeDelay() {
        const baseDelay = this.getOptimalDelay();
        // Resize pode ser mais conservador
        return Math.max(100, baseDelay * 1.5);
    }

    getMouseMoveDelay() {
        const baseDelay = this.getOptimalDelay();
        // Mouse move precisa ser muito responsivo
        return Math.max(10, baseDelay * 0.3);
    }

    getInputDelay() {
        const baseDelay = this.getOptimalDelay();
        // Input events precisam de responsividade
        return Math.max(50, baseDelay * 0.8);
    }

    // Configura listeners globais otimizados
    setupGlobalListeners() {
        if (!window.performanceDetector?.shouldUseThrottling()) {
            return; // Não aplica throttling em máquinas rápidas
        }

        this.setupScrollOptimization();
        this.setupResizeOptimization();
    }

    setupScrollOptimization() {
        // Otimiza scroll events globalmente
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const throttler = this;

        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'scroll' && typeof listener === 'function') {
                const throttledListener = throttler.throttleScroll(listener);
                throttler.activeListeners.set(listener, throttledListener);
                return originalAddEventListener.call(this, type, throttledListener, options);
            }
            return originalAddEventListener.call(this, type, listener, options);
        };
    }

    setupResizeOptimization() {
        // Otimiza resize events globalmente
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const throttler = this;

        const enhancedAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'resize' && typeof listener === 'function') {
                const throttledListener = throttler.throttleResize(listener);
                throttler.activeListeners.set(listener, throttledListener);
                return enhancedAddEventListener.call(this, type, throttledListener, options);
            }
            return enhancedAddEventListener.call(this, type, listener, options);
        };
    }

    // Método para anexar throttling a elementos específicos
    attachToElement(element, eventType, callback, options = {}) {
        const {
            delay = null,
            throttleOptions = {}
        } = options;

        let throttledCallback;
        
        switch (eventType) {
            case 'scroll':
                throttledCallback = this.throttleScroll(callback, delay);
                break;
            case 'resize':
                throttledCallback = this.throttleResize(callback, delay);
                break;
            case 'mousemove':
                throttledCallback = this.throttleMouseMove(callback, delay);
                break;
            case 'input':
            case 'keyup':
                throttledCallback = this.throttleInput(callback, delay);
                break;
            default:
                throttledCallback = this.throttle(callback, delay, throttleOptions);
        }

        element.addEventListener(eventType, throttledCallback);
        
        const elementKey = `${element.tagName}_${element.id || Math.random()}_${eventType}`;
        this.activeListeners.set(elementKey, {
            element,
            eventType,
            original: callback,
            throttled: throttledCallback
        });

        // Retorna função para remover listener
        return () => {
            element.removeEventListener(eventType, throttledCallback);
            this.activeListeners.delete(elementKey);
        };
    }

    // Otimização específica para listas longas
    optimizeListScrolling(listElement, itemSelector, callback) {
        if (!window.performanceDetector?.shouldUseThrottling()) {
            // Em máquinas rápidas, usa scroll normal
            listElement.addEventListener('scroll', callback);
            return;
        }

        const throttledCallback = this.throttleScroll((event) => {
            // Calcula apenas itens visíveis
            const containerRect = listElement.getBoundingClientRect();
            const items = listElement.querySelectorAll(itemSelector);
            
            const visibleItems = Array.from(items).filter(item => {
                const itemRect = item.getBoundingClientRect();
                return itemRect.bottom >= containerRect.top && 
                       itemRect.top <= containerRect.bottom;
            });

            callback(event, visibleItems);
        });

        listElement.addEventListener('scroll', throttledCallback);
        
        return () => {
            listElement.removeEventListener('scroll', throttledCallback);
        };
    }

    // Otimização para animações
    optimizeAnimation(animationFunction, fps = null) {
        const targetFPS = fps || (window.performanceDetector?.shouldUseThrottling() ? 30 : 60);
        const frameDelay = 1000 / targetFPS;
        
        let lastFrameTime = 0;
        
        const optimizedAnimation = (timestamp) => {
            if (timestamp - lastFrameTime >= frameDelay) {
                animationFunction(timestamp);
                lastFrameTime = timestamp;
            }
        };

        return optimizedAnimation;
    }

    // Método para cancelar todos os throttled functions
    cancelAll() {
        this.activeListeners.forEach((listener, key) => {
            if (listener.throttled && listener.throttled.cancel) {
                listener.throttled.cancel();
            }
        });
        this.activeListeners.clear();
    }

    // Estatísticas do throttler
    getStats() {
        return {
            activeListeners: this.activeListeners.size,
            currentDelay: this.defaultDelay,
            isOptimized: window.performanceDetector?.shouldUseThrottling() || false,
            delays: {
                scroll: this.getScrollDelay(),
                resize: this.getResizeDelay(),
                mouseMove: this.getMouseMoveDelay(),
                input: this.getInputDelay()
            }
        };
    }

    // Método para criar um RequestAnimationFrame otimizado
    createOptimizedRAF() {
        if (!window.performanceDetector?.shouldUseThrottling()) {
            return requestAnimationFrame;
        }

        let rafId = null;
        let callbacks = [];
        
        const processCallbacks = () => {
            const currentCallbacks = callbacks.slice();
            callbacks = [];
            rafId = null;
            
            currentCallbacks.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.warn('Erro em callback RAF otimizado:', error);
                }
            });
        };

        return (callback) => {
            callbacks.push(callback);
            
            if (rafId === null) {
                rafId = requestAnimationFrame(processCallbacks);
            }
            
            return rafId;
        };
    }

    // Limpa recursos
    destroy() {
        this.cancelAll();
        
        // Restaura addEventListener original se foi modificado
        if (this.originalAddEventListener) {
            EventTarget.prototype.addEventListener = this.originalAddEventListener;
        }
    }
}

// Instância global
window.adaptiveThrottler = new AdaptiveThrottler();

// Exporta para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaptiveThrottler;
}