/**
 * SISTEMA DE SEGURANÇA AVANÇADO - DEFESA MULTICAMADAS
 * Nível de segurança: PARANÓICO
 */

class ParanoidSecuritySystem {
    constructor() {
        this.config = {
            // Sistema de rate limiting adaptativo
            rateLimiting: {
                normal: 100,          // Requisições/min (comportamento normal)
                suspicious: 30,       // Requisições/min (comportamento suspeito)
                aggressive: 10,       // Requisições/min (comportamento agressivo)
                timeWindow: 60000,    // Janela de 1 minuto
                banStages: {          // Sistema de banimento progressivo
                    1: 5 * 60 * 1000,    // 5 minutos
                    2: 30 * 60 * 1000,   // 30 minutos
                    3: 24 * 60 * 60 * 1000 // 24 horas
                }
            },
            
            // Detecção de scanners
            scannerDetection: {
                portScanThreshold: 5,     // Número de portas para flag como scanner
                dirScanThreshold: 10,    // Número de paths inválidos
                commonScanPaths: [        // Paths comuns de scanners
                    'wp-admin', 'phpmyadmin', '.env', 'config.php',
                    'admin', 'login', 'backup', '.git', 'xmlrpc.php'
                ],
                suspiciousExtensions: [   // Extensões frequentemente varridas
                    '.php', '.asp', '.aspx', '.jsp', '.env', '.bak', '.sql'
                ],
                userAgents: {            // User agents de ferramentas de scanning
                    nmap: 'nmap',
                    sqlmap: 'sqlmap',
                    metasploit: 'metasploit',
                    burp: 'burp',
                    nikto: 'nikto',
                    zap: 'owasp zap'
                }
            },
            
            // Proteção contra injeção
            injectionProtection: {
                xssPatterns: [
                    /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
                    /on\w+="[^"]*"/gi,
                    /on\w+='[^']*'/gi,
                    /javascript:/gi,
                    /eval\(/gi,
                    /expression\(/gi
                ],
                sqlPatterns: [
                    /union\s+select/gi,
                    /select\s+from/gi,
                    /insert\s+into/gi,
                    /update\s+set/gi,
                    /delete\s+from/gi,
                    /drop\s+table/gi,
                    /truncate\s+table/gi,
                    /--\s/g,
                    /\/\*.*?\*\//g,
                    /waitfor\s+delay/gi
                ]
            },
            
            // Honeypot
            honeypot: {
                enabled: true,
                fakePaths: [
                    'admin-panel', 'db-backup', 'config.ini',
                    'secret-api', 'internal-docs'
                ],
                trapExtensions: [
                    '.bak', '.old', '.temp', '.swp', '.save'
                ]
            },
            
            // Configurações gerais
            debugMode: false,
            logLevel: 'high', // 'minimal', 'normal', 'high'
            sessionProtection: true
        };
        
        this.state = {
            requestMap: new Map(),       // Mapeamento de IP -> Dados de requisição
            bannedIPs: new Map(),       // IPs banidos e seus estágios
            trapHits: new Set(),        // IPs que caíram em honeypots
            behaviorProfiles: new Map(), // Perfis comportamentais de IPs
            securityLevel: 1,           // Nível de segurança atual (1-5)
            csrfToken: this.generateSecureToken(64),
            sessionToken: this.generateSecureToken(128)
        };
        
        this.init();
    }
    
    init() {
        this.log('Sistema de segurança paranóico inicializado', 'system');
        
        // Proteção contra console
        this.protectDevTools();
        
        // Proteção contra framing
        this.antiFraming();
        
        // Interceptação de requisições
        this.interceptNetworkRequests();
        
        // Monitoramento de eventos
        this.setupEventMonitoring();
        
        // Armadilhas honeypot
        if (this.config.honeypot.enabled) {
            this.setupHoneypots();
        }
        
        // Monitoramento contínuo
        setInterval(() => this.analyzeBehaviorPatterns(), 30000);
        setInterval(() => this.cleanupOldData(), 3600000);
        
        // Atualização dinâmica do nível de segurança
        setInterval(() => this.adjustSecurityLevel(), 60000);
    }
    
    // ================ CORE SECURITY FUNCTIONS ================
    
    interceptNetworkRequests() {
        // Intercepta fetch API
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const [input, init] = args;
            const url = typeof input === 'string' ? input : input.url;
            
            if (!this.inspectRequest(url, init)) {
                this.log(`Bloqueando requisição potencialmente maliciosa: ${url}`, 'block');
                throw new Error('Requisição bloqueada pelo sistema de segurança');
            }
            
            try {
                const response = await originalFetch(...args);
                this.inspectResponse(response.clone());
                return response;
            } catch (error) {
                this.log(`Erro em requisição: ${error.message}`, 'error');
                throw error;
            }
        };
        
