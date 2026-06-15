// js/home.js
import { db } from "./firebase-config.js";
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. BARRA DE PESQUISA (Redireciona pro mapa)
// ==========================================
const searchInput = document.getElementById('searchHome');
if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const termo = searchInput.value;
            window.location.href = `mapa.html?busca=${encodeURIComponent(termo)}`;
        }
    });
}

// ==========================================
// 2. GERADOR DO RANKING (Lê do Firebase)
// ==========================================
async function carregarRanking() {
    const container = document.getElementById('ranking-container');
    if (!container) return;

    try {
        // Puxa as lojas ordenadas pelo maior número de visitas, pegando só o Top 10
        const rankingRef = collection(db, "lojas_ranking");
        const q = query(rankingRef, orderBy("totalVisitas", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        container.innerHTML = ''; // Limpa a mensagem de "Carregando..."

        if (querySnapshot.empty) {
            container.innerHTML = '<h3 style="text-align: center; width: 100%;">Nenhuma loja foi visitada ainda! Corra para o mapa e seja o primeiro.</h3>';
            return;
        }

        let posicao = 1;

        querySnapshot.forEach((doc) => {
            const loja = doc.data();

            // 1. Gera as bolinhas de foto (Até 3). Se faltar visitante, põe o ícone padrão de silhueta cinza
            let fotosHtml = '';
            const visitantes = loja.top3Visitantes || [];
            
            for (let i = 0; i < 3; i++) {
                if (visitantes[i] && visitantes[i].fotoBase64) {
                    fotosHtml += `<img src="${visitantes[i].fotoBase64}" alt="Top Visitante ${i + 1}">`;
                } else {
                    // Fallback para vaga não preenchida no pódio (como no seu print)
                    fotosHtml += `<img src="imagenslojas/perfil.webp" alt="Vaga vazia" style="opacity: 0.5;">`;
                }
            }

            // 2. Resolve a imagem da fachada da loja
            // DICA: No seu banco 'lojas_ranking', adicione um campo 'imagemFachada' (string da URL da foto).
            // Se a loja não tiver foto cadastrada no banco, ele joga uma padrão genérica.
            const imagemLoja = loja.imagemFachada || `imagenslojas/loja1.jpg`; 

            // 3. Monta o bloco HTML idêntico ao seu CSS original
            const cardHtml = `
                <a href="mapa.html?busca=${encodeURIComponent(loja.nomeLocal)}" class="item-card" style="border: 2px solid #FF0000;">
                    <h3 class="item-title">#${posicao} ${loja.nomeLocal}</h3>
                    <img class="store-image" src="${imagemLoja}" alt="${loja.nomeLocal}">
                    
                    <div class="top-accounts">
                        ${fotosHtml}
                    </div>

                    <p class="item-description">
                        <strong>Descrição:</strong><br>
                        ${loja.descricao || "Uma loja tradicional e muito querida em Minas Gerais."}<br><br>

                        <strong>Localização:</strong><br>
                        ${loja.enderecoFilial || "Endereço não mapeado"}<br><br>

                        <strong>Visitas:</strong><br>
                        ${loja.totalVisitas.toLocaleString('pt-BR')}
                    </p>
                </a>
            `;
            
            // Injeta na tela
            container.insertAdjacentHTML('beforeend', cardHtml);
            posicao++;
        });

    } catch (error) {
        console.error("Erro ao carregar o ranking:", error);
        container.innerHTML = '<h3 style="text-align: center; color: red; width: 100%;">Erro ao carregar o ranking de lojas. Verifique a conexão com o banco.</h3>';
    }
}

// Inicia a função assim que a página Home carregar
carregarRanking();