// js/home.js
const searchInput = document.getElementById('searchHome');

if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
        // Se o usuário apertar Enter
        if (e.key === 'Enter') {
            const termo = searchInput.value;
            // Redireciona para a página do mapa passando o texto na URL
            window.location.href = `mapa.html?busca=${encodeURIComponent(termo)}`;
        }
    });
}