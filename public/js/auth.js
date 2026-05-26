// Puxa a conexão da nossa central (o ./ significa que está na mesma pasta)
import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// =====================================================================
// LÓGICA DE CADASTRO (Criar Conta)
// =====================================================================
const formRegister = document.getElementById('form-register');

if (formRegister) {
    formRegister.addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const nome = document.getElementById('reg-nome').value;
        const email = document.getElementById('reg-email').value;
        const senha = document.getElementById('reg-senha').value;
        const confirmSenha = document.getElementById('reg-confirm-senha').value;

        if (senha !== confirmSenha) {
            alert("Uai, as senhas não batem! Confere aí.");
            return;
        }

        // Tenta criar no Firebase
        createUserWithEmailAndPassword(auth, email, senha)
            .then((userCredential) => {
                alert(`Conta criada com sucesso! Bem-vindo(a), ${nome}!`);
                window.location.href = "mapa.html";
            })
            .catch((error) => {
                alert(`Erro ao criar conta: ${error.message}`);
            });
    });
}

// =====================================================================
// LÓGICA DE LOGIN (Entrar)
// =====================================================================
const formLogin = document.getElementById('form-login');

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;

        // Tenta fazer login no Firebase
        signInWithEmailAndPassword(auth, email, senha)
            .then((userCredential) => {
                alert("Login efetuado com sucesso! Entrando...");
                window.location.href = "mapa.html";
            })
            .catch((error) => {
                if (error.code === 'auth/invalid-credential') {
                    alert("E-mail ou senha incorretos, sô!");
                } else {
                    alert(`Erro ao entrar: ${error.message}`);
                }
            });
    });
}