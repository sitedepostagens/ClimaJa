# ClimaJá!

## Visão Geral do Projeto

O **ClimaJá!** é uma plataforma web colaborativa inovadora, desenvolvida para monitoramento meteorológico em tempo real e para facilitar o relato de ocorrências de alagamentos. Seu principal objetivo é fornecer informações climáticas atualizadas e permitir que a comunidade compartilhe dados cruciais sobre inundações, promovendo assim a segurança e a prevenção em áreas urbanas. A aplicação visa capacitar os usuários com dados precisos para tomadas de decisão informadas, contribuindo para uma cidade mais resiliente e preparada para eventos climáticos extremos.

## Funcionalidades Principais

O ClimaJá! oferece um conjunto robusto de funcionalidades projetadas para engajar a comunidade e fornecer informações valiosas:

### 1. Monitoramento Meteorológico Detalhado

A plataforma exibe dados climáticos em tempo real para a localização atual do usuário, incluindo:

*   **Temperatura:** Leitura precisa da temperatura ambiente.
*   **Umidade:** Nível de umidade do ar.
*   **Velocidade do Vento:** Informações sobre a intensidade do vento.
*   **Pressão Atmosférica:** Dados de pressão para análise climática.
*   **Precipitação:** Registro de volume de chuva, se aplicável.

Esses dados são obtidos através da integração com a API do OpenWeatherMap, garantindo informações atualizadas e confiáveis.

### 2. Relato Colaborativo de Alagamentos

Uma das funcionalidades centrais do ClimaJá! é a capacidade dos usuários de relatarem ocorrências de alagamentos. O sistema permite dois tipos de relatos:

*   **Relato de Pedestre:** Permite que o usuário informe o nível da água (até o tornozelo, joelho, cintura, ou acima da cintura) em uma área alagada.
*   **Relato de Motorista:** Oferece a opção de detalhar o nível de submersão de veículos (25%, 50%, 75%, 100%) e selecionar o modelo do veículo afetado, utilizando dados da API FIPE para busca de modelos.

Os relatos podem incluir uma foto da situação, fornecendo um contexto visual importante para outros usuários.

### 3. Mapa Interativo de Ocorrências

Todos os relatos de alagamento são visualizados em um mapa interativo, desenvolvido com a biblioteca Leaflet e o plugin MarkerCluster. Isso permite que os usuários identifiquem rapidamente as áreas afetadas e a gravidade dos alagamentos. O mapa também exibe a localização atual do usuário, facilitando a navegação e o entendimento do contexto geográfico.

### 4. Autenticação de Usuários

O ClimaJá! inclui um sistema de autenticação completo, permitindo que os usuários se cadastrem e façam login na plataforma. Isso garante a rastreabilidade dos relatos e a personalização da experiência do usuário, como a visualização de seus próprios relatos e informações de perfil.

### 5. Temas Personalizáveis

A aplicação oferece a opção de alternar entre temas claro e escuro, proporcionando uma experiência visual agradável e adaptável às preferências do usuário.

### 6. Sistema de Segurança Avançado

O projeto incorpora um sistema de segurança robusto, denominado "Paranoid Security System", que opera com defesa multicamadas para proteger a aplicação contra diversas ameaças. Este sistema inclui:

*   **Rate Limiting Adaptativo:** Monitora e limita o número de requisições para prevenir ataques de negação de serviço (DoS).
*   **Detecção de Scanners:** Identifica e bloqueia atividades de varredura de portas, diretórios e tentativas de acesso a paths sensíveis ou extensões suspeitas.
*   **Proteção contra Injeção:** Defende contra ataques de Cross-Site Scripting (XSS) e SQL Injection, sanitizando entradas e validando padrões.
*   **Honeypot:** Utiliza armadilhas invisíveis para detectar e banir IPs maliciosos que tentam acessar paths falsos ou sensíveis.
*   **Análise Comportamental:** Monitora o comportamento dos IPs para identificar padrões suspeitos e ajustar o nível de segurança dinamicamente.
*   **Gerenciamento de Banimentos:** Implementa um sistema de banimento progressivo para IPs que exibem comportamento malicioso.
*   **Proteção CSRF:** Inclui mecanismos para prevenir ataques de Cross-Site Request Forgery.

Este sistema de segurança é implementado em `paranoid-security.js` e atua na interceptação de requisições de rede (fetch e XHR) para inspecionar e bloquear atividades suspeitas antes que atinjam o backend.

## Tecnologias Utilizadas

O ClimaJá! é construído com uma combinação de tecnologias web modernas para garantir uma experiência de usuário fluida e segura:

*   **Frontend:**
    *   **HTML5:** Estrutura da aplicação.
    *   **CSS3:** Estilização e responsividade, com suporte a temas claro/escuro.
    *   **JavaScript:** Lógica de frontend, interatividade e consumo de APIs.
    *   **Bootstrap 5:** Framework CSS para componentes e layout responsivo.
    *   **Leaflet.js:** Biblioteca JavaScript para mapas interativos.
    *   **Leaflet.markercluster:** Plugin para agrupamento de marcadores no mapa.
    *   **Font Awesome:** Ícones para a interface do usuário.
    *   **Weather Icons:** Ícones específicos para condições meteorológicas.

*   **APIs Externas:**
    *   **OpenWeatherMap API:** Para dados meteorológicos em tempo real.
    *   **Nominatim OpenStreetMap API:** Para geocodificação reversa (obtenção de nome de cidade a partir de coordenadas) e busca de localização por texto.
    *   **API FIPE (parallelum.com.br):** Para busca de marcas e modelos de veículos.

## Contribuição

O ClimaJá! foi desenvolvido pela Escola Técnica Estadual Ginásio Pernambucano. Contribuições são bem-vindas para aprimorar a plataforma e expandir suas funcionalidades. Para contribuir, por favor, entre em contato através do email fornecido no rodapé da aplicação.

## Contato


## APP hospedado e gerenciado no WebintoAPP

app apk gerenciado e ospedado no servidor da webintoapp no link `https://www.webintoapp.com/author/dashboard`
Para dúvidas, sugestões ou suporte, entre em contato com a equipe do ClimaJá! através do email: `oclimaja@hotmail.com`.
