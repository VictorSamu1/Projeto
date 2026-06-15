const MAPTILER_KEY = 'u9koDxJJfDNTc50I8NTs';
const ESTILO_MAPA = 'streets-v2'; 

let mapaRoteiro;
let camadaLojas = L.layerGroup();
let posicaoUsuario = L.latLng(-19.8656, -43.9108); // Posição inicial

function iniciarMapaRoteiro() {
    // Altere aqui também para 'meuMapa'
    mapaRoteiro = L.map('meuMapa').setView(posicaoUsuario, 15);
    
    L.tileLayer(`https://api.maptiler.com/maps/${ESTILO_MAPA}/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, {
        attribution: '&copy; MapTiler &copy; OpenStreetMap',
        crossOrigin: true
    }).addTo(mapaRoteiro);
    
    camadaLojas.addTo(mapaRoteiro);

    lerRoteiroDoBanco();
}

// ==========================================
// INTEGRAÇÃO COM O FIREBASE (VIA C#)
// ==========================================

// 1. Função para LER do banco (o seu amigo precisa criar essa rota no C#)
async function lerRoteiroDoBanco() {
    const divRoteiro = document.getElementById('roteiro-salvo');
    
    try {
        // Exemplo da rota que seu amigo vai fazer para ler os dados
        // const response = await fetch('http://localhost:5125/api/meu-roteiro');
        // const dados = await response.json();
        
        // Como o back-end ainda não está pronto, vamos simular que o banco está vazio por enquanto
        const dados = null; 

        if (dados) {
            divRoteiro.innerHTML = `
                <strong>${dados.nome}</strong><br>
                <small>${dados.endereco}</small>
            `;
            mapaRoteiro.flyTo([dados.lat, dados.lng], 18);
            L.marker([dados.lat, dados.lng]).addTo(mapaRoteiro).bindPopup("<b>Seu Roteiro!</b>").openPopup();
        } else {
            divRoteiro.innerHTML = "<p>Nenhuma visita marcada ainda.</p>";
        }
    } catch (erro) {
        divRoteiro.innerHTML = "<p style='color:red;'>Erro ao carregar roteiro do banco.</p>";
    }
}

// 2. Função para SALVAR no banco (o seu amigo precisa criar essa rota no C#)
async function salvarRoteiroNoBanco(nome, endereco, lat, lng) {
    const divRoteiro = document.getElementById('roteiro-salvo');
    divRoteiro.innerHTML = "<p>Salvando nas nuvens...</p>";

    const dadosDoRoteiro = {
        nome: nome,
        endereco: endereco,
        lat: lat,
        lng: lng
    };

    try {
        /* AQUI ENTRA A MÁGICA: Mandando os dados pro C# salvar no Firebase
        Você vai descomentar isso quando seu amigo criar a rota POST.
        
        await fetch('http://localhost:5125/api/salvar-roteiro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosDoRoteiro)
        });
        */

        // Simulação de sucesso até o C# ficar pronto
        setTimeout(() => {
            alert("Roteiro salvo no Firebase com sucesso!");
            divRoteiro.innerHTML = `
                <strong>${nome}</strong><br>
                <small>${endereco}</small>
                <br><span style="color: green;">✔ Salvo nas nuvens!</span>
            `;
        }, 1000);

    } catch (erro) {
        alert("Erro ao salvar no banco de dados.");
    }
}

// ==========================================
// BUSCA DA TOMTOM (Igual ao mapa.js)
// ==========================================
async function mudarLocalizacaoRoteiro(endereco) {
    if (!endereco) return;
    try {
        const response = await fetch(`http://localhost:5125/api/buscar-endereco?endereco=${encodeURIComponent(endereco)}`);
        const local = await response.json();
        posicaoUsuario = L.latLng(local.lat, local.lng);
        mapaRoteiro.flyTo(posicaoUsuario, 15);
    } catch {
        alert("Local não encontrado em Minas.");
    }
}

async function buscarLojasRoteiro(termo) {
    if (!termo) return;
    const listaBusca = document.getElementById('lista-busca-roteiro');
    listaBusca.innerHTML = '<li class="store-item">Buscando lugares para seu roteiro...</li>';

    try {
        const url = `http://localhost:5125/api/buscar-lojas?termo=${encodeURIComponent(termo)}&lat=${posicaoUsuario.lat}&lng=${posicaoUsuario.lng}`;
        const response = await fetch(url);
        const lojas = await response.json();

        camadaLojas.clearLayers();
        listaBusca.innerHTML = '';
        
        if (lojas.length === 0) {
            listaBusca.innerHTML = '<li class="store-item">Nenhum local encontrado.</li>';
            return;
        }

        lojas.forEach(l => {
            const pino = L.marker([l.lat, l.lng]).bindPopup(`<b>${l.nome}</b>`);
            camadaLojas.addLayer(pino);
            
            const li = document.createElement('li');
            li.className = 'store-item';
            
            // O botão agora não é só "Ver", é "Criar Roteiro"
            li.innerHTML = `
                <div>
                    <strong>${l.nome}</strong>
                    <small style="display:block; color:gray;">📍 ${l.distancia.toFixed(2)} km</small>
                </div>
                <button class="btn-favorite" style="background-color: #d32f2f; margin-top: 5px; width: 100%;" 
                    onclick="salvarRoteiroNoBanco('${l.nome.replace(/'/g, "\\'")}', '${l.endereco.replace(/'/g, "\\'")}', ${l.lat}, ${l.lng})">
                    Definir como Roteiro
                </button>
            `;
            listaBusca.appendChild(li);
        });
        
    } catch {
        listaBusca.innerHTML = '<li class="store-item" style="color:red;">Erro ao conectar com a API.</li>';
    }
}

// Eventos de Enter nas barras de pesquisa
document.addEventListener('DOMContentLoaded', () => {
    const inputLocal = document.getElementById('inputLocalRoteiro');
    const inputLoja = document.getElementById('inputLojaRoteiro');

    if (inputLocal) inputLocal.addEventListener('keypress', (e) => { if (e.key === 'Enter') mudarLocalizacaoRoteiro(e.target.value.trim()); });
    if (inputLoja) inputLoja.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarLojasRoteiro(e.target.value.trim()); });
});

iniciarMapaRoteiro();