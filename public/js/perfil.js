import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Elementos da Interface
const btnEdit = document.getElementById('btn-edit-profile');
const nameInput = document.getElementById('user-name-input');
const bioInput = document.getElementById('user-bio-input');
const avatarBadge = document.getElementById('avatar-badge');
const checkboxes = document.querySelectorAll('.medal-checkbox');
const fileUpload = document.getElementById('file-upload');
const avatarImg = document.getElementById('profile-avatar-img');
const headerAvatarImg = document.getElementById('header-avatar');
const bannerBg = document.getElementById('profile-banner-bg');
const userRegion = document.querySelector('.user-region');
const btnLogout = document.getElementById('btn-logout');

let isEditing = false;
let usuarioLogado = null;
let fotoAtualBase64 = "";

// ==========================================
// 1. CARREGAR DADOS AO ABRIR A PÁGINA
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioLogado = user;
        try {
            const userRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists()) {
                const dados = docSnap.data();
                
                // Preenche os campos de texto
                nameInput.value = dados.nome || "Explorador Anônimo";
                bioInput.value = dados.biografia || "Conte um pouco sobre suas viagens...";
                userRegion.textContent = `📍 Região mais visitada: ${dados.regiaoMaisVisitada || "Ainda não explorou"}`;

                // Preenche as imagens se houver algo salvo no banco
                if (dados.fotoPerfilBase64) {
                    fotoAtualBase64 = dados.fotoPerfilBase64;
                    avatarImg.src = fotoAtualBase64;
                    bannerBg.style.backgroundImage = `url('${fotoAtualBase64}')`;
                    if (headerAvatarImg) headerAvatarImg.src = fotoAtualBase64;
                }

                // Marca os checkboxes corretos baseado nas medalhas salvas no banco
                if (dados.medalhasExibidas && Array.isArray(dados.medalhasExibidas)) {
                    checkboxes.forEach(cb => {
                        const medalItem = cb.closest('.medal-item');
                        const medalId = medalItem.getAttribute('data-medal-id');
                        cb.checked = dados.medalhasExibidas.includes(medalId);
                    });
                }
            } else {
                console.log("Documento do usuário não encontrado no Firestore!");
            }
        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
            alert("Erro ao carregar os dados do seu perfil.");
        }
    } else {
        // Se tentar acessar o perfil deslogado, chuta para o login
        window.location.href = "login.html";
    }
});

// ==========================================
// 2. LÓGICA DE EDIÇÃO E SALVAMENTO
// ==========================================
btnEdit.addEventListener('click', async () => {
    isEditing = !isEditing;

    if (isEditing) {
        // --- ENTRANDO NO MODO DE EDIÇÃO ---
        btnEdit.textContent = 'Salvar Alterações';
        btnEdit.classList.add('saving-mode');
        
        nameInput.disabled = false;
        bioInput.disabled = false;
        nameInput.className = 'edit-mode-input';
        bioInput.className = 'edit-mode-textarea';
        
        avatarBadge.classList.remove('hidden');
        checkboxes.forEach(cb => {
            cb.classList.remove('hidden');
            cb.disabled = false;
        });

    } else {
        // --- SALVANDO NO BANCO DE DADOS ---
        btnEdit.textContent = 'Salvando...'; // Feedback visual rápido
        
        // Coleta quais medalhas estão marcadas
        const medalhasSelecionadas = [];
        checkboxes.forEach(cb => {
            if (cb.checked) {
                const medalItem = cb.closest('.medal-item');
                medalhasSelecionadas.push(medalItem.getAttribute('data-medal-id'));
            }
        });

        try {
            const userRef = doc(db, "usuarios", usuarioLogado.uid);
            await updateDoc(userRef, {
                nome: nameInput.value.trim(),
                biografia: bioInput.value.trim(),
                medalhasExibidas: medalhasSelecionadas,
                fotoPerfilBase64: fotoAtualBase64
            });

            // Atualiza interface de volta para "Visualização"
            btnEdit.textContent = 'Editar Perfil';
            btnEdit.classList.remove('saving-mode');
            
            nameInput.disabled = true;
            bioInput.disabled = true;
            nameInput.className = 'view-mode-input';
            bioInput.className = 'view-mode-textarea';
            
            avatarBadge.classList.add('hidden');
            checkboxes.forEach(cb => {
                cb.classList.add('hidden');
                cb.disabled = true;
            });

            alert('Alterações salvas com sucesso no seu perfil, sô!');

        } catch (error) {
            console.error("Erro ao salvar perfil:", error);
            alert("Deu ruim ao salvar as alterações. Tente de novo!");
            
            // Reverte o botão se der erro
            btnEdit.textContent = 'Salvar Alterações';
            isEditing = true; 
        }
    }
});

// ==========================================
// 3. COMPRESSÃO E CONVERSÃO DE IMAGEM PARA BASE64
// ==========================================
// Essa função pega a foto, reduz o tamanho para não estourar o limite de 1MB do Firestore, e vira texto.
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Cria um elemento de imagem em memória para redesenhar
        const imgCanvas = document.createElement("canvas");
        const ctx = imgCanvas.getContext("2d");
        const reader = new FileReader();

        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Define o tamanho máximo da foto de perfil (ex: 400x400)
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                // Calcula a proporção para não distorcer a foto
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                imgCanvas.width = width;
                imgCanvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Converte o canvas espremido para um Base64 mais leve (Qualidade 0.7 = 70%)
                const base64Comprimido = imgCanvas.toDataURL("image/jpeg", 0.7);
                
                // Atualiza a tela imediatamente e guarda o texto para salvar depois
                fotoAtualBase64 = base64Comprimido;
                avatarImg.src = base64Comprimido;
                bannerBg.style.backgroundImage = `url('${base64Comprimido}')`;
                if (headerAvatarImg) headerAvatarImg.src = base64Comprimido;
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// ==========================================
// 4. LÓGICA DE SAIR DA CONTA (LOGOUT)
// ==========================================s
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            alert("Você saiu da conta. Até a próxima viagem!");
            window.location.href = "index.html"; // Joga pra home depois de sair
        } catch (error) {
            console.error("Erro ao deslogar:", error);
            alert("Erro ao tentar sair da conta.");
        }
    });
}