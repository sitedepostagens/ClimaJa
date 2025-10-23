window.addEventListener('DOMContentLoaded', async function() {
  // Inicializa Firebase Auth localmente
  const firebaseAppModule = await import('https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js');
  const firebaseAuthModule = await import('https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js');
  const firebaseConfig = {
    apiKey: "AIzaSyCMTSLhey7MMtXy_xV2oSuPe18Tl7sLucY",
    authDomain: "asenha-project-site.firebaseapp.com",
    databaseURL: "https://asenha-project-site-default-rtdb.firebaseio.com",
    projectId: "asenha-project-site",
    storageBucket: "asenha-project-site.appspot.com",
    messagingSenderId: "393532682519",
    appId: "1:393532682519:web:d16a441d5428c676128752",
    measurementId: "G-38CG9H4XV8"
  };
  let app;
  if (firebaseAppModule.getApps && firebaseAppModule.getApps().length) {
    app = firebaseAppModule.getApps()[0];
  } else {
    app = firebaseAppModule.initializeApp(firebaseConfig);
  }
  const auth = firebaseAuthModule.getAuth(app);
  window.auth = auth; // <-- Torna global para logout
  // Listener de autenticação
  firebaseAuthModule.onAuthStateChanged(auth, function(user) {
    updateAuthUI(user);
    handleProfileAndRelato(user);
  });
  // Expor signOut globalmente para logout
  window.signOut = firebaseAuthModule.signOut;
});

function handleProfileAndRelato(user) {
  // Área de perfil
  var perfilArea = document.getElementById('perfil-area');
  if (perfilArea) {
    if (user && user.email) {
      perfilArea.classList.remove('d-none');
    } else {
      perfilArea.classList.add('d-none');
    }
  }
  // Área de relato
  var relatoArea = document.getElementById('relato-area');
  var relatoLoginMsg = document.getElementById('relato-login-msg');
  if (relatoArea && relatoLoginMsg) {
    if (user && user.email) {
      relatoArea.classList.remove('d-none');
      relatoLoginMsg.classList.add('d-none');
    } else {
      relatoArea.classList.add('d-none');
      relatoLoginMsg.classList.remove('d-none');
    }
  }
}
window.addEventListener('DOMContentLoaded', function() {
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (window.auth && window.signOut) {
        window.signOut(window.auth).then(function() {
          showNotification('Logout realizado com sucesso!', 'success');
          setTimeout(function(){ window.location.reload(); }, 800);
        }).catch(function(){
          alert('Erro ao sair. Tente novamente.');
        });
      } else {
        alert('Erro ao sair. Tente novamente.');
      }
    });
  }
});
let map, markers, userMarker, reportMarker = null;
let currentTheme = 'light';
const API_KEY = '71907d1b560a5fae3ee6d175e1d9129b';
let geocodeTimeout, vehicleTimeout;
let currentReportType = 'pedestre';
let selectedVehicle = null;
const FIPE_API = 'https://parallelum.com.br/fipe/api/v1/carros/marcas';
let vehicleCache = {};

// --- Firebase Realtime Database ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { child, get, getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMTSLhey7MMtXy_xV2oSuPe18Tl7sLucY",
  authDomain: "asenha-project-site.firebaseapp.com",
  projectId: "asenha-project-site",
  storageBucket: "asenha-project-site.appspot.com",
  messagingSenderId: "393532682519",
  appId: "1:393532682519:web:d16a441d5428c676128752",
  measurementId: "G-38CG9H4XV8"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function saveReportToDB(report) {
  try {
    await set(ref(db, 'relatos/' + Date.now()), report);
    console.log('Relato salvo no Realtime Database:', report);
    return { success: true, message: 'Relato salvo com sucesso!' };
  } catch (e) {
    console.error('Erro ao salvar relato:', e);
    // Trata erro de permissão especificamente
    const msg = (e && e.code && e.code === 'PERMISSION_DENIED') || (e && e.message && e.message.toLowerCase().includes('permission_denied'))
      ? 'Permissão negada: verifique as regras do Realtime Database.'
      : (e && e.message) || String(e);
    return { success: false, message: msg };
  }
}

async function loadReportsFromDB() {
  try {
    const snapshot = await get(child(ref(db), 'relatos'));
    if (snapshot.exists()) {
      console.log('Relatos carregados do Realtime Database:', snapshot.val());
      return snapshot.val();
    } else {
      console.log('Nenhum relato encontrado.');
      return {};
    }
  } catch (e) {
    console.error('Erro ao carregar relatos:', e.message);
    return {};
  }
}
// -------------------------------------------------------------------------


