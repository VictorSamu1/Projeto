// Puxa a conexão da nossa central e agora o banco de dados também!
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Pega os elementos do header
const linkPerfil = document.querySelector('.container-perfil');
const btnEntrar = document.getElementById('btn-entrar');
const fotoPerfilHeader = document.querySelector('.bolinha-perfil'); // Pega a imagem da bolinha

// Fica monitorando se alguém está logado
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // LOGADO: Esconde o botão "Entrar" e a bolinha leva para o perfil
        if (btnEntrar) btnEntrar.style.display = 'none';
        if (linkPerfil) linkPerfil.href = 'perfil.html';

        // NOVO: Busca a foto do usuário no banco de dados para atualizar o cabeçalho
        try {
            const userRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(userRef);

            // Se o usuário tiver uma foto salva em Base64, a gente troca a imagem padrão
            if (docSnap.exists() && docSnap.data().fotoPerfilBase64) {
                if (fotoPerfilHeader) {
                    fotoPerfilHeader.src = docSnap.data().fotoPerfilBase64;
                }
            }
        } catch (error) {
            console.error("Erro ao puxar a foto do header:", error);
        }

    } else {
        // DESLOGADO: Mostra o botão "Entrar" e a bolinha leva para o login
        if (btnEntrar) btnEntrar.style.display = 'block';
        if (linkPerfil) linkPerfil.href = 'login.html';
        
        // Se deslogar, volta para a foto padrão
        if (fotoPerfilHeader) {
            fotoPerfilHeader.src = 'imagenslojas/perfil.webp';
        }
    }
});