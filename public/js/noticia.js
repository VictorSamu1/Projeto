const API_URL = 'http://localhost:5125/api/feed-noticias';
const INTERVALO_ATUALIZACAO = 5 * 60 * 1000; // Atualiza a cada 5 minutos automaticamente

async function carregarNoticiasMG() {
    const container = document.querySelector('#feed-noticias-mg');

    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        const dados = await resposta.json();

        container.innerHTML = dados.map(item => `
            <a class="item-card item-card--noticia" href="${item.link}" target="_blank" rel="noopener noreferrer">
                ${item.capa
                    ? `<img src="${item.capa}" alt="${item.manchete}" loading="lazy" onerror="this.style.display='none'">`
                    : `<div class="item-card__sem-imagem">📰</div>`
                }
                <div class="item-card__conteudo">
                    <span class="item-card__data">${item.publicado}</span>
                    <h3>${item.manchete}</h3>
                    <p class="item-card__resumo">${item.resumo}</p>
                </div>
            </a>
        `).join('');

    } catch (erro) {
        console.error("Erro ao carregar notícias:", erro);
        
        // Proteção: Só exibe a mensagem de erro se a div estiver vazia.
        // Se já existirem notícias renderizadas, elas ficam intactas na tela!
        if (!container.innerHTML.trim() || container.querySelector('.item-card') === null) {
            container.innerHTML = `<p class="erro-noticias">Não foi possível carregar as notícias. Tente novamente mais tarde.</p>`;
        } else {
            console.warn("A API falhou na atualização de background, mas as notícias antigas continuam na tela.");
        }
    }
}

// Carrega ao abrir a página
document.addEventListener('DOMContentLoaded', () => {
    carregarNoticiasMG();

    // Atualiza automaticamente a cada 5 minutos — sem precisar recarregar a página
    setInterval(carregarNoticiasMG, INTERVALO_ATUALIZACAO);
});