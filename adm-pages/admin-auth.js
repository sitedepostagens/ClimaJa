/**
 * SISTEMA DE AUTENTICAÇÃO ADMINISTRATIVA
 * Credenciais embutidas com hash seguro
 * Proteção contra brute force
 * Registro de tentativas de acesso
 */

class AdminAuthSystem {
    constructor() {
    // Substitua pelos hashes SHA-256 REAIS de '@dm1n' e '$3cur3P@$$'
    this.validCredentials = {
        username: 'a35c5f63916fff41369754c7a01cc4a82e9e3e5f1e05628791b5f5770435d6b0',
        password: '71daf6bffd48f89397498a2215a733c594101e809ce4f2e00be87a04da95f785'
    };
    this.loginAttempts = JSON.parse(localStorage.getItem('adminLoginAttempts')) || [];
    this.maxAttempts = 10;
    this.lockDuration = 5 * 60 * 1000; // 5 minutos
    this.init();
}
    
    init() {
        document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        this.updateAttemptsCounter();
    }
    
    async handleLogin() {
        const username = document.getElementById('@dm1n').value;
        const password = document.getElementById('$3cur3P@$$').value;
        
        // Verifica se está bloqueado
        if (this.isAccountLocked()) {
            this.showError('Acesso temporariamente bloqueado. Tente novamente mais tarde.');
            return;
        }
        
        // Valida campos vazios
        if (!username || !password) {
            this.showError('Por favor, preencha todos os campos.');
            return;
        }
        
        // Cria hash SHA-256 das credenciais inseridas
        const usernameHash = await this.hashString(username);
        const passwordHash = await this.hashString(password);
        
        // Verifica credenciais
        if (usernameHash === this.validCredentials.username && 
            passwordHash === this.validCredentials.password) {
            
            // Login bem-sucedido
            this.recordAttempt(true);
            localStorage.setItem('adminAuthenticated', 'true');
            
            // Redireciona para o painel após 1 segundo
            setTimeout(() => {
                window.location.href = 'security-pannel.html';
            }, 1000);
            
        } else {
            // Login falhou
            this.recordAttempt(false);
            this.showError('Credenciais inválidas. Tente novamente.');
            this.updateAttemptsCounter();
            
            // Bloqueia após muitas tentativas
            if (this.getFailedAttempts() >= this.maxAttempts) {
                this.lockAccount();
                this.showError(`Acesso bloqueado por ${this.lockDuration/60000} minutos.`);
            }
        }
    }
    
    async hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
    
    recordAttempt(success) {
        const attempt = {
            timestamp: new Date().toISOString(),
            ip: this.getClientIP(),
            userAgent: navigator.userAgent,
            success: success
        };
        
        this.loginAttempts.push(attempt);
        localStorage.setItem('adminLoginAttempts', JSON.stringify(this.loginAttempts));
    }
    
    getFailedAttempts() {
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - this.lockDuration);
        
        return this.loginAttempts.filter(attempt => {
            return !attempt.success && 
                   new Date(attempt.timestamp) > fifteenMinutesAgo;
        }).length;
    }
    
   isAccountLocked() {
    if (this.getFailedAttempts() < this.maxAttempts) return false;
    const lastAttempt = this.loginAttempts[this.loginAttempts.length - 1];
    const now = Date.now();
    const lastAttemptTime = new Date(lastAttempt.timestamp).getTime();
    if (now - lastAttemptTime > this.lockDuration) {
        this.loginAttempts = [];
        localStorage.setItem('adminLoginAttempts', JSON.stringify(this.loginAttempts));
        return false;
    }
    return true;
}
    
    lockAccount() {
        // Limpa tentativas antigas
        this.loginAttempts = this.loginAttempts.filter(attempt => {
            return new Date(attempt.timestamp) > new Date(Date.now() - this.lockDuration);
        });
        
        localStorage.setItem('adminLoginAttempts', JSON.stringify(this.loginAttempts));
    }
    
    showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    updateAttemptsCounter() {
        const attempts = this.getFailedAttempts();
        const counter = document.getElementById('attempts-counter');
        
        if (attempts > 0) {
            counter.textContent = `Tentativas falhas recentes: ${attempts}/${this.maxAttempts}`;
            counter.style.display = 'block';
        } else {
            counter.style.display = 'none';
        }
    }
    
    getClientIP() {
        // Em produção, implemente a lógica real para obter o IP
        // Esta é uma versão simulada para demonstração
        return [
            '192.168.', 
            Math.floor(Math.random() * 255), 
            '.', 
            Math.floor(Math.random() * 255)
        ].join('');
    }
}

// Inicializa o sistema de autenticação quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    new AdminAuthSystem();
});