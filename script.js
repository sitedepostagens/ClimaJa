let map, markers, userMarker, reportMarker = null;
let currentTheme = localStorage.getItem('theme') || 'light';
const API_KEY = '71907d1b560a5fae3ee6d175e1d9129b';
let geocodeTimeout, vehicleTimeout;
let currentReportType = 'pedestre';
let selectedVehicle = null;
const FIPE_API = 'https://parallelum.com.br/fipe/api/v1/carros/marcas';

function initMap() {
  map = L.map('map', { center: [-15.788, -47.879], zoom: 4, renderer: L.canvas() });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markers = L.markerClusterGroup();
  map.addLayer(markers);

  applyTheme(currentTheme);
  loadSavedReports();
  locateUser(true);
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
  if (!reportMarker) {
    showNotification('Selecione uma localização no mapa', 'warning');
    return;
  }
  let valid = true;
  if (currentReportType==='pedestre') {
    if (!document.getElementById('water-level').value) {
      showNotification('Selecione o nível da água', 'warning');
      valid = false;
    }
  } else {
    if (!selectedVehicle || !document.getElementById('vehicle-year').value) {
      showNotification('Selecione um veículo válido', 'warning');
      valid = false;
    }
    if (!document.getElementById('car-water-level').value) {
      showNotification('Selecione o nível de submersão', 'warning');
      valid = false;
    }
  }
  if (!valid) return;

  const photo = await readPhoto();
  const report = {
    type: currentReportType,
    location: reportMarker.getLatLng(),
    details: currentReportType==='pedestre' 
      ? {
         waterLevel: document.getElementById('water-level').value,
         levelText: document.getElementById('water-level').selectedOptions[0].text
        }
      : {
         vehicle: {
           fipeCode: selectedVehicle.codigo,
           brand: selectedVehicle.marca,
           model: selectedVehicle.nome,
           year: document.getElementById('vehicle-year').selectedOptions[0].text
         },
         submersionLevel: document.getElementById('car-water-level').value,
         levelText: document.getElementById('car-water-level').selectedOptions[0].text
        },
    photo,
    timestamp: new Date()
  };

  addReportToMap(report);
  saveReport(report);
  showNotification('Relato enviado com sucesso!', 'success');
  document.getElementById('reportForm').reset();
  selectedVehicle = null;
  document.getElementById('vehicle-year').innerHTML = '<option value="">Selecione o ano</option>';
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
                      ${ report.type==='pedestre' ? '🚶' : '🚗' }
                    </div>`;
  const mk = L.marker([report.location.lat, report.location.lng], {
    icon: L.divIcon({ html: iconHtml })
  }).bindPopup(createPopupContent(report));
  markers.addLayer(mk);
}

function getColorByLevel(report) {
  const levels = {
    pedestre: { '0.2':'#10B981','0.5':'#F59E0B','1.0':'#EF4444','1.5':'#DC2626','2.0':'#7C3AED' },
    motorista:{ '25':'#10B981','50':'#F59E0B','75':'#EF4444','100':'#DC2626' }
  };
  const key = report.type==='pedestre'
    ? report.details.waterLevel
    : report.details.submersionLevel;
  return levels[report.type][key];
}

// Cria o conteúdo do popup sem quebrar em pedestre
function createPopupContent(report) {
  let vehicleHTML = '';
  if (report.type==='motorista' && report.details.vehicle) {
    vehicleHTML = `
      <div class="mb-2">
        <strong>Veículo:</strong> ${report.details.vehicle.brand} ${report.details.vehicle.model}<br>
        <strong>Ano:</strong> ${report.details.vehicle.year}
      </div>`;
  }
  return `
    <div style="min-width:250px">
      <h6>${report.type==='pedestre' ? 'Relato de Pedestre' : 'Relato de Motorista'}</h6>
      <div class="mb-2">
        <strong>Nível:</strong> ${report.details.levelText}
      </div>
      ${vehicleHTML}
      ${report.photo ? `<img src="${report.photo}" class="img-fluid mt-2 mb-2">`: ''}
      <small class="text-muted">${new Date(report.timestamp).toLocaleString()}</small>
    </div>`;
}

// Salva e recarrega com proteção
function saveReport(report) {
  const arr = JSON.parse(localStorage.getItem('floodReports')||'[]');
  arr.push(report);
  localStorage.setItem('floodReports', JSON.stringify(arr));
}

function loadSavedReports() {
  const arr = JSON.parse(localStorage.getItem('floodReports')||'[]');
  arr.forEach(r => {
    try {
      addReportToMap(r);
    } catch (e) {
      console.warn('Erro ao adicionar relato salvo:', e);
    }
  });
}

async function searchVehicles(query) {
  try {
    const brands = await (await fetch(FIPE_API)).json();
    let models = [];
    for (let b of brands.slice(0,3)) {
      const mm = await (await fetch(`${FIPE_API}/${b.codigo}/modelos`)).json();
      models.push(...mm.modelos.filter(m => m.nome.toLowerCase().includes(query.toLowerCase()))
        .map(m => ({...m, marca:b.nome, codigoMarca:b.codigo})));
    }
    return models.slice(0,5);
  } catch {
    showNotification('Erro ao buscar modelos de veículos','danger');
    return [];
  }
}

document.getElementById('vehicle-model').addEventListener('input', e => {
  clearTimeout(vehicleTimeout);
  const q = e.target.value.trim();
  const sug = document.getElementById('vehicle-suggestions');
  if (q.length<3) return sug.style.setProperty('display','none');
  vehicleTimeout = setTimeout(async()=>{
    const res = await searchVehicles(q);
    sug.innerHTML = '';
    if (!res.length) return sug.style.setProperty('display','none');
    res.forEach(v=>{
      const d = document.createElement('div');
      d.className = 'vehicle-item';
      d.textContent = `${v.marca} ${v.nome}`;
      d.onclick = ()=>selectVehicle(v);
      sug.appendChild(d);
    });
    sug.style.setProperty('display','block');
  },500);
});

async function selectVehicle(v) {
  selectedVehicle = v;
  document.getElementById('vehicle-model').value = `${v.marca} ${v.nome}`;
  document.getElementById('vehicle-suggestions').style.display = 'none';
  const years = await (await fetch(`${FIPE_API}/${v.codigoMarca}/modelos/${v.codigo}/anos`)).json();
  const sel = document.getElementById('vehicle-year');
  sel.innerHTML = '<option value="">Selecione o ano</option>';
  years.forEach(y=>{
    const o = document.createElement('option');
    o.value = y.codigo;
    o.textContent = y.nome;
    sel.appendChild(o);
  });
}

function showNotification(msg, type) {
  const a = document.createElement('div');
  a.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
  a.textContent = msg;
  document.body.appendChild(a);
  setTimeout(()=>a.remove(),3000);
}

document.addEventListener('click', e => {
  if (!e.target.closest('#address') && !e.target.closest('#address-suggestions'))
    document.getElementById('address-suggestions').classList.remove('show');
  if (!e.target.closest('#vehicle-model') && !e.target.closest('#vehicle-suggestions'))
    document.getElementById('vehicle-suggestions').style.display = 'none';
});

initMap();
