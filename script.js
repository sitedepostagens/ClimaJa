window.addEventListener('DOMContentLoaded', function() {
  if (window.auth && window.firebase && window.firebase.auth) {
    window.firebase.auth().onAuthStateChanged(function(user) {
      updateAuthUI(user);
    });
  } else if (window.auth && window.onAuthStateChanged) {
    window.onAuthStateChanged(window.auth, function(user) {
      updateAuthUI(user);
    });
  }
});
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
    console.error('Erro ao salvar relato:', e.message);
    return { success: false, message: e.message };
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
    document.getElementById('current-temp').textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind-speed').textContent = `${(data.wind.speed*3.6).toFixed(1)}km/h`;
    document.getElementById('pressure').textContent = `${data.main.pressure}hPa`;
    document.getElementById('rain').textContent = data.rain
      ? `${(data.rain['1h']||0).toFixed(1)}mm`
      : '0.0mm';
    document.querySelector('.weather-icon').className = `wi wi-owm-${data.weather[0].id} weather-icon`;
    getCityName(lat, lon);
  } catch {
    showNotification('Erro ao carregar dados do clima', 'danger');
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

// Localização por texto
document.getElementById('address').addEventListener('input', () => {
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
    addr.value = sug.display_name;
    if (reportMarker) map.removeLayer(reportMarker);
    updateReportMarker(sug.lat, sug.lon);
    map.flyTo([sug.lat, sug.lon], 15);
    menu.classList.remove('show');
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

// Envio do formulário
document.getElementById('reportForm').addEventListener('submit', async e => {
  e.preventDefault();
  
  // Validação da localização
  if (!reportMarker) {
    showNotification('Selecione uma localização no mapa', 'warning');
    return;
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
    location: reportMarker.getLatLng(),
    details: currentReportType === 'pedestre' 
      ? {
         waterLevel: waterLevel.value,
         levelText: waterLevel.selectedOptions[0].text
        }
      : {
         vehicle: {
           fipeCode: selectedVehicle.codigo,
           brand: selectedVehicle.marca,
           model: selectedVehicle.nome
         },
         submersionLevel: carWaterLevel.value,
         levelText: carWaterLevel.selectedOptions[0].text
        },
    photo,
    timestamp: new Date()
  };

  addReportToMap(report);
  await saveReportToDB(report); // Usa a função de salvar no "DB"
  showNotification('Relato enviado com sucesso!', 'success');
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
  const iconHtml = `<div style="background:${getColorByLevel(report)}" class="report-marker">
                      ${ report.type === 'pedestre' ? '🚶' : '🚗' }
                    </div>`;
  const mk = L.marker([report.location.lat, report.location.lng], {
    icon: L.divIcon({ html: iconHtml })
  }).bindPopup(createPopupContent(report));
  markers.addLayer(mk);
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
  arr.forEach(r => {
    try {
      addReportToMap(r);
    } catch (e) {
      console.warn('Erro ao adicionar relato salvo:', e);
    }
  });
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

document.getElementById('vehicle-model').addEventListener('input', e => {
  clearTimeout(vehicleTimeout);
  const q = e.target.value.trim();
  const sug = document.getElementById('vehicle-suggestions');
  
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
      // Validação da localização
      if (!reportMarker) {
        showNotification('Selecione uma localização no mapa', 'warning');
        return;
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
        location: reportMarker.getLatLng(),
        details: {
          waterLevel: waterLevel.value,
          levelText: waterLevel.selectedOptions[0].text
        },
        photo,
        timestamp: new Date()
      };
      addReportToMap(report);
      await saveReportToDB(report); // Usa a função de salvar no "DB"
      showNotification('Relato enviado com sucesso!', 'success');
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

function updateAuthUI(user) {
  const cadastrarBtn = document.getElementById('cadastrar-btn');
  const entrarBtn = document.getElementById('entrar-btn');
  const perfilArea = document.getElementById('perfil-area');
  const perfilNomeArea = document.getElementById('perfil-nome-area');
  if (user) {
    if (cadastrarBtn) cadastrarBtn.style.display = 'none';
    if (entrarBtn) entrarBtn.style.display = 'none';
    if (perfilArea) perfilArea.classList.remove('d-none');
    if (perfilNomeArea) perfilNomeArea.textContent = user.displayName || user.email || 'Perfil';
    // Preencher área de perfil com dados do usuário
    const perfilDados = document.getElementById('perfil-dados');
    if (perfilDados) {
      perfilDados.innerHTML = `<strong>Email:</strong> ${user.email}<br>
        <strong>Nome:</strong> ${user.displayName || 'Não informado'}<br>
        <strong>UID:</strong> ${user.uid}`;
    }
  } else {
    if (cadastrarBtn) cadastrarBtn.style.display = '';
    if (entrarBtn) entrarBtn.style.display = '';
    if (perfilArea) perfilArea.classList.add('d-none');
    if (perfilNomeArea) perfilNomeArea.textContent = 'Perfil';
    const perfilDados = document.getElementById('perfil-dados');
    if (perfilDados) perfilDados.innerHTML = 'Carregando dados...';
  }
}

initMap();