        // Intercepta XHR
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url) {
            this._requestMethod = method;
            this._requestUrl = url;
            originalXHROpen.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.send = function(data) {
            if (!this.inspectRequest(this._requestUrl, { 
                method: this._requestMethod, 
                body: data 
            })) {
                this.log(`Bloqueando XHR potencialmente maliciosa: ${this._requestUrl}`, 'block');
                return;
            }
            
            this.addEventListener('load', () => {
                this.inspectResponse(this.responseText);
            });
            
            originalXHRSend.apply(this, arguments);
        };
    }
    
    inspectRequest(url, options = {}) {
        const ip = this.getClientIP();
        const path = new URL(url, location.origin).pathname.toLowerCase();
        const method = options.method || 'GET';
        
        // Verificação de IP banido
        if (this.isIPBanned(ip)) {
            this.log(`Tentativa de acesso de IP banido: ${ip}`, 'block');
            return false;
        }
        
        // Honeypot trap
        if (this.isHoneypot(path)) {
            this.trapHits.add(ip);
            this.upgradeBanLevel(ip, 'Honeypot hit');
            this.log(`Scanner detectado (honeypot): ${ip}`, 'alert');
            return false;
        }
        
        // Verificação de rate limiting
        if (!this.applyRateLimiting(ip, path, method)) {
            return false;
        }
        
        // Detecção de injeção
        if (this.detectInjection(options.body || '')) {
            this.upgradeBanLevel(ip, 'Tentativa de injeção');
            this.log(`Tentativa de injeção detectada de ${ip}`, 'alert');
            return false;
        }
        
        // Verificação CSRF para métodos modificadores
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            if (!this.verifyCSRFToken(options)) {
                this.upgradeBanLevel(ip, 'Falha CSRF');
                return false;
            }
        }
        
        // Detecção de scanner
        if (this.detectScannerActivity(path, ip)) {
            return false;
        }
        
        // Atualiza perfil comportamental
        this.updateBehaviorProfile(ip, {
            path,
            method,
            time: Date.now()
        });
        
        return true;
    }
    
    inspectResponse(response) {
        if (typeof response === 'string') {
            // Verifica vazamento de informações
            if (this.detectDataLeak(response)) {
                this.log('Possível vazamento de informação detectado na resposta', 'warn');
            }
            
            // Verifica páginas de erro
            if (this.detectErrorPage(response)) {
                this.log('Página de erro detectada na resposta', 'warn');
            }
        }
    }
    
    // ================ ADVANCED PROTECTION LAYERS ================
    
    applyRateLimiting(ip, path, method) {
        const now = Date.now();
        let ipData = this.state.requestMap.get(ip) || this.createIPData(ip);
        
        // Ajusta limites baseado no comportamento
        let limit = this.config.rateLimiting.normal;
        if (ipData.behaviorScore > 50) limit = this.config.rateLimiting.suspicious;
        if (ipData.behaviorScore > 80) limit = this.config.rateLimiting.aggressive;
        
        // Filtra requisições fora da janela de tempo
        ipData.requests = ipData.requests.filter(req => 
            (now - req.time) < this.config.rateLimiting.timeWindow);
        
        // Verifica se excedeu o limite
        if (ipData.requests.length >= limit) {
            this.upgradeBanLevel(ip, 'Excesso de requisições');
            this.log(`Rate limit excedido para ${ip} (${ipData.requests.length}/${limit})`, 'block');
            return false;
        }
        
        // Registra a nova requisição
        ipData.requests.push({
            path,
            method,
            time: now
        });
        
        this.state.requestMap.set(ip, ipData);
        return true;
    }
    
    detectScannerActivity(path, ip) {
        // Verifica paths comuns de scanners
        if (this.config.scannerDetection.commonScanPaths.some(p => path.includes(p))) {
            this.upgradeBanLevel(ip, 'Tentativa de acesso a path sensível');
            this.log(`Tentativa de acesso a path sensível: ${path}`, 'alert');
            return true;
        }
        
        // Verifica extensões suspeitas
        if (this.config.scannerDetection.suspiciousExtensions.some(ext => path.endsWith(ext))) {
            this.upgradeBanLevel(ip, 'Tentativa de acesso a extensão suspeita');
            this.log(`Tentativa de acesso a extensão suspeita: ${path}`, 'alert');
            return true;
        }
        
        // Verifica user agent suspeito
        if (this.detectSuspiciousUserAgent()) {
            this.upgradeBanLevel(ip, 'User agent de scanner');
            this.log(`User agent de scanner detectado: ${navigator.userAgent}`, 'alert');
            return true;
        }
        
        return false;
    }
    
    detectInjection(input) {
        if (!input) return false;
        
        const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
        
        // Verifica XSS
        if (this.config.injectionProtection.xssPatterns.some(p => p.test(inputStr))) {
            return true;
        }
        
        // Verifica SQL Injection
        if (this.config.injectionProtection.sqlPatterns.some(p => p.test(inputStr))) {
            return true;
        }
        
        return false;
    }
    
    // ================ BEHAVIOR ANALYSIS ================
    
    updateBehaviorProfile(ip, request) {
        let ipData = this.state.requestMap.get(ip) || this.createIPData(ip);
        
        // Atualiza score comportamental
        let behaviorScore = ipData.behaviorScore || 0;
        
        // Penaliza requisições suspeitas
        if (this.config.scannerDetection.commonScanPaths.some(p => request.path.includes(p))) {
            behaviorScore += 15;
        } else if (request.method !== 'GET') {
            behaviorScore += 5;
        } else {
            behaviorScore = Math.max(0, behaviorScore - 1);
        }
        
        // Atualiza dados do IP
        ipData.behaviorScore = Math.min(100, behaviorScore);
        ipData.lastRequest = Date.now();
        this.state.requestMap.set(ip, ipData);
    }
    
    analyzeBehaviorPatterns() {
        const now = Date.now();
        const suspiciousIPs = [];
        
        this.state.requestMap.forEach((data, ip) => {
            // IPs com comportamento suspeito
            if (data.behaviorScore > 70) {
                suspiciousIPs.push({ ip, score: data.behaviorScore });
            }
            
            // IPs inativos por mais de 24h
            if ((now - data.lastRequest) > 86400000) {
                this.state.requestMap.delete(ip);
            }
        });
        
        if (suspiciousIPs.length > 0) {
            this.log(`IPs com comportamento suspeito: ${suspiciousIPs.map(i => `${i.ip} (${i.score})`).join(', ')}`, 'monitor');
        }
    }
    
    adjustSecurityLevel() {
        // Aumenta o nível de segurança se houver muitas atividades suspeitas
        const threatLevel = this.calculateThreatLevel();
        
        if (threatLevel > 70 && this.state.securityLevel < 5) {
            this.state.securityLevel++;
            this.log(`Aumentando nível de segurança para ${this.state.securityLevel}`, 'system');
        } else if (threatLevel < 30 && this.state.securityLevel > 1) {
            this.state.securityLevel--;
            this.log(`Reduzindo nível de segurança para ${this.state.securityLevel}`, 'system');
        }
    }
    
    calculateThreatLevel() {
        let threatScore = 0;
        let totalIPs = 0;
        
        this.state.requestMap.forEach(data => {
            threatScore += data.behaviorScore;
            totalIPs++;
        });
        
        return totalIPs > 0 ? threatScore / totalIPs : 0;
    }
    
    // ================ BAN MANAGEMENT ================
    
    upgradeBanLevel(ip, reason) {
        const banData = this.state.bannedIPs.get(ip) || { level: 0, reasons: [] };
        
        // Aumenta nível de banimento
        banData.level = Math.min(3, banData.level + 1);
        banData.reasons.push(`${reason} (${new Date().toISOString()})`);
        banData.lastBanTime = Date.now();
        
        this.state.bannedIPs.set(ip, banData);
        this.log(`IP ${ip} banido no nível ${banData.level}. Razão: ${reason}`, 'block');
    }
    
    isIPBanned(ip) {
        const banData = this.state.bannedIPs.get(ip);
        if (!banData) return false;
        
        const banDuration = this.config.rateLimiting.banStages[banData.level];
        return (Date.now() - banData.lastBanTime) < banDuration;
    }
    
    // ================ HONEYPOT SYSTEM ================
    
    setupHoneypots() {
        // Cria links invisíveis para armadilhas
        if (document.body) {
            const honeypotContainer = document.createElement('div');
            honeypotContainer.style.display = 'none';
            
            this.config.honeypot.fakePaths.forEach(path => {
                const link = document.createElement('a');
                link.href = `/${path}`;
                link.textContent = 'Admin Panel';
                honeypotContainer.appendChild(link);
            });
            
            document.body.appendChild(honeypotContainer);
        }
    }
    
    isHoneypot(path) {
        const lowerPath = path.toLowerCase();
        
        // Verifica paths de honeypot
        if (this.config.honeypot.fakePaths.some(p => lowerPath.includes(p))) {
            return true;
        }
        
        // Verifica extensões de honeypot
        if (this.config.honeypot.trapExtensions.some(ext => lowerPath.endsWith(ext))) {
            return true;
        }
        
        return false;
    }
    
    // ================ UTILITY FUNCTIONS ================
    
    createIPData(ip) {
        return {
            ip,
            requests: [],
            behaviorScore: 0,
            lastRequest: Date.now(),
            firstSeen: Date.now()
        };
    }
    
    generateSecureToken(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
        const crypto = window.crypto || window.msCrypto;
        const values = new Uint32Array(length);
        
        crypto.getRandomValues(values);
        
        let token = '';
        for (let i = 0; i < length; i++) {
            token += chars[values[i] % chars.length];
        }
        
        return token;
    }
    
    verifyCSRFToken(options) {
        let token;
        
        // Verifica em headers
        if (options.headers && options.headers['X-CSRF-Token']) {
            token = options.headers['X-CSRF-Token'];
        } 
        // Verifica em FormData
        else if (options.body instanceof FormData) {
            token = options.body.get('csrf-token');
        } 
        // Verifica em URLSearchParams
        else if (typeof options.body === 'string' && options.body.includes('=')) {
            const params = new URLSearchParams(options.body);
            token = params.get('csrf-token');
        }
        
        return token === this.state.csrfToken;
    }
    
    detectSuspiciousUserAgent() {
        const ua = navigator.userAgent.toLowerCase();
        return Object.values(this.config.scannerDetection.userAgents)
            .some(tool => ua.includes(tool.toLowerCase()));
    }
    
    detectDataLeak(content) {
        const patterns = [
            /password=["']([^"']+)/gi,
            /(?:api[_-]?key|secret)="([^"]+)"/gi,
            /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})/g, // Cartões de crédito
            /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g // Emails
        ];
        
        return patterns.some(p => p.test(content));
    }
    
    detectErrorPage(content) {
        const indicators = [
            'error', 'exception', 'stack trace',
            'database error', 'syntax error',
            'access denied', 'permission denied'
        ];
        
        return indicators.some(i => content.toLowerCase().includes(i));
    }
    
    protectDevTools() {
        // Torna difícil a depuração
        Object.defineProperty(window, 'securitySystem', {
            configurable: false,
            writable: false,
            value: this
        });
        
        // Detecta abertura de DevTools
        setInterval(() => {
            const threshold = 200;
            const widthDelta = window.outerWidth - window.innerWidth;
            const heightDelta = window.outerHeight - window.innerHeight;
            
            if (widthDelta > threshold || heightDelta > threshold) {
                document.body.innerHTML = '<h1>Ferramentas de desenvolvedor não são permitidas</h1>';
                this.log('Tentativa de abertura de DevTools detectada', 'alert');
            }
        }, 1000);
    }
    
    antiFraming() {
        if (window !== window.top) {
            document.body.innerHTML = '<h1>Este site não pode ser exibido em frames</h1>';
            this.log('Tentativa de framing detectada', 'block');
        }
    }
    
    getClientIP() {
        // Em produção, implemente a lógica real para obter o IP do cliente
        // Esta é uma versão simulada para demonstração
        return [
            '192.168.', 
            Math.floor(Math.random() * 255), 
            '.', 
            Math.floor(Math.random() * 255)
        ].join('');
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[SECURITY:${type.toUpperCase()}] ${timestamp} - ${message}`;
        
        // Filtra por nível de log
        if (this.config.logLevel === 'minimal' && type !== 'alert' && type !== 'block') return;
        if (this.config.logLevel === 'normal' && type === 'info') return;
        
        // Exibe no console se não for produção
        if (this.config.debugMode || type === 'alert' || type === 'block') {
            console.log(logEntry);
        }
        
        // Aqui você enviaria para um servidor de logs em produção
        // this.sendToServer(logEntry);
    }
    
    setupEventMonitoring() {
        // Monitora eventos suspeitos no DOM
        document.addEventListener('click', (e) => {
            if (this.detectInjection(e.target.href || e.target.src || '')) {
                e.preventDefault();
                this.log('Tentativa de injeção via evento de clique', 'alert');
            }
        });
        
        // Monitora inputs
        document.addEventListener('input', (e) => {
            if (this.detectInjection(e.target.value)) {
                e.target.value = '';
                this.log('Tentativa de injeção em campo de input', 'alert');
            }
        });
    }
    
    cleanupOldData() {
        const now = Date.now();
        
        // Limpa IPs banidos expirados
        this.state.bannedIPs.forEach((data, ip) => {
            const banDuration = this.config.rateLimiting.banStages[data.level];
            if ((now - data.lastBanTime) > banDuration) {
                this.state.bannedIPs.delete(ip);
                this.log(`Banimento expirado para IP: ${ip}`, 'system');
            }
        });
        
        // Limpa armadilhas antigas
        this.state.trapHits.clear();
    }
}

// Inicialização do sistema
document.addEventListener('DOMContentLoaded', () => {
    // Cria instância global do sistema de segurança
    if (!window.paranoidSecurity) {
        window.paranoidSecurity = new ParanoidSecuritySystem();
        
        // Adiciona CSRF token a todos os forms
        document.querySelectorAll('form').forEach(form => {
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = 'csrf-token';
            tokenInput.value = window.paranoidSecurity.state.csrfToken;
            form.appendChild(tokenInput);
        });
    }
});
