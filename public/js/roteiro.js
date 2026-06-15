let locaisDoMapa = [];
// Agora criamos uma lista de roteiros para permitir múltiplos planos!
let listaDeRoteiros = [[]]; 
let roteiroIndexAtual = 0;
let modoEdicaoAtivo = false;

function carregarDadosIniciais() {
    const dadosMapa = localStorage.getItem('meusLocaisRoteiro');
    if (dadosMapa) locaisDoMapa = JSON.parse(dadosMapa);
    
    const dadosMultiplosRoteiros = localStorage.getItem('listaDeRoteiros');
    const indexSalvo = localStorage.getItem('roteiroIndexAtual');
    
    if (dadosMultiplosRoteiros) {
        listaDeRoteiros = JSON.parse(dadosMultiplosRoteiros);
    }
    if (indexSalvo) {
        roteiroIndexAtual = parseInt(indexSalvo, 10);
    }

    renderizarPaineis();
}

function renderizarPaineis() {
    renderizarLocaisSalvos();
    renderizarAreaPersonalizacao();
    atualizarComponentesInterface();
}

function atualizarComponentesInterface() {
    const divPersonalizacao = document.getElementById('area-personalizacao');
    const badge = document.getElementById('status-modo');
    const btnEditar = document.getElementById('btn-modo-editar');
    
    // Captura os botões de navegação
    const btnVoltar = document.getElementById('btn-voltar-roteiro');
    const btnProximo = document.getElementById('btn-proximo-roteiro');

    // Atualiza o texto do título informando qual roteiro está ativo
    document.querySelector('.coluna-direita h3').childNodes[0].textContent = `📅 Roteiro #${roteiroIndexAtual + 1} `;

    // Trava/Destrava botões de navegação cronológica
    btnVoltar.disabled = (roteiroIndexAtual === 0);
    btnProximo.disabled = (roteiroIndexAtual === listaDeRoteiros.length - 1);

    if (modoEdicaoAtivo) {
        divPersonalizacao.classList.add('modo-edicao');
        badge.textContent = "Personalizando";
        badge.className = "status-badge badge-editar";
        btnEditar.textContent = "🔒 Finalizar";
    } else {
        divPersonalizacao.classList.remove('modo-edicao');
        badge.textContent = "Visualizando";
        badge.className = "status-badge badge-visualizar";
        btnEditar.textContent = "✏️ Editar";
    }
}

function activarModoEdicao() {
    modoEdicaoAtivo = !modoEdicaoAtivo;
    renderizarPaineis();
}

/* COLUNA ESQUERDA: Estoque */
function renderizarLocaisSalvos() {
    const container = document.getElementById('lista-locais-salvos');
    container.innerHTML = '';

    if (locaisDoMapa.length === 0) {
        container.innerHTML = '<p style="color: gray; text-align: center; font-size:0.9em;">Nenhum local disponível no mapa.</p>';
        return;
    }

    locaisDoMapa.forEach((local, index) => {
        const card = document.createElement('div');
        card.className = 'card-local';
        
        const acaoBotao = modoEdicaoAtivo 
            ? `<button class="btn-card btn-puxar" onclick="puxarParaDivPersonalizacao(${index})">Puxar para Roteiro ➡️</button>`
            : `<button class="btn-card" style="background-color:#ccc; cursor:not-allowed;" disabled>Clique em Editar</button>`;

        card.innerHTML = `
            <strong>${local.nome}</strong>
            <small style="display: block; color: gray;">${local.endereco}</small>
            ${acaoBotao}
        `;
        container.appendChild(card);
    });
}