function initMap() {
  // Só inicializa se o elemento #map existir e estiver visível
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.warn('Elemento #map não encontrado.');
    return;
  }
  // Corrige erro de múltiplas inicializações
  if (mapContainer._leaflet_id) {
    mapContainer._leaflet_id = null;
    mapContainer.innerHTML = '';
  }
  try {
    map = L.map('map', { center: [-15.788, -47.879], zoom: 4, renderer: L.canvas() });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markers = L.markerClusterGroup();
    map.addLayer(markers);

    locateUser(true);
    preloadVehicleBrands();
    // Chame a função para carregar temas e relatos do "banco de dados" ao iniciar
    loadInitialData();
    // Torna o mapa acessível ao código legado que usa window.meuMapa
    try {
      window.meuMapa = map;
    } catch (e) {}
    // Exponha bridges globais para compatibilidade com o código inline em index.html
    try {
      window.inicializarMapaLeaflet = initMap;
      window.pedirLocalizacaoMapa = function() { return locateUser(true); };
      window.centralizarMapaNaLocalizacao = function() {
        if (!window.userLocation || !map) return;
        if (window.userMarker) {
          window.userMarker.setLatLng([window.userLocation.lat, window.userLocation.lon]);
        } else {
          window.userMarker = L.marker([window.userLocation.lat, window.userLocation.lon], {icon: L.icon({iconUrl: 'user-marker.png', iconSize: [32,32]})}).addTo(map);
        }
        map.setView([window.userLocation.lat, window.userLocation.lon], 15);
      };
    } catch (e) {
      console.warn('Não foi possível expor bridges do mapa:', e);
    }
  } catch (e) {
    mapContainer.innerHTML = '<div style="color:#dc2626;padding:2rem;text-align:center;font-weight:600;">Erro ao carregar o mapa. Tente recarregar a página.</div>';
    console.error('Erro ao inicializar o mapa:', e);
  }
}

async function loadInitialData() {
    // Carrega o tema
    currentTheme = await loadThemeFromDB();
    applyTheme(currentTheme);

    // Carrega os relatos salvos
    await loadSavedReports();
}

// Carrega tema da Realtime Database em /config/theme (se existir). Retorna 'light' por padrão.
async function loadThemeFromDB() {
  try {
    if (!db) return 'light';
    const snapshot = await get(child(ref(db), 'config/theme'));
    if (snapshot && snapshot.exists && snapshot.exists()) {
      const val = snapshot.val();
      if (typeof val === 'string' && (val === 'light' || val === 'dark')) return val;
    }
  } catch (e) {
    console.warn('Não foi possível carregar tema do DB, usando padrão:', e && e.message ? e.message : e);
  }
  return 'light';
}


// Funções de alternância de tema removidas

function locateUser(initial = false) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        updateUserPosition(latitude, longitude);
        getWeatherData(latitude, longitude);
      },
      () => {
        if (initial) showNotification('Ative a localização para melhor precisão', 'warning');
      },
      { enableHighAccuracy: true }
    );
  }
}

function updateUserPosition(lat, lng) {
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker([lat, lng], {
    icon: L.icon({ iconUrl: 'user-marker.png', iconSize: [40,40], iconAnchor: [20,40], popupAnchor: [0,-40] })
  }).addTo(map);
  map.flyTo([lat, lng], 17); // Zoom maior para precisão
}

function addUserMarker(lat, lng, accuracy) {
  if (window.userMarker) {
    map.removeLayer(window.userMarker);
  }
  window.userMarker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: 'user-marker.png', // Use um ícone personalizado se quiser
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -38]
    })
  }).addTo(map);
  // Círculo de precisão
  if (window.userAccuracyCircle) {
    map.removeLayer(window.userAccuracyCircle);
  }
  window.userAccuracyCircle = L.circle([lat, lng], {
    radius: accuracy,
    color: '#2563eb',
    fillColor: '#38bdf8',
    fillOpacity: 0.2
  }).addTo(map);
  map.setView([lat, lng], 17); // Zoom maior para precisão
}

