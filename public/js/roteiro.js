import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Variáveis Globais de Estado
let usuarioAtual = null;
let locaisSalvos = []; // Vem da coleção "locais_salvos"
let roteirosAtuais = []; // Vem da coleção "roteiros"
let indexRoteiroAtual = 0;
let modoEdicao = false;

// Controle do Modal
let itemPendenteParaRoteiro = null; 
let indexPendente = null;

// ==========================================
// 1. INICIALIZAÇÃO E FIREBASE
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioAtual = user;
        await puxarDadosDoBanco();
    } else {
        window.location.href = "login.html"; // Chuta não-logados
    }
});

async function puxarDadosDoBanco() {
    try {
        // 1. Puxa os locais salvos do Mapa (Backlog)
        const salvosRef = collection(db, "usuarios", usuarioAtual.uid, "locais_salvos");
        const salvosSnap = await getDocs(salvosRef);
        locaisSalvos = [];
        salvosSnap.forEach(doc => {
            locaisSalvos.push({ idDoc: doc.id, ...doc.data() });
        });

        // 2. Puxa os roteiros já criados (ordenados por criação)
        const roteirosRef = collection(db, "usuarios", usuarioAtual.uid, "roteiros");
        const q = query(roteirosRef, orderBy("criadoEm", "asc"));
        const roteirosSnap = await getDocs(q);
        
        roteirosAtuais = [];
        roteirosSnap.forEach(doc => {
            roteirosAtuais.push({ idDoc: doc.id, ...doc.data() });
        });

        // Se o usuário não tem nenhum roteiro, a gente cria um vazio na memória
        if (roteirosAtuais.length === 0) {
            roteirosAtuais.push({
                idDoc: `roteiro_${Date.now()}`,
                nomeRoteiro: "Meu 1º Roteiro",
                destinos: [],
                criadoEm: new Date()
            });
        }

        indexRoteiroAtual = 0;
        renderizarTudo();
    } catch (error) {
        console.error("Erro ao puxar dados:", error);
        alert("Erro ao carregar seu banco de dados.");
    }
}

// ==========================================
// 2. RENDERIZAÇÃO DA TELA
// ==========================================
function renderizarTudo() {
    renderizarColunaEsquerda();
    renderizarColunaDireita();
    atualizarBotoes();
}

function renderizarColunaEsquerda() {
    const container = document.getElementById('lista-locais-salvos');
    container.innerHTML = '';

    if (locaisSalvos.length === 0) {
        container.innerHTML = '<p style="color: gray; text-align: center; margin-top: 50px;">Nenhum local salvo.<br>Vá no mapa e clique na bandeirinha 🔖!</p>';
        return;
    }

    locaisSalvos.forEach((local, index) => {
        const card = document.createElement('div');
        card.className = 'card-local';
        
        const btn = modoEdicao 
            ? `<button class="btn-card btn-puxar" onclick="abrirModal(${index})">Puxar para Viagem ➡️</button>`
            : `<button class="btn-card" disabled>Ative o modo Editar</button>`;

        card.innerHTML = `
            <strong>${local.nomeLocal}</strong>
            <small style="display: block; color: gray;">${local.endereco}</small>
            ${btn}
        `;
        container.appendChild(card);
    });
}

