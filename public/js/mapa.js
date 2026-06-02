import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const MAPTILER_KEY = 'u9koDxJJfDNTc50I8NTs';
const ESTILO_MAPA = 'streets-v2';

let mapa;
let camadaLojas = L.layerGroup();
let posicaoUsuario = L.latLng(-19.8656, -43.9108); // Padrão BH
let marcadorVoce;

let usuarioAtual = null;
let ultimasLocalizacoesMemoria = []; 

// Limites para travar a tela em Minas Gerais
const limitesMinasGerais = L.latLngBounds(
    L.latLng(-22.92, -51.10),
    L.latLng(-14.23, -39.85)
);

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function iniciarMapa() {
    mapa = L.map('meuMapa', {
        maxBounds: limitesMinasGerais,
        maxBoundsViscosity: 1.0, 
        minZoom: 6 
    }).setView(posicaoUsuario, 15);
    
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

function iniciarRastreioUsuario(uid) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const latAtual = pos.coords.latitude;
            const lonAtual = pos.coords.longitude;
            posicaoUsuario = L.latLng(latAtual, lonAtual);
            atualizarMarcadorUsuario("Sua localização real!");
            mapa.flyTo(posicaoUsuario, 15);

            const userRef = doc(db, "usuarios", uid);
            const docSnap = await getDoc(userRef);

            let locsAntigas = [];

            if (docSnap.exists() && docSnap.data().ultimasLocalizacoes) {
                locsAntigas = docSnap.data().ultimasLocalizacoes;
            }

            let salvarNovaLocalizacao = false;

            if (locsAntigas.length === 0) {
                salvarNovaLocalizacao = true;
            } else {
                const dist = calcularDistanciaKm(latAtual, lonAtual, locsAntigas[0].latitude, locsAntigas[0].longitude);
                if (dist > 5) {
                    salvarNovaLocalizacao = true;
                }
            }

            if (salvarNovaLocalizacao) {
                const novaPosicao = {
                    latitude: latAtual,
                    longitude: lonAtual,
                    registradaEm: new Date()
                };

                locsAntigas.unshift(novaPosicao);
                locsAntigas = locsAntigas.slice(0, 4);

                await setDoc(userRef, { ultimasLocalizacoes: locsAntigas }, { merge: true });
            }

            ultimasLocalizacoesMemoria = locsAntigas;

        }, (error) => {
            console.warn("Usuário bloqueou o GPS. Usando posição padrão.");
        });
    }
}

window.marcarVisita = async function(idLoja, nomeLoja, latLoja, lonLoja) {
    if (!usuarioAtual) {
        alert("Uai, sô! Você precisa entrar na sua conta para marcar visitas e ganhar medalhas!");
        return;
    }

    if (ultimasLocalizacoesMemoria.length === 0) {
        alert("Ainda não conseguimos pegar seu GPS. Ative a localização e recarregue a página!");
        return;
    }

    let aprovado = false;
    for (const loc of ultimasLocalizacoesMemoria) {
        const dist = calcularDistanciaKm(loc.latitude, loc.longitude, latLoja, lonLoja);
        if (dist <= 2) {
            aprovado = true;
            break;
        }
    }

    if (!aprovado) {
        alert("Parece que você não esteve perto dessa loja recentemente. Precisa estar num raio de 2km nas últimas 4 localizações para validar o Check-in!");
        return;
    }

    try {
        const visitasRef = collection(db, "usuarios", usuarioAtual.uid, "visitas");
        await addDoc(visitasRef, {
            idLocalTomTom: idLoja,
            nomeLocal: nomeLoja,
            regiao: "Pendente",
            coordenadasLoja: { latitude: latLoja, longitude: lonLoja },
            dataVisita: serverTimestamp()
        });
        alert(`Check-in em "${nomeLoja}" aprovado e salvo! Parabéns, explorador!`);
    } catch (error) {
        console.error("Erro ao salvar visita:", error);
        alert("Ocorreu um erro ao salvar o check-in.");
    }
}

