// Dentro de noticia.js
async function carregarNoticiasMG() {
    const container = document.querySelector('.grid-lojas');
    
    try {
        const resposta = await fetch('http://localhost:5000/api/feed-noticias');
        const dados = await resposta.json();

        container.innerHTML = ''; // Limpa o "Carregando..."

        dados.forEach(item => {
            container.innerHTML += `
                <div class="item-card">
                    <img src="${item.capa}" alt="Notícia">
                    <h3>${item.manchete}</h3>
                    <p>${item.resumo}</p>
                </div>
            `;
        });
    } catch (erro) {
        console.error("Erro:", erro);
    }
}

document.addEventListener('DOMContentLoaded', carregarNoticiasMG);