function renderizarColunaDireita() {
    const container = document.getElementById('area-personalizacao');
    const inputTitulo = document.getElementById('nome-roteiro-input');
    
    container.innerHTML = '';
    const roteiro = roteirosAtuais[indexRoteiroAtual];

    // Atualiza o título
    inputTitulo.value = roteiro.nomeRoteiro;
    inputTitulo.disabled = !modoEdicao;

    if (roteiro.destinos.length === 0) {
        container.innerHTML = '<p style="color: gray; text-align: center; margin-top: 150px;">Roteiro vazio.<br>Puxe locais da esquerda para montar sua viagem!</p>';
        return;
    }

    // ORDENAÇÃO CRONOLÓGICA: Deixa a viagem na ordem exata das datas!
    roteiro.destinos.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

    roteiro.destinos.forEach((destino, index) => {
        // Formata a data para ficar bonita na tela (Ex: 20/06/2026 às 14:30)
        const dataFormatada = new Date(destino.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

        const card = document.createElement('div');
        card.className = 'card-local no-roteiro';
        
        const btnRemover = modoEdicao 
            ? `<button class="btn-card btn-remover" onclick="removerDoRoteiro(${index})">⬅️ Devolver para Salvos</button>` 
            : '';

        card.innerHTML = `
            <div class="horario-badge">🕒 ${dataFormatada}</div>
            <strong style="display:block;">${destino.nomeLocal}</strong>
            <small style="display: block; color: gray;">${destino.endereco}</small>
            ${btnRemover}
        `;
        container.appendChild(card);
    });
}

function atualizarBotoes() {
    document.getElementById('btn-voltar-roteiro').disabled = (indexRoteiroAtual === 0);
    document.getElementById('btn-proximo-roteiro').disabled = (indexRoteiroAtual === roteirosAtuais.length - 1);
    
    const btnEditar = document.getElementById('btn-modo-editar');
    const btnSalvar = document.getElementById('btn-modo-salvar');
    const badge = document.getElementById('status-modo');
    const divArea = document.getElementById('area-personalizacao');

    if (modoEdicao) {
        divArea.classList.add('modo-edicao');
        badge.textContent = "Editando";
        badge.className = "status-badge badge-editar";
        btnEditar.textContent = "❌ Cancelar Edição";
        btnSalvar.disabled = false; // Libera o salvar
    } else {
        divArea.classList.remove('modo-edicao');
        badge.textContent = "Visualizando";
        badge.className = "status-badge badge-visualizar";
        btnEditar.textContent = "✏️ Editar";
        btnSalvar.disabled = true; // Trava o salvar
    }
}

// ==========================================
// 3. FLUXO DO MODAL E MOVIMENTAÇÃO
// ==========================================
window.abrirModal = function(index) {
    itemPendenteParaRoteiro = locaisSalvos[index];
    indexPendente = index;
    
    document.getElementById('modal-nome-local').textContent = itemPendenteParaRoteiro.nomeLocal;
    document.getElementById('input-data-hora').value = ''; // Limpa o input
    document.getElementById('modal-data-hora').style.display = 'flex';
}

window.fecharModal = function() {
    document.getElementById('modal-data-hora').style.display = 'none';
    itemPendenteParaRoteiro = null;
    indexPendente = null;
}

window.confirmarAdicaoRoteiro = function() {
    const dataHoraEscolhida = document.getElementById('input-data-hora').value;
    
    if (!dataHoraEscolhida) {
        alert("Sô, você precisa informar o dia e horário para organizar a viagem!");
        return;
    }

    // 1. Cria a cópia com a data nova
    const localOrganizado = {
        ...itemPendenteParaRoteiro,
        dataHora: dataHoraEscolhida
    };

    // 2. Joga no roteiro atual (na memória JS)
    roteirosAtuais[indexRoteiroAtual].destinos.push(localOrganizado);
    
    // 3. Tira da esquerda (na memória JS)
    locaisSalvos.splice(indexPendente, 1);

    fecharModal();
    renderizarTudo();
}

window.removerDoRoteiro = function(indexCardDireita) {
    // Pega o item do roteiro
    const item = roteirosAtuais[indexRoteiroAtual].destinos[indexCardDireita];
    
    // Remove a data e joga de volta pra lista de salvos
    delete item.dataHora;
    locaisSalvos.push(item);
    
    // Apaga do roteiro atual
    roteirosAtuais[indexRoteiroAtual].destinos.splice(indexCardDireita, 1);
    
    renderizarTudo();
}

// ==========================================
// 4. CONTROLES DE ROTEIRO (Salvar, Criar, Mudar)
// ==========================================
window.ativarModoEdicao = function() {
    modoEdicao = !modoEdicao;
    // Se o cara cancelar a edição, recarrega o banco para voltar ao normal (descarta as mudanças não salvas)
    if (!modoEdicao) puxarDadosDoBanco(); 
    else renderizarTudo();
}

window.salvarNoBanco = async function() {
    try {
        const roteiro = roteirosAtuais[indexRoteiroAtual];
        roteiro.nomeRoteiro = document.getElementById('nome-roteiro-input').value || `Roteiro ${indexRoteiroAtual + 1}`;

        // 1. Atualiza o documento do Roteiro no Firebase
        const roteiroRef = doc(db, "usuarios", usuarioAtual.uid, "roteiros", roteiro.idDoc);
        await setDoc(roteiroRef, roteiro);

        // 2. Apaga os locais que foram puxados para o roteiro da coleção 'locais_salvos' do Firebase
        // (A gente confere quem ainda tá na variável locaisSalvos. Quem sumiu de lá, apaga do banco)
        const salvosRef = collection(db, "usuarios", usuarioAtual.uid, "locais_salvos");
        const salvosSnap = await getDocs(salvosRef);
        
        salvosSnap.forEach(async (documento) => {
            const aindaEstaNoBacklog = locaisSalvos.some(loc => loc.idDoc === documento.id);
            if (!aindaEstaNoBacklog) {
                // Se ele não tá mais na lista da esquerda, quer dizer que usamos ele. Apaga!
                await deleteDoc(doc(db, "usuarios", usuarioAtual.uid, "locais_salvos", documento.id));
            }
        });

        alert("Roteiro salvo com sucesso na nuvem, sô!");
        modoEdicao = false;
        renderizarTudo();

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar no Firebase.");
    }
}

window.criarNovoRoteiro = function() {
    if (modoEdicao) {
        alert("Salve ou cancele a edição do roteiro atual primeiro!");
        return;
    }

    const novoNum = roteirosAtuais.length + 1;
    roteirosAtuais.push({
        idDoc: `roteiro_${Date.now()}`,
        nomeRoteiro: `Roteiro ${novoNum}`,
        destinos: [],
        criadoEm: new Date()
    });

    indexRoteiroAtual = roteirosAtuais.length - 1; // Pula pra ele
    modoEdicao = true; // Já entra editando
    renderizarTudo();
}

window.apagarRoteiroAtual = async function() {
    if (!confirm("Tem certeza que quer EXCLUIR este roteiro inteiro? Os locais vão voltar para a sua lista de salvos.")) return;

    try {
        const roteiro = roteirosAtuais[indexRoteiroAtual];

        // 1. Devolve os locais para o backlog do Firebase
        for (const destino of roteiro.destinos) {
            const localRef = doc(db, "usuarios", usuarioAtual.uid, "locais_salvos", destino.idDoc);
            delete destino.dataHora; // Limpa a data
            await setDoc(localRef, destino);
        }

        // 2. Apaga o roteiro do Firebase
        await deleteDoc(doc(db, "usuarios", usuarioAtual.uid, "roteiros", roteiro.idDoc));
        
        alert("Roteiro excluído!");
        await puxarDadosDoBanco(); // Recarrega tudo do zero

    } catch (error) {
        console.error("Erro ao apagar:", error);
        alert("Erro ao excluir do banco.");
    }
}

window.roteiroAnterior = function() {
    if (modoEdicao) { alert("Salve a edição primeiro!"); return; }
    if (indexRoteiroAtual > 0) {
        indexRoteiroAtual--;
        renderizarTudo();
    }
}

window.proximoRoteiro = function() {
    if (modoEdicao) { alert("Salve a edição primeiro!"); return; }
    if (indexRoteiroAtual < roteirosAtuais.length - 1) {
        indexRoteiroAtual++;
        renderizarTudo();
    }
}