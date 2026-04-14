let mapa;
let todasAsLojas = [];
let camadaLojas = L.layerGroup(); 

function iniciarMapa() {
    // Inicia focado em BH como padrão
    mapa = L.map('meuMapa').setView([-19.92, -43.94], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapa);

    camadaLojas.addTo(mapa);

    // Tenta achar o usuário pelo GPS do navegador na hora
    mapa.locate({setView: true, maxZoom: 16});

    mapa.on('locationfound', (e) => {
        L.circleMarker(e.latlng, { radius: 8, color: 'white', fillColor: '#007bff', fillOpacity: 1 }).addTo(mapa).bindPopup("Você está aqui!");
    });

    carregarLojas();
}

async function carregarLojas() {
    try {
        // TROQUE A PORTA AQUI CASO SEU C# ABRA EM OUTRA
        const response = await fetch('http://localhost:5125');
        todasAsLojas = await response.json();
        renderizarLojas(todasAsLojas);
    } catch (erro) {
        console.error("Erro ao carregar lojas:", erro);
    }
}

function renderizarLojas(lista) {
    camadaLojas.clearLayers(); 
    lista.forEach(loja => {
        const pino = L.marker([loja.lat, loja.lng])
            .bindPopup(`<b>${loja.nome}</b><br>${loja.descricao}`);
        camadaLojas.addLayer(pino);
    });
}

// Quando o usuário digitar na barra de pesquisa
document.querySelector('.search-input').addEventListener('input', (e) => {
    const termoBusca = e.target.value.toLowerCase();
    
    const filtradas = todasAsLojas.filter(loja => 
        loja.nome.toLowerCase().includes(termoBusca) || 
        loja.categoria.toLowerCase().includes(termoBusca) ||
        loja.descricao.toLowerCase().includes(termoBusca)
    );

    renderizarLojas(filtradas);
});

// Dá o start em tudo
iniciarMapa();