async function mudarLocalizacao(termo) {
    try {
        const resposta = await fetch(`http://localhost:5125/api/buscar-endereco?endereco=${encodeURIComponent(termo)}`);
        if (!resposta.ok) throw new Error('Erro na busca');
        const dados = await resposta.json();
        
        posicaoUsuario = L.latLng(dados.lat || dados.Lat, dados.lng || dados.Lng);
        mapa.flyTo(posicaoUsuario, 15);
        atualizarMarcadorUsuario(dados.nomeFormatado || dados.NomeFormatado || "Local encontrado");
        
        const inputLoja = document.getElementById('inputLoja');
        if(inputLoja && inputLoja.value.trim() !== '') {
            buscarLojasProximas(inputLoja.value.trim(), posicaoUsuario.lat, posicaoUsuario.lng);
        }
    } catch (error) {
        console.error("Erro", error);
        alert("Não foi possível encontrar este endereço.");
    }
}

async function buscarLojasProximas(termo, lat, lon) {
    const containerLista = document.querySelector('.store-list');
    containerLista.innerHTML = '<li>Buscando...</li>';
    camadaLojas.clearLayers();

    try {
        const resposta = await fetch(`http://localhost:5125/api/buscar-lojas?termo=${encodeURIComponent(termo)}&lat=${lat}&lon=${lon}`);
        if (!resposta.ok) throw new Error('Erro na busca das lojas');
        const resultados = await resposta.json();

        containerLista.innerHTML = '';
        
        if (resultados.length === 0) {
            containerLista.innerHTML = '<li class="store-item">Nenhuma loja encontrada na região.</li>';
            return;
        }

        const bounds = L.latLngBounds();

        resultados.forEach(l => {
            const nome = l.nome || l.Nome;
            const latLoja = l.lat || l.Lat;
            const lngLoja = l.lng || l.Lng;
            const endereco = l.endereco || l.Endereco;
            const distancia = l.distancia || l.Distancia;

            bounds.extend([latLoja, lngLoja]);

            const pino = L.marker([latLoja, lngLoja]).addTo(camadaLojas)
                          .bindPopup(`<b>${nome}</b><br>${endereco}`);

            const li = document.createElement('li');
            li.className = 'store-item';
            
            li.innerHTML = `
                <div>
                    <strong>${nome}</strong>
                    <small style="display:block; color:gray;">${endereco}</small>
                    <small style="display:block; color:gray; margin-top:5px;">📍 ${distancia.toFixed(2)} km de distância</small>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button class="btn-favorite" onclick="mapa.flyTo([${latLoja}, ${lngLoja}], 18); event.stopPropagation();">Ver no Mapa</button>
                    <button class="btn-favorite" style="background: linear-gradient(135deg, #27ae60 0%, #219653 100%);" onclick="marcarVisita('${nome}_ID', '${nome}', ${latLoja}, ${lngLoja}); event.stopPropagation();">✓ Marcar Visita</button>
                </div>
            `;
            
            li.style.cursor = 'pointer';
            li.onclick = () => {
                mapa.flyTo([latLoja, lngLoja], 18);
                pino.openPopup();
            };
            
            containerLista.appendChild(li);
        });
        
        mapa.fitBounds(bounds, { padding: [50, 50] });
    } catch (error) {
        containerLista.innerHTML = '<li class="store-item" style="color:red;">Erro ao buscar lojas.</li>';
    }
}

// Inicializa o mapa logo de cara
iniciarMapa();

// Monitora o estado de login e ativa o GPS se necessário
onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioAtual = user;
        iniciarRastreioUsuario(user.uid);
    } else {
        usuarioAtual = null;
        ultimasLocalizacoesMemoria = [];
    }
});

// Atalhos do Enter
const inputLocal = document.getElementById('inputLocal');
if (inputLocal) {
    inputLocal.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') mudarLocalizacao(e.target.value.trim());
    });
}

const inputLoja = document.getElementById('inputLoja');
if (inputLoja) {
    inputLoja.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarLojasProximas(e.target.value.trim(), posicaoUsuario.lat, posicaoUsuario.lng);
    });
}