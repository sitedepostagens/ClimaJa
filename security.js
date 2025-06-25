// Configurações de segurança
const securityConfig = {
    maxRequestsPerMinute: 100, // Limite de requisições por minuto por IP
    nmapDetectionThreshold: 5, // Número de portas acessadas para considerar como nmap
    blockedIPs: [], // Lista de IPs bloqueados
    requestLog: {} // Registro de requisições por IP
};

// Elementos da UI
const securityStatus = document.getElementById('security-status');
const statusText = document.getElementById('status-text');
const attackWarning = document.getElementById('attack-warning');

// Função para verificar segurança
function checkSecurity() {
    // Simulação de verificação de segurança
    const securityLevel = Math.random(); // Simula estado de segurança
    
    if (securityLevel > 0.9) {
        // Estado de perigo (simulado)
        securityStatus.className = 'status-danger';
        statusText.textContent = 'Perigo - Atividade suspeita detectada!';
        attackWarning.classList.remove('hidden');
        logSecurityEvent('Alerta: Possível ataque detectado!');
    } else if (securityLevel > 0.6) {
        // Estado de alerta (simulado)
        securityStatus.className = 'status-warning';
        statusText.textContent = 'Alerta - Monitorando atividades suspeitas';
        attackWarning.classList.add('hidden');
    } else {
        // Estado seguro (simulado)
        securityStatus.className = 'status-good';
        statusText.textContent = 'Seguro - Nenhuma ameaça detectada';
        attackWarning.classList.add('hidden');
    }
}

// Função para registrar eventos de segurança
function logSecurityEvent(message) {
    const timestamp = new Date().toISOString();
    console.log(`[SECURITY] ${timestamp} - ${message}`);
    
    // Aqui você enviaria para um servidor de logs em produção
    // fetch('/log', { method: 'POST', body: JSON.stringify({message}) });
}

// Simulação de monitoramento de requisições (seria no servidor na prática)
function monitorRequest(ip) {
    const now = Date.now();
    
    // Inicializa registro para o IP se não existir
    if (!securityConfig.requestLog[ip]) {
        securityConfig.requestLog[ip] = {
            count: 0,
            lastRequest: now,
            portsAccessed: []
        };
    }
    
    const ipRecord = securityConfig.requestLog[ip];
    ipRecord.count++;
    
    // Verifica se excedeu o limite de requisições
    if (ipRecord.count > securityConfig.maxRequestsPerMinute) {
        logSecurityEvent(`Possível ataque DoS do IP: ${ip} - ${ipRecord.count} requisições/min`);
        securityConfig.blockedIPs.push(ip);
        return false; // Bloqueia requisição
    }
    
    // Atualiza último acesso
    ipRecord.lastRequest = now;
    return true;
}

// Simulação de detecção de Nmap (seria no servidor)
function detectNmapScan(ip, port) {
    const ipRecord = securityConfig.requestLog[ip];
    if (!ipRecord) return false;
    
    ipRecord.portsAccessed.push(port);
    
    // Verifica se acessou muitas portas diferentes (como nmap faria)
    const uniquePorts = new Set(ipRecord.portsAccessed).size;
    if (uniquePorts >= securityConfig.nmapDetectionThreshold) {
        logSecurityEvent(`Possível varredura Nmap do IP: ${ip} - ${uniquePorts} portas acessadas`);
        securityConfig.blockedIPs.push(ip);
        return true;
    }
    
    return false;
}

// Simula o IP do cliente (em produção, pegaria do cabeçalho da requisição)
function getClientIP() {
    // Esta é uma simulação - em produção, use o IP real da requisição
    return '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255);
}

// Verificação periódica de segurança
setInterval(checkSecurity, 5000);

// Monitora todas as requisições (simulação)
document.addEventListener('DOMContentLoaded', () => {
    const clientIP = getClientIP();
    monitorRequest(clientIP);
    
    // Simula acesso a portas (como nmap faria)
    if (Math.random() > 0.8) {
        for (let i = 0; i < 10; i++) {
            detectNmapScan(clientIP, Math.floor(Math.random() * 10000));
        }
    }
    
    // Verificação inicial
    checkSecurity();
});
