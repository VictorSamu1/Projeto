let mapa;
let camadaLojas = L.layerGroup(); 

// Variável para guardar a posição do usuário (padrão: Praça 7 em BH)
let posicaoUsuario = L.latLng(-19.9208, -43.9378); 

function iniciarMapa() {
    mapa = L.map('meuMapa').setView(posicaoUsuario, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapa);

    camadaLojas.addTo(mapa);

    // Tenta achar o usuário pelo GPS
    mapa.locate({setView: true, maxZoom: 16});

    mapa.on('locationfound', (e) => {
        posicaoUsuario = e.latlng; // Salva a posição real do usuário!
        L.circleMarker(posicaoUsuario, { radius: 8, color: 'white', fillColor: '#007bff', fillOpacity: 1 })
         .addTo(mapa)
         .bindPopup("Você está aqui!")
         .openPopup();
    });

    mapa.on('locationerror', () => {
        alert("GPS negado ou falhou. Usando o centro de BH como base para calcular distâncias.");
    });
}

// =========================================================
// A MÁGICA: Buscar na API gratuita do OpenStreetMap
// =========================================================
async function buscarNaApiExterna(palavraChave) {
    // Adicionamos "Minas Gerais" na busca para travar a região!
    const query = `${palavraChave} Minas Gerais`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=15`;

    try {
        const response = await fetch(url);
        let resultados = await response.json();

        if (resultados.length === 0) {
            alert("Nenhum local encontrado com essa palavra em Minas Gerais.");
            return;
        }

        // 1. Calcula a distância de cada local até o usuário
        resultados.forEach(local => {
            const posicaoLocal = L.latLng(local.lat, local.lon);
            // map.distance devolve a distância em metros
            local.distanciaMetros = mapa.distance(posicaoUsuario, posicaoLocal);
        });

        // 2. Ordena a lista do mais perto pro mais longe
        resultados.sort((a, b) => a.distanciaMetros - b.distanciaMetros);

        // 3. Coloca os pinos no mapa e atualiza a barra lateral
        renderizarLojasNoMapaELista(resultados);

        // 4. Dá um "zoom" para mostrar os resultados
        const grupo = new L.featureGroup(camadaLojas.getLayers());
        mapa.fitBounds(grupo.getBounds().pad(0.1));

    } catch (erro) {
        console.error("Erro na busca:", erro);
        alert("Erro ao buscar locais.");
    }
}

// =========================================================
// Renderizar Pinos e a Lista Lateral
// =========================================================
function renderizarLojasNoMapaELista(lista) {
    camadaLojas.clearLayers(); // Limpa o mapa
    
    const containerLista = document.querySelector('.store-list');
    containerLista.innerHTML = ''; // Limpa a lista lateral

    lista.forEach(local => {
        // ---- ADICIONA NO MAPA ----
        const pino = L.marker([local.lat, local.lon])
            .bindPopup(`<b>${local.display_name.split(',')[0]}</b><br>Distância: ${(local.distanciaMetros / 1000).toFixed(1)} km`);
        camadaLojas.addLayer(pino);

        // ---- ADICIONA NA LISTA LATERAL ----
        // Pega só o primeiro pedaço do nome pra não ficar gigante
        const nomeCurto = local.display_name.split(',')[0];
        const kmStr = (local.distanciaMetros / 1000).toFixed(1) + ' km';

        const li = document.createElement('li');
        li.className = 'store-item';
        li.innerHTML = `
            <div>
                <span style="display:block; font-weight:bold;">${nomeCurto}</span>
                <small style="color: #666;">A ${kmStr} de você</small>
            </div>
            <button class="btn-favorite" onclick="mapa.flyTo([${local.lat}, ${local.lon}], 17)">Ver</button>
        `;
        
        containerLista.appendChild(li);
        
        // Adiciona a linha divisória
        const hr = document.createElement('hr');
        hr.className = 'divider';
        containerLista.appendChild(hr);
    });
}

// =========================================================
// Evento da Barra de Pesquisa
// =========================================================
const inputBusca = document.querySelector('.search-input');

// Mudamos para 'keypress' (tecla Enter) para não ficar gastando
// pesquisas na API gratuita cada vez que o usuário digita uma letra.
inputBusca.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const termoBusca = e.target.value.trim();
        if (termoBusca !== '') {
            // Coloca um aviso visual na lista enquanto carrega
            document.querySelector('.store-list').innerHTML = '<li>Buscando...</li>';
            buscarNaApiExterna(termoBusca);
        }
    }
});

// Dá o start no mapa
iniciarMapa();