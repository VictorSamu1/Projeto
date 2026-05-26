// Importando os módulos do Firebase diretamente pela internet (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// =====================================================================
// 1. CONFIGURAÇÃO DO FIREBASE (Cole suas chaves reais aqui)
// =====================================================================
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "aquiebomuai.firebaseapp.com",
  projectId: "aquiebomuai",
  storageBucket: "aquiebomuai.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// =====================================================================
// 2. LÓGICA DE CADASTRO (Criar Conta)
// =====================================================================
const formRegister = document.getElementById('form-register');

if (formRegister) {
    formRegister.addEventListener('submit', (e) => {
        e.preventDefault(); // Impede a página de recarregar
        
        const nome = document.getElementById('reg-nome').value;
        const email = document.getElementById('reg-email').value;
        const senha = document.getElementById('reg-senha').value;
        const confirmSenha = document.getElementById('reg-confirm-senha').value;

        // Validação básica
        if (senha !== confirmSenha) {
            alert("Uai, as senhas não batem! Confere aí.");
            return;
        }

        // Função do Firebase para criar o usuário
        createUserWithEmailAndPassword(auth, email, senha)
            .then((userCredential) => {
                const user = userCredential.user;
                alert(`Conta criada com sucesso! Bem-vindo(a), ${nome}!`);
                
                // Redireciona para o mapa após o cadastro
                window.location.href = "mapa.html";
            })
            .catch((error) => {
                const errorMessage = error.message;
                alert(`Erro ao criar conta: ${errorMessage}`);
            });
    });
}

// =====================================================================
// 3. LÓGICA DE LOGIN (Entrar)
// =====================================================================
const formLogin = document.getElementById('form-login');

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;

        // Função do Firebase para fazer o login
        signInWithEmailAndPassword(auth, email, senha)
            .then((userCredential) => {
                const user = userCredential.user;
                alert("Login efetuado com sucesso! Entrando...");
                
                // Redireciona para o mapa após o login
                window.location.href = "mapa.html";
            })
            .catch((error) => {
                // Tratamento de erros comuns
                if (error.code === 'auth/invalid-credential') {
                    alert("E-mail ou senha incorretos, sô!");
                } else {
                    alert(`Erro ao entrar: ${error.message}`);
                }
            });
    });
}