async function getWeatherData(lat, lon) {
  try {
    const resp = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`
    );
    const data = await resp.json();
    if (!data || !data.main || typeof data.main.temp === 'undefined') {
      throw new Error('Dados de clima inválidos');
    }
    document.getElementById('current-temp').textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind-speed').textContent = `${(data.wind.speed*3.6).toFixed(1)}km/h`;
    document.getElementById('pressure').textContent = `${data.main.pressure}hPa`;
    document.getElementById('rain').textContent = data.rain
      ? `${(data.rain['1h']||0).toFixed(1)}mm`
      : '0.0mm';
    document.querySelector('.weather-icon').className = `wi wi-owm-${data.weather[0].id} weather-icon`;
    getCityName(lat, lon);
    // Limpa alerta se sucesso
    const alerta = document.getElementById('clima-alerta-localizacao');
    if (alerta) alerta.style.display = 'none';
  } catch (err) {
    console.error('[Clima] Erro ao carregar dados do clima:', err);
    showNotification('Erro ao carregar dados do clima', 'danger');
    const alerta = document.getElementById('clima-alerta-localizacao');
    if (alerta) alerta.style.display = 'block';
  }
}

async function getCityName(lat, lon) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const j = await resp.json();
    const city = j.address.city || j.address.town || j.address.village || j.address.county;
    document.getElementById('city-name').textContent = city;
  } catch (e) {
    console.error(e);
  }
}

// Toggle Forms
function toggleReportType(type, btn) {
  currentReportType = type;
  document.querySelectorAll('.btn-outline-primary').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('[id$="-form"]').forEach(el => el.classList.add('d-none'));
  document.getElementById(`${type}-form`).classList.remove('d-none');
}


// Flag para evitar reabertura do menu de sugestões após seleção
let addressSelectedBySuggestion = false;
// Localização por texto
document.getElementById('address').addEventListener('input', () => {
  if (addressSelectedBySuggestion) {
    addressSelectedBySuggestion = false;
    document.getElementById('address-suggestions').classList.remove('show');
    return;
  }
  clearTimeout(geocodeTimeout);
  if (document.getElementById('address').value.length < 3) {
    document.getElementById('address-suggestions').classList.remove('show');
    return;
  }
  geocodeTimeout = setTimeout(searchLocation, 500);
});

async function searchLocation(sug = null) {
  const addr = document.getElementById('address');
  const menu = document.getElementById('address-suggestions');
  if (sug) {
    addressSelectedBySuggestion = true;
    addr.value = sug.display_name;
    // Preenche latitude e longitude nos campos hidden
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    if (latInput) latInput.value = sug.lat;
    if (lonInput) lonInput.value = sug.lon;
    if (reportMarker) map.removeLayer(reportMarker);
    updateReportMarker(sug.lat, sug.lon);
    map.flyTo([sug.lat, sug.lon], 15);
    // Força esconder o menu de sugestões
    menu.classList.remove('show');
    menu.innerHTML = '';
    // Remove foco do campo para fechar o dropdown em mobile
    addr.blur();
    return;
  }
  if (!addr.value.trim()) return;
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr.value)}&limit=5`
    );
    const arr = await resp.json();
    menu.innerHTML = '';
    arr.forEach(r => {
      const div = document.createElement('div');
      div.className = 'dropdown-item';
      div.innerHTML = `<div>${r.display_name.split(',')[0]}</div><small>${r.display_name}</small>`;
      div.onclick = () => searchLocation({ lat: parseFloat(r.lat), lon: parseFloat(r.lon), display_name: r.display_name });
      menu.appendChild(div);
    });
    menu.classList[arr.length? 'add':'remove']('show');
  } catch {
    showNotification('Erro ao buscar localização', 'danger');
  }
}

