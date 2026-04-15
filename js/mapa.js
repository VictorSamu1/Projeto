let mapa;
let camadaLojas = L.layerGroup(); 
let posicaoUsuario = L.latLng(-19.9208, -43.9378); 

function iniciarMapa() {
    mapa = L.map('meuMapa').setView(posicaoUsuario, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapa);
    camadaLojas.addTo(mapa);

    mapa.locate({setView: true, maxZoom: 15});

    mapa.on('locationfound', (e) => {
        posicaoUsuario = e.latlng;
        L.circleMarker(posicaoUsuario, { radius: 8, color: 'white', fillColor: '#007bff', fillOpacity: 1 }).addTo(mapa).bindPopup("Você está aqui!");
    });
}

async function buscarLojasNoCSharp(termo) {
    if (!termo) return;
    const containerLista = document.querySelector('.store-list');
    containerLista.innerHTML = '<li>Buscando em Minas Gerais...</li>';

    try {
        const url = `http://localhost:5125/api/buscar?termo=${encodeURIComponent(termo)}&lat=${posicaoUsuario.lat}&lng=${posicaoUsuario.lng}`;
        const response = await fetch(url);
        const lojasRecebidas = await response.json();
        
        processarResultados(lojasRecebidas);
    } catch (erro) {
        containerLista.innerHTML = '<li>Erro de conexão.</li>';
    }
}

function processarResultados(lista) {
    camadaLojas.clearLayers();
    const containerLista = document.querySelector('.store-list');
    containerLista.innerHTML = '';

    if (lista.length === 0) {
        containerLista.innerHTML = '<li>Nada encontrado em Minas Gerais.</li>';
        return;
    }

    // Calcula distância real para ordenação
    lista.forEach(loja => {
        loja.distancia = mapa.distance(posicaoUsuario, L.latLng(loja.lat, loja.lng));
    });

    // Ordena: O mais próximo de VOCÊ aparece primeiro
    lista.sort((a, b) => a.distancia - b.distancia);

    let pinsParaMostrar = lista.slice(0, 20); // Mostra os 20 mais relevantes/próximos
    let bounds = [posicaoUsuario];

    pinsParaMostrar.forEach(loja => {
        const pino = L.marker([loja.lat, loja.lng]).bindPopup(`<b>${loja.nome}</b>`);
        camadaLojas.addLayer(pino);
        bounds.push([loja.lat, loja.lng]);

        const km = (loja.distancia / 1000).toFixed(2);
        const li = document.createElement('li');
        li.className = 'store-item';
        li.innerHTML = `
            <div>
                <strong>${loja.nome}</strong>
                <small style="display:block; color:gray">${km} km de você</small>
            </div>
            <button onclick="mapa.flyTo([${loja.lat}, ${loja.lng}], 17)">Ver</button>
        `;
        containerLista.appendChild(li);
    });

    // Ajusta o mapa para mostrar você e as lojas próximas em Minas
    mapa.fitBounds(bounds, { padding: [50, 50] });
}

document.querySelector('.search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarLojasNoCSharp(e.target.value.trim());
});

iniciarMapa();