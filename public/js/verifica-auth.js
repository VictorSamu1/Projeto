// Puxa a conexão da nossa central
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Pega os elementos do header
const linkPerfil = document.getElementById('link-perfil');
const btnEntrar = document.getElementById('btn-entrar');

// Fica monitorando se alguém está logado
onAuthStateChanged(auth, (user) => {
    if (user) {
        // LOGADO: Esconde o botão "Entrar" e a bolinha leva para o perfil
        if (btnEntrar) btnEntrar.style.display = 'none';
        if (linkPerfil) linkPerfil.href = 'perfil.html';
    } else {
        // DESLOGADO: Mostra o botão "Entrar" e a bolinha leva para o login
        if (btnEntrar) btnEntrar.style.display = 'block';
        if (linkPerfil) linkPerfil.href = 'login.html';
    }
});