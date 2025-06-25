let map, markers, userMarker, reportMarker = null;
let currentTheme = localStorage.getItem('theme') || 'light';
const API_KEY = '71907d1b560a5fae3ee6d175e1d9129b';
let geocodeTimeout, vehicleTimeout;
let currentReportType = 'pedestre';
let selectedVehicle = null;
const FIPE_API = 'https://parallelum.com.br/fipe/api/v1/carros/marcas';
let vehicleCache = {};

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

    loadSavedReports();
    locateUser(true);
    preloadVehicleBrands();
  } catch (e) {
    mapContainer.innerHTML = '<div style="color:#dc2626;padding:2rem;text-align:center;font-weight:600;">Erro ao carregar o mapa. Tente recarregar a página.</div>';
    console.error('Erro ao inicializar o mapa:', e);
  }
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
  applyTheme(currentTheme);
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  document.querySelector('.theme-switcher i').className =
    theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  if (map) {
    const tiles = document.querySelector('.leaflet-layer');
    tiles.style.filter =
      theme === 'dark'
        ? 'invert(1) hue-rotate(180deg) brightness(0.9)'
        : 'none';
  }
}

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
  map.flyTo([lat, lng], 15);
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
  saveReport(report);
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

function saveReport(report) {
  const arr = JSON.parse(localStorage.getItem('floodReports') || '[]');
  arr.push(report);
  localStorage.setItem('floodReports', JSON.stringify(arr));
}

function loadSavedReports() {
  const arr = JSON.parse(localStorage.getItem('floodReports') || '[]');
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
      saveReport(report);
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

initMap();
