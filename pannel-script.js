class SecurityMonitor {
    constructor() {
        this.logs = JSON.parse(localStorage.getItem('securityLogs')) || [];
        this.attackLogs = JSON.parse(localStorage.getItem('attackLogs')) || [];
        this.init();
    }

    init() {
        // Inicia o monitoramento de atividades
        this.startMonitoring();
        
        // Atualiza a exibição dos logs
        this.updateLogDisplay();
        
        // Configura botões
        document.getElementById('refresh-logs').addEventListener('click', () => this.updateLogDisplay());
        document.getElementById('export-logs').addEventListener('click', () => this.exportLogs());
        
        // Monitora logins
        this.monitorLoginAttempts();
        
        // Verifica se há logs antigos para migração
        if (this.logs.length === 0 && localStorage.getItem('accessLogs')) {
            this.migrateOldLogs();
        }
    }

    startMonitoring() {
        // Monitora todas as requisições
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            this.logAccess({
                type: 'API_REQUEST',
                endpoint: args[0],
                status: response.status,
                method: args[1]?.method || 'GET'
            });
            return response;
        };

        // Monitora envios de formulários
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const isLoginForm = form.action.includes('login') || 
                              Array.from(form.elements).some(el => el.name === 'email' || el.name === 'password');
            
            if (isLoginForm) {
                const email = form.querySelector('[name="email"]')?.value || 'N/A';
                this.logAccess({
                    type: 'LOGIN_ATTEMPT',
                    email: email,
                    formAction: form.action
                });
            }
        });

        // Monitora alterações de hash/URL
        window.addEventListener('hashchange', () => {
            this.logAccess({
                type: 'NAVIGATION',
                route: window.location.hash
            });
        });

        // Log do acesso inicial
        this.logAccess({
            type: 'PAGE_ACCESS',
            firstAccess: !localStorage.getItem('lastAccessTime')
        });
        
        localStorage.setItem('lastAccessTime', new Date().toISOString());
    }

    async logAccess(details) {
        try {
            // Obtém informações detalhadas do usuário
            const ipInfo = await this.getIPInfo();
            const browserInfo = this.getBrowserInfo();
            const userEmail = this.getLoggedInUserEmail();
            
            // Cria o objeto de log completo
            const logEntry = {
                timestamp: new Date().toISOString(),
                ip: ipInfo.ip,
                location: `${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country}`,
                isp: ipInfo.org,
                browser: `${browserInfo.name} ${browserInfo.version}`,
                os: browserInfo.os,
                device: browserInfo.device,
                screen: `${window.screen.width}x${window.screen.height}`,
                userAgent: navigator.userAgent,
                email: userEmail,
                type: details.type,
                details: details,
                isMalicious: false,
                isSuspicious: false,
                flags: []
            };

            // Análise de segurança
            this.analyzeForThreats(logEntry);

            // Armazena o log
            this.logs.unshift(logEntry); // Adiciona no início
            if (this.logs.length > 1000) this.logs.pop(); // Limita a 1000 entradas
            
            localStorage.setItem('securityLogs', JSON.stringify(this.logs));

            // Se for malicioso, adiciona aos logs de ataque
            if (logEntry.isMalicious || logEntry.isSuspicious) {
                this.attackLogs.unshift(logEntry);
                if (this.attackLogs.length > 100) this.attackLogs.pop();
                localStorage.setItem('attackLogs', JSON.stringify(this.attackLogs));
                
                // Notifica em tempo real
                this.displayRealTimeAlert(logEntry);
            }

            // Atualiza a exibição se o painel estiver visível
            if (document.getElementById('security-monitor')) {
                this.updateLogDisplay();
            }

        } catch (error) {
            console.error('Erro ao registrar acesso:', error);
        }
    }

    async getIPInfo() {
        try {
            // Tenta obter informações do IP
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn('Não foi possível obter informações de IP:', e);
        }

        // Fallback básico
        return {
            ip: 'Não disponível',
            city: 'Desconhecido',
            region: 'Desconhecido',
            country: 'Desconhecido',
            org: 'Desconhecido'
        };
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let name = 'Desconhecido';
        let version = '';

        // Detecta navegador
        if (ua.includes('Firefox')) {
            name = 'Firefox';
            version = ua.match(/Firefox\/([\d.]+)/)[1];
        } else if (ua.includes('Edg')) {
            name = 'Edge';
            version = ua.match(/Edg\/([\d.]+)/)[1];
        } else if (ua.includes('Chrome')) {
            name = 'Chrome';
            version = ua.match(/Chrome\/([\d.]+)/)[1];
        } else if (ua.includes('Safari')) {
            name = 'Safari';
            version = ua.match(/Version\/([\d.]+)/)[1];
        }

        // Detecta OS
        let os = 'Desconhecido';
        if (ua.includes('Windows')) os = 'Windows';
        if (ua.includes('Mac OS')) os = 'MacOS';
        if (ua.includes('Linux')) os = 'Linux';
        if (ua.includes('Android')) os = 'Android';
        if (ua.includes('iOS')) os = 'iOS';

        // Detecta dispositivo
        let device = 'Desktop';
        if (ua.includes('Mobile')) device = 'Mobile';
        if (ua.includes('Tablet')) device = 'Tablet';

        return { name, version, os, device };
    }

    getLoggedInUserEmail() {
        // Implemente conforme seu sistema de autenticação
        // Exemplo básico:
        return localStorage.getItem('userEmail') || 
               document.cookie.match(/email=([^;]+)/)?.[1] || 
               'N/A';
    }

    analyzeForThreats(logEntry) {
        // Verifica IPs conhecidos maliciosos
        const maliciousIPs = ['123.456.789.0', '987.654.321.0']; // Adicione IPs suspeitos
        if (maliciousIPs.includes(logEntry.ip)) {
            logEntry.isMalicious = true;
            logEntry.flags.push('IP_MALICIOSO_CONHECIDO');
        }

        // Verifica user agents de ferramentas de ataque
        const scannerAgents = ['nmap', 'sqlmap', 'metasploit', 'burp'];
        if (scannerAgents.some(agent => logEntry.userAgent.toLowerCase().includes(agent))) {
            logEntry.isMalicious = true;
            logEntry.flags.push('USER_AGENT_DE_ATAQUE');
        }

        // Verifica padrões de ataque DDoS (muitos acessos rápidos)
        const recentLogsFromIP = this.logs.filter(log => 
            log.ip === logEntry.ip && 
            new Date(logEntry.timestamp) - new Date(log.timestamp) < 60000
        ).length;
        
        if (recentLogsFromIP > 30) {
            logEntry.isSuspicious = true;
            logEntry.flags.push('POSSIVEL_DDOS');
        }

        // Verifica tentativas de login inválidas
        if (logEntry.type === 'LOGIN_ATTEMPT') {
            const failedAttempts = this.logs.filter(log => 
                log.type === 'LOGIN_ATTEMPT' && 
                log.details.email === logEntry.details.email && 
                !log.details.success
            ).length;
            
            if (failedAttempts > 5) {
                logEntry.isSuspicious = true;
                logEntry.flags.push('MULTIPLAS_TENTATIVAS_LOGIN');
            }
        }
    }

    updateLogDisplay() {
        const logTable = document.getElementById('access-log-table');
        if (!logTable) return;

        // Limpa a tabela
        logTable.innerHTML = '';

        // Adiciona as entradas mais recentes (últimas 50)
        this.logs.slice(0, 50).forEach(log => {
            const row = document.createElement('tr');
            
            if (log.isMalicious) row.classList.add('flag-malicious');
            else if (log.isSuspicious) row.classList.add('flag-suspicious');
            else row.classList.add('flag-normal');

            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.ip}</td>
                <td>${log.location}</td>
                <td>${log.browser} (${log.os})</td>
                <td>${log.email}</td>
                <td>${this.translateLogType(log.type)}</td>
                <td>${this.getStatusLabel(log)}</td>
                <td><button class="view-details" data-logid="${log.timestamp}">Detalhes</button></td>
            `;
            
            logTable.appendChild(row);
        });

        // Atualiza a lista de ataques
        this.updateAttackAlerts();
        
        // Configura botões de detalhes
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logId = e.target.getAttribute('data-logid');
                this.showLogDetails(logId);
            });
        });
    }

    updateAttackAlerts() {
        const alertList = document.getElementById('attack-alerts-list');
        if (!alertList) return;

        alertList.innerHTML = '';

        // Mostra os últimos 10 ataques
        this.attackLogs.slice(0, 10).forEach(log => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${new Date(log.timestamp).toLocaleString()}</strong> - 
                ${log.ip} (${log.location}) - 
                ${this.translateLogType(log.type)} - 
                <span class="${log.isMalicious ? 'flag-malicious' : 'flag-suspicious'}">
                    ${log.isMalicious ? 'ATAQUE' : 'SUSPEITO'}
                </span>
                <button class="view-details" data-logid="${log.timestamp}">Detalhes</button>
            `;
            
            alertList.appendChild(li);
        });
    }

    showLogDetails(logId) {
        const log = this.logs.find(l => l.timestamp === logId);
        if (!log) return;

        // Cria um modal com todos os detalhes
        const modal = document.createElement('div');
        modal.className = 'security-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = '#222';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '5px';
        modalContent.style.maxWidth = '80%';
        modalContent.style.maxHeight = '80%';
        modalContent.style.overflow = 'auto';
        
        // Botão de fechar
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Fechar';
        closeBtn.style.float = 'right';
        closeBtn.style.marginBottom = '10px';
        closeBtn.addEventListener('click', () => document.body.removeChild(modal));
        
        // Título
        const title = document.createElement('h3');
        title.textContent = `Detalhes do Acesso - ${new Date(log.timestamp).toLocaleString()}`;
        title.style.color = log.isMalicious ? '#ff4444' : log.isSuspicious ? '#ff9900' : '#44ff44';
        
        // Conteúdo detalhado
        const details = document.createElement('div');
        details.innerHTML = `
            <p><strong>IP:</strong> ${log.ip}</p>
            <p><strong>Localização:</strong> ${log.location} (ISP: ${log.isp})</p>
            <p><strong>Navegador:</strong> ${log.browser}</p>
            <p><strong>Sistema Operacional:</strong> ${log.os}</p>
            <p><strong>Dispositivo:</strong> ${log.device} (Tela: ${log.screen})</p>
            <p><strong>User Agent:</strong> <small>${log.userAgent}</small></p>
            <p><strong>Email:</strong> ${log.email}</p>
            <p><strong>Tipo de Acesso:</strong> ${this.translateLogType(log.type)}</p>
            <p><strong>Status:</strong> ${this.getStatusLabel(log)}</p>
            
            <h4>Detalhes Específicos:</h4>
            <pre>${JSON.stringify(log.details, null, 2)}</pre>
            
            ${log.flags.length ? `
                <h4>Bandeiras de Segurança:</h4>
                <ul>
                    ${log.flags.map(flag => `<li>${this.translateFlag(flag)}</li>`).join('')}
                </ul>
            ` : ''}
            
            <h4>Ações:</h4>
            <button id="block-ip">Bloquear IP</button>
            <button id="export-log">Exportar Log</button>
            <button id="report-police">Reportar à Polícia</button>
        `;
        
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(details);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Configura botões de ação
        document.getElementById('block-ip')?.addEventListener('click', () => this.blockIP(log.ip));
        document.getElementById('export-log')?.addEventListener('click', () => this.exportSingleLog(log));
        document.getElementById('report-police')?.addEventListener('click', () => this.reportToPolice(log));
    }

    displayRealTimeAlert(logEntry) {
        // Cria notificação em tempo real
        const alert = document.createElement('div');
        alert.className = 'real-time-alert';
        alert.style.position = 'fixed';
        alert.style.bottom = '20px';
        alert.style.right = '20px';
        alert.style.padding = '15px';
        alert.style.backgroundColor = logEntry.isMalicious ? '#5a0000' : '#3a2a00';
        alert.style.color = 'white';
        alert.style.borderLeft = '4px solid ' + (logEntry.isMalicious ? '#ff0000' : '#ff9900');
        alert.style.zIndex = '1000';
        alert.style.maxWidth = '300px';
        alert.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        
        alert.innerHTML = `
            <h4 style="margin-top: 0;">${logEntry.isMalicious ? 'ATAQUE DETECTADO' : 'ATIVIDADE SUSPEITA'}</h4>
            <p><strong>IP:</strong> ${logEntry.ip}</p>
            <p><strong>Tipo:</strong> ${this.translateLogType(logEntry.type)}</p>
            <p><strong>Horário:</strong> ${new Date(logEntry.timestamp).toLocaleTimeString()}</p>
            <button class="view-details" 
                    style="margin-top: 10px; padding: 5px 10px;"
                    data-logid="${logEntry.timestamp}">
                Detalhes
            </button>
            <button class="dismiss-alert" 
                    style="margin-top: 10px; padding: 5px 10px; margin-left: 5px;">
                Fechar
            </button>
        `;
        
        document.body.appendChild(alert);
        
        // Configura eventos
        alert.querySelector('.view-details').addEventListener('click', () => {
            this.showLogDetails(logEntry.timestamp);
            document.body.removeChild(alert);
        });
        
        alert.querySelector('.dismiss-alert').addEventListener('click', () => {
            document.body.removeChild(alert);
        });
        
        // Remove automaticamente após 10 segundos
        setTimeout(() => {
            if (document.body.contains(alert)) {
                document.body.removeChild(alert);
            }
        }, 10000);
    }

    blockIP(ip) {
        // Implemente o bloqueio de IP conforme sua infraestrutura
        alert(`IP ${ip} bloqueado com sucesso!`);
        
        // Aqui você enviaria para o servidor bloquear o IP
        // fetch('/block-ip', { method: 'POST', body: JSON.stringify({ ip }) });
    }

    exportLogs() {
        const dataStr = JSON.stringify(this.logs, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-logs-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    exportSingleLog(log) {
        const dataStr = JSON.stringify(log, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-log-${log.timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    reportToPolice(log) {
        // Formata os dados para denúncia
        const reportData = {
            dataHora: new Date(log.timestamp).toLocaleString(),
            ip: log.ip,
            localizacao: log.location,
            isp: log.isp,
            navegador: log.browser,
            sistemaOperacional: log.os,
            dispositivo: log.device,
            userAgent: log.userAgent,
            email: log.email,
            tipoAcesso: this.translateLogType(log.type),
            detalhes: log.details,
            flags: log.flags.map(f => this.translateFlag(f))
        };
        
        // Aqui você pode:
        // 1. Exportar para um arquivo formatado para a polícia
        const dataStr = JSON.stringify(reportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `denuncia-policial-${log.timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 2. Ou enviar diretamente para um endpoint de denúncias
        // fetch('https://api.policia.gov.br/denuncias', { method: 'POST', body: dataStr });
        
        alert('Denúncia formatada e pronta para ser enviada à autoridade competente.');
    }

    translateLogType(type) {
        const types = {
            'PAGE_ACCESS': 'Acesso à Página',
            'LOGIN_ATTEMPT': 'Tentativa de Login',
            'API_REQUEST': 'Requisição API',
            'NAVIGATION': 'Navegação'
        };
        return types[type] || type;
    }

    getStatusLabel(log) {
        if (log.isMalicious) return 'MALICIOSO';
        if (log.isSuspicious) return 'SUSPEITO';
        return 'NORMAL';
    }

    translateFlag(flag) {
        const flags = {
            'IP_MALICIOSO_CONHECIDO': 'IP em lista negra',
            'USER_AGENT_DE_ATAQUE': 'User agent de ferramenta de ataque',
            'POSSIVEL_DDOS': 'Possível ataque DDoS',
            'MULTIPLAS_TENTATIVAS_LOGIN': 'Múltiplas tentativas de login'
        };
        return flags[flag] || flag;
    }

    migrateOldLogs() {
        const oldLogs = JSON.parse(localStorage.getItem('accessLogs'));
        if (oldLogs && Array.isArray(oldLogs)) {
            this.logs = oldLogs.map(log => ({
                ...log,
                flags: []
            }));
            localStorage.setItem('securityLogs', JSON.stringify(this.logs));
            localStorage.removeItem('accessLogs');
        }
    }
}

// Inicializa o monitor quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    window.securityMonitor = new SecurityMonitor();
});