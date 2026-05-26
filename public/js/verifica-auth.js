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
s
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Pega os elementos do header
const linkPerfil = document.getElementById('link-perfil');
const textoEntrar = document.getElementById('texto-entrar');

// Fica monitorando se alguém está logado
onAuthStateChanged(auth, (user) => {
    if (user) {
        // LOGADO: Esconde a palavra "Entrar" e o link agora leva para o perfil
        if (textoEntrar) textoEntrar.style.display = 'none';
        if (linkPerfil) linkPerfil.href = 'perfil.html';
    } else {
        // DESLOGADO: Mostra "Entrar" e o link leva para a tela de login
        if (textoEntrar) textoEntrar.style.display = 'block';
        if (linkPerfil) linkPerfil.href = 'login.html';
    }
});