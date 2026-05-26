import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// =====================================================================
// COLOQUE SUAS CHAVES DO FIREBASE AQUI
// =====================================================================
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "aquiebomuai.firebaseapp.com",
  projectId: "aquiebomuai",
  storageBucket: "aquiebomuai.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Pega os elementos novos que separamos no HTML
const linkPerfil = document.getElementById('link-perfil');
const btnEntrar = document.getElementById('btn-entrar');

// Fica monitorando se alguém está logado
onAuthStateChanged(auth, (user) => {
    if (user) {
        // LOGADO: Esconde o botão "Entrar" e o link da bolinha leva para o perfil
        if (btnEntrar) btnEntrar.style.display = 'none';
        if (linkPerfil) linkPerfil.href = 'perfil.html';
    } else {
        // DESLOGADO: Mostra o botão "Entrar" e o link da bolinha leva para o login
        if (btnEntrar) btnEntrar.style.display = 'block';
        if (linkPerfil) linkPerfil.href = 'login.html';
    }
});