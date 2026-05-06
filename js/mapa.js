const MAPTILER_KEY = 'u9koDxJJfDNTc50I8NTs';
const ESTILO_MAPA = 'streets-v2'; 

let mapa;
let camadaLojas = L.layerGroup();
// Posição inicial: Av. Nossa Senhora da Saúde
let posicaoUsuario = L.latLng(-19.8656, -43.9108); 
let marcadorVoce;

function iniciarMapa() {
    mapa = L.map('meuMapa').setView(posicaoUsuario, 15);
    
    L.tileLayer(`https://api.maptiler.com/maps/${ESTILO_MAPA}/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
        attribution: '&copy; MapTiler &copy; OpenStreetMap',
        crossOrigin: true
    }).addTo(mapa);
    
    camadaLojas.addTo(mapa);
    atualizarMarcadorUsuario("Você está aqui!");
}

function atualizarMarcadorUsuario(texto) {
    if (marcadorVoce) mapa.removeLayer(marcadorVoce);
    marcadorVoce = L.circleMarker(posicaoUsuario, { radius: 10, color: 'white', fillColor: '#ff0000', fillOpacity: 1 })
        .addTo(mapa)
        .bindPopup(texto)
        .openPopup();
}

// ==========================================
// FUNÇÃO 1: Mudar a localização (Viajar pelo mapa)
// ==========================================
async function mudarLocalizacao(endereco) {
    if (!endereco) return;
    
    const containerLista = document.querySelector('.store-list');
    containerLista.innerHTML = '<li class="store-item">Viajando pelo mapa...</li>';

    try {
        const response = await fetch(`http://localhost:5125/api/buscar-endereco?endereco=${encodeURIComponent(endereco)}`);
        if (!response.ok) throw new Error();
        
        const local = await response.json();
        posicaoUsuario = L.latLng(local.lat, local.lng);
        
        mapa.flyTo(posicaoUsuario, 15);
        atualizarMarcadorUsuario(`Ponto de Busca: ${local.nomeFormatado}`);
        
        camadaLojas.clearLayers();
        containerLista.innerHTML = '<li class="store-item">Local encontrado! Agora digite a loja que procura.</li>';
    } catch {
        containerLista.innerHTML = '<li class="store-item" style="color:red;">Local não encontrado em Minas. Tente "Cidade, Bairro".</li>';
    }
}

// ==========================================
// FUNÇÃO 2: Buscar lojas na posição atual
// ==========================================
async function buscarLojas(termo) {
    if (!termo) return;
    
    const containerLista = document.querySelector('.store-list');
    containerLista.innerHTML = '<li class="store-item">Buscando na base de dados...</li>';

    try {
        const url = `http://localhost:5125/api/buscar-lojas?termo=${encodeURIComponent(termo)}&lat=${posicaoUsuario.lat}&lng=${posicaoUsuario.lng}`;
        const response = await fetch(url);
        const lojas = await response.json();

        camadaLojas.clearLayers();
        containerLista.innerHTML = '';
        
        if (lojas.length === 0) {
            containerLista.innerHTML = '<li class="store-item">Nenhuma loja encontrada nesta área.</li>';
            return;
        }

        let bounds = [posicaoUsuario];

        lojas.forEach(l => {
            const pino = L.marker([l.lat, l.lng]).bindPopup(`<b>${l.nome}</b><br><small>${l.endereco}</small>`);
            camadaLojas.addLayer(pino);
            bounds.push([l.lat, l.lng]);
            
            const li = document.createElement('li');
            li.className = 'store-item';
            // Usa o estilo que você já tinha no CSS
            li.innerHTML = `
                <div>
                    <strong>${l.nome}</strong>
                    <small style="display:block; color:gray; margin-top:5px;">📍 ${l.distancia.toFixed(2)} km de distância</small>
                </div>
            `;
            
            // Quando clica no item da lista, o mapa voa até ele
            li.style.cursor = 'pointer';
            li.onclick = () => {
                mapa.flyTo([l.lat, l.lng], 18);
                pino.openPopup();
            };
            
            containerLista.appendChild(li);
        });
        
        mapa.fitBounds(bounds, { padding: [50, 50] });
    } catch {
        containerLista.innerHTML = '<li class="store-item" style="color:red;">Erro ao conectar com o servidor.</li>';
    }
}

// ==========================================
// EVENTOS: Interação do usuário (Apertar Enter)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const inputLocal = document.getElementById('inputLocal');
    const inputLoja = document.getElementById('inputLoja');

    if (inputLocal) {
        inputLocal.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') mudarLocalizacao(e.target.value.trim());
        });
    }

    if (inputLoja) {
        inputLoja.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarLojas(e.target.value.trim());
        });
    }
});

iniciarMapa();