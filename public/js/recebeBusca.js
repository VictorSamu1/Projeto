<script src="js/mapa.js"></script> <script src="js/recebeBusca.js"></script> ```

### 4. Crie o arquivo `js/recebeBusca.js`
Este arquivo serve apenas para "ler" a URL e preencher o campo de busca que já existe no mapa.

```javascript
// js/recebeBusca.js
(function() {
    // 1. Pega os parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const termoPesquisado = urlParams.get('busca');

    // 2. Se houver algo para buscar, preenche o campo do mapa
    if (termoPesquisado) {
        // Usa a classe que já existe no HTML do mapa
        const mapInput = document.querySelector('.search-input');
        if (mapInput) {
            mapInput.value = termoPesquisado;
            
            // Dica: Se o seu amigo criou uma função global de busca no mapa.js, 
            // você pode chamá-la aqui, ex: realizarBusca(termoPesquisado);
        }
    }
})();