let mapa;
let camadaLojas = L.layerGroup(); 
// Posição padrão caso o GPS do usuário demore (Centro de BH)
let posicaoUsuario = L.latLng(-19.9208, -43.9378); 

function iniciarMapa() {
    mapa = L.map('meuMapa').setView(posicaoUsuario, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '© OpenStreetMap' 
    }).addTo(mapa);
    
    camadaLojas.addTo(mapa);

    // Pede a localização real do usuário
    mapa.locate({setView: true, maxZoom: 15});

    mapa.on('locationfound', (e) => {
        posicaoUsuario = e.latlng;
        L.circleMarker(posicaoUsuario, { radius: 8, color: 'white', fillColor: '#007bff', fillOpacity: 1 })
            .addTo(mapa)
            .bindPopup("Você está aqui!")
            .openPopup();
    });

    mapa.on('locationerror', () => {
        console.warn("GPS negado ou indisponível. Usando localização padrão.");
    });
}

// CHAMA O C# ENVIANDO O TERMO E O GPS
async function buscarLojasNoCSharp(termo) {
    if (!termo) return;

    const containerLista = document.querySelector('.store-list');
    containerLista.innerHTML = '<li>Pesquisando em toda Minas Gerais...</li>';

    try {
        const url = `http://localhost:5125/api/buscar?termo=${encodeURIComponent(termo)}&lat=${posicaoUsuario.lat}&lng=${posicaoUsuario.lng}`;
        const response = await fetch(url);
        const lojasRecebidas = await response.json();
        
        processarResultados(lojasRecebidas);
    } catch (erro) {
        console.error("Erro no servidor:", erro);
        containerLista.innerHTML = '<li>Erro ao conectar com o servidor C#. Verifique se ele está rodando.</li>';
    }
}

// DESENHA NA TELA
function processarResultados(lista) {
    camadaLojas.clearLayers();
    const containerLista = document.querySelector('.store-list');
    containerLista.innerHTML = '';

    if (lista.length === 0) {
        containerLista.innerHTML = '<li>Nada encontrado no estado de Minas Gerais.</li>';
        return;
    }

    // A variável bounds guarda todas as coordenadas para a câmera ajustar o zoom no final
    let bounds = [[posicaoUsuario.lat, posicaoUsuario.lng]];

    lista.forEach(loja => {
        // Cria o pino
        const pino = L.marker([loja.lat, loja.lng])
            .bindPopup(`<b>${loja.nome}</b><br><small>${loja.descricao}</small>`);
        camadaLojas.addLayer(pino);
        
        bounds.push([loja.lat, loja.lng]);

        // Cria a lista lateral
        const km = loja.distancia.toFixed(2);
        const li = document.createElement('li');
        li.className = 'store-item';
        li.innerHTML = `
            <div>
                <strong>${loja.nome}</strong>
                <small style="display:block; color:gray">${km} km de você</small>
            </div>
            <button class="btn-favorite" onclick="mapa.flyTo([${loja.lat}, ${loja.lng}], 17)">Ver no Mapa</button>
        `;
        containerLista.appendChild(li);
    });

    // Enquadra a câmera em você e nas lojas, com uma margem para não ficar colado na borda
    mapa.fitBounds(bounds, { padding: [50, 50] });
}

// CAPTURA O ENTER NA BARRA DE PESQUISA
document.querySelector('.search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        buscarLojasNoCSharp(e.target.value.trim());
    }
});

// Inicializa tudo
iniciarMapa();