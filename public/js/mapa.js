import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const MAPTILER_KEY = 'u9koDxJJfDNTc50I8NTs';
const ESTILO_MAPA = 'streets-v2';

let mapa;
let camadaLojas = L.layerGroup();
let posicaoUsuario = L.latLng(-19.8656, -43.9108); // Padrão BH
let marcadorVoce;

let usuarioAtual = null;
let ultimasLocalizacoesMemoria = []; 

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
                if (dist >= 0) {
                    salvarNovaLocalizacao = true;
                }
            }

            if (salvarNovaLocalizacao) {
                const novaPosicao = { latitude: latAtual, longitude: lonAtual, registradaEm: new Date() };
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

// ==========================================
// 1. SISTEMA DE SALVAR PARA O ROTEIRO (NOVO!)
// ==========================================
window.salvarLocal = async function(event, btnElement, nomeLoja, enderecoLoja, latLoja, lonLoja) {
    event.stopPropagation(); // Não deixa clicar no mapa sem querer
    
    if (!usuarioAtual) {
        mostrarToast("Uai, sô! Entre na sua conta para salvar locais no seu roteiro!", "aviso");
        return;
    }

    // Efeito visual rápido de clique
    btnElement.style.transform = 'scale(0.8)';
    setTimeout(() => btnElement.style.transform = '', 150);

    try {
        // Agora usa o nome + os números da coordenada para garantir que filiais tenham IDs diferentes
const idLojaSeguro = (nomeLoja + latLoja.toString()).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        
        // Aponta para a nova subcoleção locais_salvos
        const localRef = doc(db, "usuarios", usuarioAtual.uid, "locais_salvos", idLojaSeguro);
        
        await setDoc(localRef, {
            nomeLocal: nomeLoja,
            endereco: enderecoLoja || "Endereço não informado",
            lat: latLoja,
            lon: lonLoja,
            salvoEm: serverTimestamp()
        });

        // Feedback Visual: Transforma a bandeirinha numa estrela amarela pra confirmar que salvou
        btnElement.innerHTML = '⭐';
        btnElement.style.background = '#f1c40f';
        btnElement.style.color = 'white';
        btnElement.style.borderColor = '#f1c40f';

        mostrarToast(`"${nomeLoja}" foi salvo na sua aba de roteiros!`, "sucesso");
    } catch (error) {
        console.error("Erro ao salvar local:", error);
        mostrarToast("Ocorreu um erro ao salvar o local. Tente de novo.", "erro");
    }
}

// ==========================================
// 2. SISTEMA DE CHECK-IN
// ==========================================
window.marcarVisita = async function(nomeLoja, enderecoLoja, latLoja, lonLoja) {
    if (!usuarioAtual) {
        mostrarToast("Uai, sô! Você precisa entrar na sua conta para marcar visitas!", "aviso");
        return;
    }

    if (ultimasLocalizacoesMemoria.length === 0) {
        mostrarToast("Ainda não conseguimos pegar seu GPS. Ative a localização!", "erro");
        return;
    }

    let aprovado = false;
    for (const loc of ultimasLocalizacoesMemoria) {
        const dist = calcularDistanciaKm(loc.latitude, loc.longitude, latLoja, lonLoja);
        if (dist <= 2000) { // Lembrete: voltar para 2 depois de testar
            aprovado = true;
            break;
        }
    }

    if (!aprovado) {
        mostrarToast("Você precisa estar num raio de 2km para validar o Check-in!", "erro");
        return;
    }

    try {
        const visitasRef = collection(db, "usuarios", usuarioAtual.uid, "visitas");
        await addDoc(visitasRef, {
            nomeLocal: nomeLoja,
            regiao: "Pendente",
            coordenadasLoja: { latitude: latLoja, longitude: lonLoja },
            dataVisita: serverTimestamp()
        });

        const userRef = doc(db, "usuarios", usuarioAtual.uid);
        const userSnap = await getDoc(userRef);
        const minhaFoto = userSnap.exists() ? (userSnap.data().fotoPerfilBase64 || "") : "";

        const idLojaSeguro = nomeLoja.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const rankingRef = doc(db, "lojas_ranking", idLojaSeguro);
        const rankingSnap = await getDoc(rankingRef);

        if (rankingSnap.exists()) {
            let dadosLoja = rankingSnap.data();
            let total = (dadosLoja.totalVisitas || 0) + 1;
            let top3 = dadosLoja.top3Visitantes || [];

            let index = top3.findIndex(v => v.uid === usuarioAtual.uid);
            if (index !== -1) {
                top3[index].visitasDesteUsuario += 1;
                top3[index].fotoBase64 = minhaFoto; 
            } else {
                top3.push({ uid: usuarioAtual.uid, visitasDesteUsuario: 1, fotoBase64: minhaFoto });
            }

            top3.sort((a, b) => b.visitasDesteUsuario - a.visitasDesteUsuario);
            top3 = top3.slice(0, 3); 

            await updateDoc(rankingRef, { totalVisitas: total, top3Visitantes: top3 });
        } else {
            await setDoc(rankingRef, {
                nomeLocal: nomeLoja,
                enderecoFilial: enderecoLoja || "Endereço não informado",
                descricao: "Uma loja tradicional descoberta pelos nossos exploradores!",
                totalVisitas: 1,
                top3Visitantes: [{ uid: usuarioAtual.uid, visitasDesteUsuario: 1, fotoBase64: minhaFoto }],
                imagemFachada: "imagenslojas/loja1.jpg" 
            });
        }

        mostrarToast(`Check-in em "${nomeLoja}" aprovado! O ranking foi atualizado.`, "sucesso");
    } catch (error) {
        console.error("Erro ao salvar visita:", error);
        mostrarToast("Ocorreu um erro ao salvar o check-in.", "erro");
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
        mostrarToast("Não foi possível encontrar este endereço.", "erro");
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
            
            // MUDANÇA: O botão novo com ícone 🔖 (marca-página) entra aqui no meio!
            li.innerHTML = `
                <div>
                    <strong>${nome}</strong>
                    <small style="display:block; color:gray;">${endereco}</small>
                    <small style="display:block; color:gray; margin-top:5px;">📍 ${distancia.toFixed(2)} km de distância</small>
                </div>
                <div class="action-buttons">
                    <button class="btn-favorite" onclick="mapa.flyTo([${latLoja}, ${lngLoja}], 18); event.stopPropagation();">Ver no Mapa</button>
                    
                    <button class="btn-salvar" title="Salvar para Roteiro" onclick="salvarLocal(event, this, '${nome.replace(/'/g, "\\'")}', '${endereco.replace(/'/g, "\\'")}', ${latLoja}, ${lngLoja})">
                        🔖
                    </button>

                    <div style="position:relative; display:flex; justify-content:center; align-items:center;">
                        <button class="btn-checkin-circle" data-count="0" onclick="animarECheckin(event, this, '${nome.replace(/'/g, "\\'")}', '${endereco.replace(/'/g, "\\'")}', ${latLoja}, ${lngLoja})">
                            <span class="icon">✔</span>
                            <span class="count"></span> 
                        </button>
                    </div>
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

window.animarECheckin = function(event, btnElement, nomeLoja, enderecoLoja, latLoja, lonLoja) {
    event.stopPropagation();
    if (btnElement.classList.contains('anim-jump-spin')) return;

    btnElement.classList.add('anim-jump-spin');

    const wrapper = btnElement.parentElement;
    const plusOne = document.createElement('div');
    plusOne.className = 'floating-plus-one anim-drop-merge';
    plusOne.textContent = '+1';
    wrapper.appendChild(plusOne);

    setTimeout(() => {
        btnElement.classList.remove('anim-jump-spin');
        plusOne.remove();

        let count = parseInt(btnElement.getAttribute('data-count')) || 0;
        count++;
        btnElement.setAttribute('data-count', count);
        
        let spanCount = btnElement.querySelector('.count');
        spanCount.textContent = count;
        
        btnElement.classList.add('has-count');
        window.marcarVisita(nomeLoja, enderecoLoja, latLoja, lonLoja);
    }, 900); 
}

window.mostrarToast = function(mensagem, tipo = 'sucesso') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast-msg ${tipo}`; 
    let icone = '✅';
    if (tipo === 'erro') icone = '❌';
    if (tipo === 'aviso') icone = '⚠️';

    toast.innerHTML = `<span>${icone}</span> <span>${mensagem}</span>`;
    container.appendChild(toast);

    setTimeout(() => { toast.remove(); }, 4500);
}

iniciarMapa();

onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioAtual = user;
        iniciarRastreioUsuario(user.uid);
    } else {
        usuarioAtual = null;
        ultimasLocalizacoesMemoria = [];
    }
});

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