/* COLUNA DIREITA: Área de personalização do roteiro atual */
function renderizarAreaPersonalizacao() {
    const container = document.getElementById('area-personalizacao');
    container.innerHTML = '';

    const roteiroAtual = listaDeRoteiros[roteiroIndexAtual] || [];

    if (roteiroAtual.length === 0) {
        container.innerHTML = '<p style="color: gray; text-align: center; padding-top: 150px;">Área de personalização vazia.<br>Ative o modo "Editar" para puxar locais para este roteiro.</p>';
        return;
    }

    roteiroAtual.forEach((local, index) => {
        const dia = local.dia || '';
        const hora = local.hora || '';
        const camposBloqueados = modoEdicaoAtivo ? '' : 'disabled';
        const botaoRemover = modoEdicaoAtivo 
            ? `<button class="btn-card btn-remover" onclick="devolverParaEstoque(${index})">⬅️ Remover da lista</button>` 
            : '';

        const card = document.createElement('div');
        card.className = 'card-local no-roteiro';
        card.innerHTML = `
            <strong>${local.nome}</strong>
            <small style="display: block; color: gray;">${local.endereco}</small>
            <div class="campos-tempo">
                <div class="campo-grupo">
                    <label>Dia</label>
                    <input type="date" value="${dia}" ${camposBloqueados} onchange="atualizarDadosTempo(${index}, 'dia', this.value)">
                </div>
                <div class="campo-grupo">
                    <label>Hora</label>
                    <input type="time" value="${hora}" ${camposBloqueados} onchange="atualizarDadosTempo(${index}, 'hora', this.value)">
                </div>
            </div>
            ${botaoRemover}
        `;
        container.appendChild(card);
    });
}

/* CONTROLES DE MOVIMENTAÇÃO */
function puxarParaDivPersonalizacao(index) {
    const item = locaisDoMapa[index];
    locaisDoMapa.splice(index, 1);
    
    if(!listaDeRoteiros[roteiroIndexAtual]) listaDeRoteiros[roteiroIndexAtual] = [];
    listaDeRoteiros[roteiroIndexAtual].push({ ...item, dia: '', hora: '' });
    
    salvarProgressoLocal();
    renderizarPaineis();
}

function devolverParaEstoque(index) {
    const item = listaDeRoteiros[roteiroIndexAtual][index];
    delete item.dia;
    delete item.hora;
    
    listaDeRoteiros[roteiroIndexAtual].splice(index, 1);
    locaisDoMapa.push(item);
    
    salvarProgressoLocal();
    renderizarPaineis();
}

function atualizarDadosTempo(index, campo, valor) {
    listaDeRoteiros[roteiroIndexAtual][index][campo] = valor;
    salvarProgressoLocal();
}

/* SISTEMA DE NAVEGAÇÃO ENTRE MÚLTIPLOS ROTEIROS */
function criarNovoRoteiro() {
    listaDeRoteiros.push([]); // Adiciona um novo roteiro em branco na lista
    roteiroIndexAtual = listaDeRoteiros.length - 1; // Pula direto para ele
    modoEdicaoAtivo = true; // Abre em modo de edição para facilitar
    salvarProgressoLocal();
    renderizarPaineis();
    alert(`Novo espaço criado! Você agora está editando o Roteiro #${roteiroIndexAtual + 1}`);
}

function proximoRoteiro() {
    if (roteiroIndexAtual < listaDeRoteiros.length - 1) {
        roteiroIndexAtual++;
        modoEdicaoAtivo = false;
        salvarProgressoLocal();
        renderizarPaineis();
    }
}

function roteiroAnterior() {
    if (roteiroIndexAtual > 0) {
        roteiroIndexAtual--;
        modoEdicaoAtivo = false;
        salvarProgressoLocal();
        renderizarPaineis();
    }
}

function salvarProgressoLocal() {
    localStorage.setItem('meusLocaisRoteiro', JSON.stringify(locaisDoMapa));
    localStorage.setItem('listaDeRoteiros', JSON.stringify(listaDeRoteiros));
    localStorage.setItem('roteiroIndexAtual', roteiroIndexAtual.toString());
}

function limparRoteiroCompleto() {
    if (confirm("Quer mesmo apagar este roteiro específico?")) {
        listaDeRoteiros.splice(roteiroIndexAtual, 1);
        if (listaDeRoteiros.length === 0) listaDeRoteiros.push([]);
        roteiroIndexAtual = 0;
        modoEdicaoAtivo = false;
        salvarProgressoLocal();
        renderizarPaineis();
    }
}

function salvarNoBanco() {
    const atual = listaDeRoteiros[roteiroIndexAtual] || [];
    if (atual.length === 0) {
        alert("Este roteiro está em branco!");
        return;
    }
    modoEdicaoAtivo = false;
    renderizarPaineis();
    alert(`Roteiro #${roteiroIndexAtual + 1} salvo com sucesso localmente! Pronto para enviar ao banco.`);
    console.log("Objeto enviado para as rotas C#:", atual);
}

carregarDadosIniciais();