// Marcador de relatório
function updateReportMarker(lat, lng) {
  if (reportMarker) map.removeLayer(reportMarker);
  reportMarker = L.marker([lat,lng], {
    draggable: true,
    icon: L.divIcon({ className:'report-marker', html:'<i class="fas fa-map-pin"></i>', iconSize:[40,40] })
  }).addTo(map);
  reportMarker.on('dragend', async () => {
    const { lat:la, lng:lo } = reportMarker.getLatLng();
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}`);
      const j = await r.json();
      document.getElementById('address').value = j.display_name;
    } catch {
      document.getElementById('address').value = `${la.toFixed(4)}, ${lo.toFixed(4)}`;
    }
  });
}

// Envio do formulário (aceita envio sem selecionar marcador no mapa)
document.getElementById('reportForm').addEventListener('submit', async e => {
  e.preventDefault();

  // Tentar obter coordenadas: marcador > campos hidden > geocodificar pelo endereço > null
  let lat = null, lon = null;
  if (typeof reportMarker !== 'undefined' && reportMarker && reportMarker.getLatLng) {
    const ll = reportMarker.getLatLng();
    lat = ll.lat; lon = ll.lng;
  } else {
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    if (latInput && lonInput && latInput.value && lonInput.value) {
      lat = parseFloat(latInput.value);
      lon = parseFloat(lonInput.value);
    } else {
      const addrInput = document.getElementById('address');
      if (addrInput && addrInput.value) {
        try {
          const coords = await geocodeAddress(addrInput.value);
          if (coords) { lat = coords.lat; lon = coords.lon; }
        } catch (err) {
          console.warn('Geocoding failed', err);
        }
      }
    }
  }

  let valid = true;
  const waterLevel = document.getElementById('water-level');
  const carWaterLevel = document.getElementById('car-water-level');

  if (currentReportType === 'pedestre') {
    if (!waterLevel.value) {
      showNotification('Selecione o nível da água', 'warning');
      valid = false;
    }
  } else {
    if (!selectedVehicle) {
      showNotification('Selecione um veículo válido', 'warning');
      valid = false;
    }
    if (!carWaterLevel.value) {
      showNotification('Selecione o nível de submersão', 'warning');
      valid = false;
    }
  }

  if (!valid) return;

  const photo = await readPhoto();
  const report = {
    type: currentReportType,
    location: (lat !== null && lon !== null) ? { lat, lng: lon } : null,
    details: currentReportType === 'pedestre' 
      ? {
         waterLevel: waterLevel.value,
         levelText: waterLevel.selectedOptions[0].text
        }
      : {
         vehicle: selectedVehicle ? { fipeCode: selectedVehicle.codigo, brand: selectedVehicle.marca, model: selectedVehicle.nome } : null,
         submersionLevel: carWaterLevel.value,
         levelText: carWaterLevel.selectedOptions[0].text
         },
    photo,
    timestamp: new Date(),
    address: document.getElementById('address') ? document.getElementById('address').value : ''
  };

  addReportToMap(report);
  const result = await saveReportToDB(report);
  if (result && result.success) {
    showNotification('Relato enviado com sucesso!', 'success');
  } else {
    console.error('Erro ao salvar relato:', result && result.message);
    showNotification('Erro ao salvar relato: ' + (result && result.message ? result.message : 'Erro desconhecido'), 'danger');
  }
  document.getElementById('reportForm').reset();
  selectedVehicle = null;
});

function readPhoto() {
  const file = document.getElementById('flood-photo').files[0];
  return file
    ? new Promise(res => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(file);
      })
    : Promise.resolve(null);
}

function addReportToMap(report) {
  // Normaliza coordenadas (aceita {lat,lng} ou {lat,lon})
  let lat = null, lng = null;
  if (report && report.location) {
    if (typeof report.location.lat !== 'undefined') lat = report.location.lat;
    if (typeof report.location.lng !== 'undefined') lng = report.location.lng;
    if ((lat === null || typeof lat === 'undefined') && typeof report.location.lon !== 'undefined') lat = report.location.lat || report.location.latitude || null;
    // try lon variants
    if ((lng === null || typeof lng === 'undefined') && typeof report.location.lon !== 'undefined') lng = report.location.lon;
    if ((lat === null || typeof lat === 'undefined') && typeof report.location.latitude !== 'undefined') lat = report.location.latitude;
    if ((lng === null || typeof lng === 'undefined') && typeof report.location.longitude !== 'undefined') lng = report.location.longitude;
  }

  const color = getColorByLevel(report) || '#2563EB';
  const iconHtml = `<div style="background:${color};display:flex;align-items:center;justify-content:center;color:white;border-radius:50%;width:40px;height:40px;font-size:16px;" class="report-marker-inline">${ report.type === 'pedestre' ? '🚶' : '🚗' }</div>`;

  // Garante que o layer de markers exista
  if (typeof markers === 'undefined' || !markers) {
    try {
      markers = L.markerClusterGroup();
      if (map && !map.hasLayer(markers)) map.addLayer(markers);
    } catch (e) {
      console.warn('Não foi possível inicializar markers cluster:', e);
    }
  }

  if (lat !== null && typeof lat !== 'undefined' && lng !== null && typeof lng !== 'undefined') {
    const mk = L.marker([lat, lng], {
      icon: L.divIcon({ html: iconHtml, className: '' })
    }).bindPopup(createPopupContent(report));
    if (markers && markers.addLayer) markers.addLayer(mk);
  } else {
    // Sem coordenadas: adiciona apenas card de relato (não marcador)
    console.warn('Relato sem coordenadas, não será adicionado ao mapa.');
  }
}

function getColorByLevel(report) {
  const levels = {
    pedestre: { '0.2':'#10B981','0.5':'#F59E0B','1.0':'#EF4444','1.5':'#DC2626','2.0':'#7C3AED' },
    motorista: { '25':'#10B981','50':'#F59E0B','75':'#EF4444','100':'#DC2626' }
  };
  const key = report.type === 'pedestre'
    ? report.details.waterLevel
    : report.details.submersionLevel;
  return levels[report.type][key];
}

function createPopupContent(report) {
  let vehicleHTML = '';
  if (report.type === 'motorista' && report.details.vehicle) {
    vehicleHTML = `
      <div class="mb-2">
        <strong>Veículo:</strong> ${report.details.vehicle.brand} ${report.details.vehicle.model}
      </div>`;
  }
  return `
    <div style="min-width:250px">
      <h6>${report.type === 'pedestre' ? 'Relato de Pedestre' : 'Relato de Motorista'}</h6>
      <div class="mb-2">
        <strong>Nível:</strong> ${report.details.levelText}
      </div>
      ${vehicleHTML}
      ${report.photo ? `<img src="${report.photo}" class="img-fluid mt-2 mb-2">`: ''}
      <small class="text-muted">${new Date(report.timestamp).toLocaleString()}</small>
    </div>`;
}

async function loadSavedReports() {
  const arr = await loadReportsFromDB(); // Usa a função de carregar do "DB"
  const relatosDiv = document.getElementById('relatos-publicos');
  if (relatosDiv) relatosDiv.innerHTML = '';
  arr.forEach(r => {
    try {
      addReportToMap(r);
      if (relatosDiv) {
        const card = document.createElement('div');
        card.className = 'relato-card';
        card.innerHTML = `
          <div class="relato-titulo">${r.type === 'pedestre' ? '🚶' : '🚗'} ${r.type === 'pedestre' ? 'Relato de Pedestre' : 'Relato de Motorista'}</div>
          <div class="relato-nivel">${r.details.levelText || '--'}</div>
          ${r.details.vehicle ? `<div class='relato-endereco'><b>Veículo:</b> ${r.details.vehicle.brand} ${r.details.vehicle.model}</div>` : ''}
          <div class="relato-endereco"><b>Endereço:</b> ${r.address || (r.location ? `${r.location.lat.toFixed(4)}, ${r.location.lng.toFixed(4)}` : '--')}</div>
          <div class="relato-descricao"><b>Descrição:</b> ${r.details.descricao || ''}</div>
          <div class="relato-data">${r.timestamp ? new Date(r.timestamp).toLocaleString('pt-BR') : ''}</div>
        `;
        relatosDiv.appendChild(card);
      }
    } catch (e) {
      console.warn('Erro ao adicionar relato salvo:', e);
    }
  });
}

// Exponha operações importantes para o código inline em index.html
try {
  window.saveReportToDB = saveReportToDB;
  window.carregarRelatosPublicos = loadSavedReports;
  window.loadThemeFromDB = loadThemeFromDB;
} catch (e) {
  console.warn('Não foi possível expor funções ao window:', e);
}

// Pré-carrega as marcas de veículos
async function preloadVehicleBrands() {
  try {
    const brandsResp = await fetch(FIPE_API);
    const brands = await brandsResp.json();
    
    // Armazena as marcas para uso posterior
    vehicleCache.brands = brands;
    
    // Pré-carrega os modelos das 5 marcas mais populares
    const popularBrands = brands.slice(0, 5);
    for (const brand of popularBrands) {
      try {
        const modelsResp = await fetch(`${FIPE_API}/${brand.codigo}/modelos`);
        const modelData = await modelsResp.json();
        
        // Armazena os modelos em cache
        if (!vehicleCache.models) vehicleCache.models = {};
        vehicleCache.models[brand.codigo] = modelData.modelos;
      } catch (e) {
        console.error(`Erro ao pré-carregar modelos para ${brand.nome}:`, e);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar marcas de veículos:', error);
  }
}

// Busca de veículos com cache e paralelismo
async function searchVehicles(query) {
  try {
    // Se já temos marcas em cache, usa elas
    const brands = vehicleCache.brands || await (await fetch(FIPE_API)).json();
    
    // Se não temos modelos em cache, cria a estrutura
    if (!vehicleCache.models) vehicleCache.models = {};
    
    const lowerQuery = query.toLowerCase();
    let models = [];
    
    // Usa Promise.all para buscar em paralelo
    const brandPromises = brands.map(async brand => {
      // Verifica se já temos os modelos em cache
      if (!vehicleCache.models[brand.codigo]) {
        try {
          const modelsResp = await fetch(`${FIPE_API}/${brand.codigo}/modelos`);
          const modelData = await modelsResp.json();
          vehicleCache.models[brand.codigo] = modelData.modelos;
        } catch (e) {
          console.error(`Erro ao buscar modelos para ${brand.nome}:`, e);
          return [];
        }
      }
      
      // Filtra os modelos que correspondem à consulta
      return vehicleCache.models[brand.codigo]
        .filter(m => m.nome.toLowerCase().includes(lowerQuery))
        .map(m => ({
          ...m,
          marca: brand.nome,
          codigoMarca: brand.codigo
        }));
    });
    
    // Espera todas as buscas terminarem
    const results = await Promise.all(brandPromises);
    models = results.flat();
    
    // Ordena por relevância (modelos que começam com a query primeiro)
    models.sort((a, b) => {
      const aStarts = a.nome.toLowerCase().startsWith(lowerQuery);
      const bStarts = b.nome.toLowerCase().startsWith(lowerQuery);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
    
    return models.slice(0, 15); // Limita a 15 resultados
  } catch (error) {
    console.error('Erro geral na busca de veículos:', error);
    showNotification('Erro ao buscar modelos de veículos', 'danger');
    return [];
  }
}

const vehicleModelInput = document.getElementById('vehicle-model');
if (vehicleModelInput) {
  vehicleModelInput.addEventListener('input', e => {
    clearTimeout(vehicleTimeout);
    const q = e.target.value.trim();
    const sug = document.getElementById('vehicle-suggestions');
    if (!sug) return;
    if (q.length < 3) {
      sug.style.display = 'none';
      return;
    }
    // Mostra indicador de carregamento
    sug.innerHTML = '<div class="vehicle-item">Buscando veículos...</div>';
    sug.style.display = 'block';
    vehicleTimeout = setTimeout(async () => {
      try {
        const res = await searchVehicles(q);
        sug.innerHTML = '';
        if (!res.length) {
          sug.innerHTML = '<div class="vehicle-item">Nenhum veículo encontrado</div>';
          return;
        }
        res.forEach(v => {
          const d = document.createElement('div');
          d.className = 'vehicle-item';
          d.textContent = `${v.marca} ${v.nome}`;
          d.onclick = () => selectVehicle(v);
          sug.appendChild(d);
        });
      } catch (error) {
        sug.innerHTML = '<div class="vehicle-item">Erro na busca</div>';
      }
    }, 300);
  });
}

function selectVehicle(v) {
  selectedVehicle = v;
  document.getElementById('vehicle-model').value = `${v.marca} ${v.nome}`;
  document.getElementById('vehicle-suggestions').style.display = 'none';
}

function showNotification(msg, type) {
  const a = document.createElement('div');
  a.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
  a.textContent = msg;
  document.body.appendChild(a);
  setTimeout(() => a.remove(), 3000);
}

// Função para exibir o formulário de relato na área correta
function showRelatoArea() {
  const area = document.getElementById('relato-area');
  if (!area) return;
  // Se já existir um formulário estático (inserido no HTML), não sobrescrever
  if (document.getElementById('reportForm') || document.getElementById('reportFormMotorista')) {
    return;
  }
  area.innerHTML = `
    <form id="reportForm">
      <div class="mb-3">
        <label for="address" class="form-label">Endereço</label>
        <input type="text" class="form-control" id="address" placeholder="Digite o endereço ou selecione no mapa" required autocomplete="off">
        <div id="address-suggestions" class="dropdown-menu" style="width:100%"></div>
      </div>
      <div class="mb-3">
        <label for="water-level" class="form-label">Nível da Água</label>
        <select class="form-select" id="water-level" required>
          <option value="">Selecione</option>
          <option value="0.2">Até o tornozelo</option>
          <option value="0.5">Até o joelho</option>
          <option value="1.0">Até a cintura</option>
          <option value="1.5">Acima da cintura</option>
        </select>
      </div>
      <div class="mb-3">
        <label for="flood-photo" class="form-label">Foto (opcional)</label>
        <input type="file" class="form-control" id="flood-photo" accept="image/*">
      </div>
      <button type="submit" class="btn btn-modern">Enviar Relato</button>
    </form>
  `;

  // Adiciona listeners após renderizar o formulário
  const addressInput = document.getElementById('address');
  const addressSuggestions = document.getElementById('address-suggestions');
  if (addressInput) {
    addressInput.addEventListener('input', () => {
      clearTimeout(geocodeTimeout);
      if (addressInput.value.length < 3) {
        addressSuggestions.classList.remove('show');
        return;
      }
      geocodeTimeout = setTimeout(searchLocation, 500);
    });
  }
  if (addressSuggestions) {
    addressSuggestions.onclick = function(e) {
      e.stopPropagation();
    };
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('#address') && !e.target.closest('#address-suggestions'))
      addressSuggestions.classList.remove('show');
  });

  // Envio do formulário
  const reportForm = document.getElementById('reportForm');
  if (reportForm) {
    reportForm.addEventListener('submit', async e => {
      e.preventDefault();
      // Tentar obter coordenadas: marcador > campos hidden > geocodificar pelo endereço > null
      let lat = null, lon = null;
      if (typeof reportMarker !== 'undefined' && reportMarker && reportMarker.getLatLng) {
        const ll = reportMarker.getLatLng();
        lat = ll.lat; lon = ll.lng;
      } else {
        const latInput = document.getElementById('latitude');
        const lonInput = document.getElementById('longitude');
        if (latInput && lonInput && latInput.value && lonInput.value) {
          lat = parseFloat(latInput.value);
          lon = parseFloat(lonInput.value);
        } else {
          const addrInput = document.getElementById('address');
          if (addrInput && addrInput.value) {
            try {
              const coords = await geocodeAddress(addrInput.value);
              if (coords) { lat = coords.lat; lon = coords.lon; }
            } catch (err) {
              console.warn('Geocoding failed', err);
            }
          }
        }
      }

      let valid = true;
      const waterLevel = document.getElementById('water-level');
      if (!waterLevel.value) {
        showNotification('Selecione o nível da água', 'warning');
        valid = false;
      }
      if (!valid) return;
      const photo = await readPhoto();
      const report = {
        type: 'pedestre',
        location: (lat !== null && lon !== null) ? { lat, lon } : null,
        details: {
          waterLevel: waterLevel.value,
          levelText: waterLevel.selectedOptions[0].text
        },
        photo,
        timestamp: new Date()
      };
      addReportToMap(report);
      const result = await saveReportToDB(report);
      if (result && result.success) {
        showNotification('Relato enviado com sucesso!', 'success');
      } else {
        console.error('Erro ao salvar relato:', result && result.message);
        showNotification('Erro ao salvar relato: ' + (result && result.message ? result.message : 'Erro desconhecido'), 'danger');
      }
      reportForm.reset();
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Exibir o formulário ao acessar a aba Relatar
  const relatarTab = document.querySelector('a[data-bs-toggle="pill"][href="#relatar"]');
  if (relatarTab) {
    relatarTab.addEventListener('shown.bs.tab', showRelatoArea);
  }
  // Exibir o formulário ao carregar a página se a aba Relatar já estiver ativa
  const relatarPane = document.querySelector('.tab-pane#relatar');
  if (relatarPane && relatarPane.classList.contains('show')) {
    showRelatoArea();
  }
});

function setupProfileButtons() {
  const relatosBtn = document.getElementById('perfil-relatos');
  const editarBtn = document.getElementById('perfil-editar');
  const ajudaBtn = document.getElementById('perfil-ajuda');

  if (relatosBtn) {
    relatosBtn.onclick = function(e) {
      e.preventDefault();
      showNotification('Funcionalidade "Meus Relatos" em desenvolvimento!', 'info');
      // Aqui você pode abrir um modal ou navegar para uma página de relatos do usuário
    };
  }
  if (editarBtn) {
    editarBtn.onclick = function(e) {
      e.preventDefault();
      showNotification('Funcionalidade "Editar Perfil" em breve!', 'info');
      // Aqui você pode abrir um modal de edição de perfil
    };
  }
  if (ajudaBtn) {
    ajudaBtn.onclick = function(e) {
      e.preventDefault();
      alert('Para dúvidas, envie um email para oclimaja@hotmail.com ou acesse a aba Sobre Nós.');
    };
  }
}

// Reverse geocoding simples usando Photon
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (data && data.features && data.features.length > 0) {
      const p = data.features[0].properties;
      return `${p.name || ''}${p.street ? ', ' + p.street : ''}${p.city ? ', ' + p.city : ''}`.replace(/^, /, '');
    }
  } catch (e) {
    console.error('reverseGeocode error', e);
  }
  return '';
}

// Geocoding simples por endereço usando Photon
async function geocodeAddress(address) {
  try {
    const res = await fetch('https://photon.komoot.io/api/?q=' + encodeURIComponent(address) + '&limit=1');
    const data = await res.json();
    if (data && data.features && data.features.length > 0) {
      const c = data.features[0].geometry.coordinates; // [lon, lat]
      return { lat: c[1], lon: c[0] };
    }
  } catch (e) {
    console.error('geocodeAddress error', e);
  }
  return null;
}

async function fillAddressFromCoords(type) {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const addr = await reverseGeocode(lat, lon);
    if (type === 'motorista') {
      const a = document.getElementById('address-motorista');
      const latI = document.getElementById('latitude-motorista');
      const lonI = document.getElementById('longitude-motorista');
      if (a && !a.value) a.value = addr;
      if (latI) latI.value = lat;
      if (lonI) lonI.value = lon;
    } else {
      const a = document.getElementById('address');
      const latI = document.getElementById('latitude');
      const lonI = document.getElementById('longitude');
      if (a && !a.value) a.value = addr;
      if (latI) latI.value = lat;
      if (lonI) lonI.value = lon;
    }
  }, err => {
    showNotification('Não foi possível obter sua localização: ' + (err.message || ''), 'warning');
  });
}

// Listeners para botões de usar localização
document.addEventListener('click', function(e) {
  if (e.target && (e.target.id === 'use-my-location' || e.target.closest('#use-my-location'))) {
    fillAddressFromCoords('pedestre');
  }
  if (e.target && (e.target.id === 'use-my-location-motorista' || e.target.closest('#use-my-location-motorista'))) {
    fillAddressFromCoords('motorista');
  }
});

function updateAuthUI(user) {
  var cadastrarBtn = document.getElementById('cadastrar-btn');
  var entrarBtn = document.getElementById('entrar-btn');
  var perfilArea = document.getElementById('perfil-area');
  var perfilEmail = document.getElementById('perfil-email');
  var perfilNome = document.getElementById('perfil-nome');
  var perfilNomeArea = document.getElementById('perfil-nome-area');
  var logoutBtn = document.getElementById('logout-btn');

  if (user && user.email) {
    if (cadastrarBtn) cadastrarBtn.style.display = 'none';
    if (entrarBtn) entrarBtn.style.display = 'none';
    if (perfilArea) {
      perfilArea.classList.remove('d-none');
      perfilArea.style.display = '';
    }
    if (perfilEmail) perfilEmail.textContent = user.email;
    if (perfilNome) perfilNome.textContent = user.displayName || 'Não informado';
    if (perfilNomeArea) perfilNomeArea.textContent = user.displayName || user.email || 'Perfil';
    if (logoutBtn) {
      logoutBtn.style.display = '';
      logoutBtn.removeAttribute('hidden');
      logoutBtn.onclick = function(e) {
        e.preventDefault();
        if (window.auth && window.signOut) {
          window.signOut(window.auth).then(function() {
            showNotification('Logout realizado com sucesso!', 'success');
            setTimeout(function(){ window.location.reload(); }, 800);
          }).catch(function(){
            alert('Erro ao sair. Tente novamente.');
          });
        } else {
          alert('Erro ao sair. Tente novamente.');
        }
      };
    }
    setupProfileButtons();
  } else {
    if (cadastrarBtn) cadastrarBtn.style.display = '';
    if (entrarBtn) entrarBtn.style.display = '';
    if (perfilArea) {
      perfilArea.classList.add('d-none');
      perfilArea.style.display = '';
    }
    if (perfilEmail) perfilEmail.textContent = '-';
    if (perfilNome) perfilNome.textContent = '-';
    if (perfilNomeArea) perfilNomeArea.textContent = 'Perfil';
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
      logoutBtn.setAttribute('hidden', 'true');
      logoutBtn.onclick = null;
    }
  }
}

// Garante que updateAuthUI é chamada ao carregar a página
window.addEventListener('DOMContentLoaded', function() {
  if (window.auth && window.firebase && window.firebase.auth) {
    window.firebase.auth().onAuthStateChanged(function(user) {
      updateAuthUI(user);
    });
  } else if (window.auth && window.onAuthStateChanged) {
    window.onAuthStateChanged(window.auth, function(user) {
      updateAuthUI(user);
    });
  } else {
    // Fallback: tenta buscar usuário do localStorage
    var user = null;
    try {
      user = JSON.parse(localStorage.getItem('user')) || null;
    } catch {}
    updateAuthUI(user);
  }
});

initMap();

// Função para buscar clima pela localização
function buscarClimaPorLocalizacao() {
  const alerta = document.getElementById('clima-alerta-localizacao');
  if (!navigator.geolocation) {
    if (alerta) {
      alerta.style.display = 'block';
      alerta.textContent = 'Seu navegador não suporta geolocalização.';
    }
    return;
  }
  navigator.geolocation.getCurrentPosition(function(pos) {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    if (alerta) alerta.style.display = 'none';
    console.log('[Clima] Localização obtida:', lat, lon);
    getWeatherData(lat, lon);
  }, function(err) {
    if (alerta) alerta.style.display = 'block';
    console.warn('[Clima] Erro ao obter localização:', err);
  }, { enableHighAccuracy: true, timeout: 10000 });
}

// Solicita localização ao abrir a aba Clima
// Listener único para abrir a aba Clima e buscar clima
document.addEventListener('DOMContentLoaded', function() {
  let climaCarregado = false;
  document.querySelectorAll('a[data-bs-toggle="pill"]').forEach(function(tab) {
    tab.addEventListener('shown.bs.tab', function (e) {
      const href = e.target.getAttribute('href');
      if (href === '#clima' && !climaCarregado) {
        buscarClimaPorLocalizacao();
        climaCarregado = true;
      }
    });
  });
  // Se a aba Clima já estiver ativa ao carregar a página, busca imediatamente
  const climaPane = document.querySelector('.tab-pane#clima');
  if (climaPane && climaPane.classList.contains('show') && !climaCarregado) {
    buscarClimaPorLocalizacao();
    climaCarregado = true;
  }
});

// Solicita localização ao abrir a aba Clima
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('a[data-bs-toggle="pill"]').forEach(function(tab) {
    tab.addEventListener('shown.bs.tab', function (e) {
      const href = e.target.getAttribute('href');
      if (href === '#clima') {
        const alerta = document.getElementById('clima-alerta-localizacao');
        if (!navigator.geolocation) {
          if (alerta) {
            alerta.style.display = 'block';
            alerta.textContent = 'Seu navegador não suporta geolocalização.';
          }
          return;
        }
        navigator.geolocation.getCurrentPosition(function(pos) {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          if (alerta) alerta.style.display = 'none';
          getWeatherData(lat, lon);
        }, function() {
          if (alerta) alerta.style.display = 'block';
        }, { enableHighAccuracy: true, timeout: 10000 });
      }
    });
  });
});

// Ouvir quando a aba 'Clima' for aberta e pedir localização
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('a[data-bs-toggle="pill"]').forEach(function(tab) {
    tab.addEventListener('shown.bs.tab', function (e) {
      const href = e.target.getAttribute('href');
      if (href === '#clima') {
        const alerta = document.getElementById('clima-alerta-localizacao');
        const fallback = document.getElementById('clima-fallback');
        if (!navigator.geolocation) {
          if (alerta) { alerta.style.display = 'block'; alerta.textContent = 'Seu navegador não suporta geolocalização.'; }
          if (fallback) fallback.style.display = 'block';
          return;
        }
        navigator.geolocation.getCurrentPosition(function(pos) {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          if (alerta) alerta.style.display = 'none';
          if (fallback) fallback.style.display = 'none';
          try { getWeatherData(lat, lon); } catch (e) { console.error(e); }
        }, function(err) {
          if (alerta) alerta.style.display = 'block';
          if (fallback) fallback.style.display = 'block';
          console.warn('Erro ao obter localização:', err);
        }, { enableHighAccuracy: true, timeout: 10000 });
      }
    });
  });

  // Handlers do fallback
  const buscarBtn = document.getElementById('clima-buscar-cidade');
  const cidadeInput = document.getElementById('clima-cidade-input');
  const tentarBtn = document.getElementById('clima-tentar-novamente');
  const suggestions = document.getElementById('clima-cidade-suggestions');

  if (buscarBtn && cidadeInput) {
    buscarBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      const q = cidadeInput.value.trim();
      if (!q) return showNotification('Digite o nome da cidade', 'warning');
      try {
        buscarBtn.disabled = true;
        buscarBtn.textContent = 'Buscando...';
        const resp = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q) + '&limit=1');
        const arr = await resp.json();
        if (!arr || !arr.length) return showNotification('Cidade não encontrada', 'warning');
        const loc = arr[0];
        if (loc && loc.lat && loc.lon) {
          getWeatherData(parseFloat(loc.lat), parseFloat(loc.lon));
        }
      } catch (e) {
        console.error(e);
        showNotification('Erro ao buscar cidade', 'danger');
      } finally {
        buscarBtn.disabled = false;
        buscarBtn.textContent = 'Buscar';
      }
    });
  }

  if (tentarBtn) {
    tentarBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const alerta = document.getElementById('clima-alerta-localizacao'); if (alerta) alerta.style.display = 'none';
      const fallback = document.getElementById('clima-fallback'); if (fallback) fallback.style.display = 'none';
      if (!navigator.geolocation) return showNotification('Seu navegador não suporta geolocalização', 'warning');
      navigator.geolocation.getCurrentPosition(function(pos) { getWeatherData(pos.coords.latitude, pos.coords.longitude); }, function(err) {
        const alerta = document.getElementById('clima-alerta-localizacao'); if (alerta) alerta.style.display = 'block';
        const fallback = document.getElementById('clima-fallback'); if (fallback) fallback.style.display = 'block';
      }, { enableHighAccuracy: true, timeout: 10000 });
    });
  }
});
