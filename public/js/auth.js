// Puxa a conexão da nossa central e agora o banco de dados (db)
import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// Trazendo as funções do Firestore para salvar o perfil do usuário
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// =====================================================================
// LÓGICA DE CADASTRO (Criar Conta no Auth E no Banco de Dados)
// =====================================================================
const formRegister = document.getElementById('form-register');

if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const nome = document.getElementById('reg-nome').value;
        const email = document.getElementById('reg-email').value;
        const senha = document.getElementById('reg-senha').value;
        const confirmSenha = document.getElementById('reg-confirm-senha').value;

        if (senha !== confirmSenha) {
            alert("Uai, as senhas não batem! Confere aí.");
            return;
        }

        try {
            // 1. Cria a conta de acesso no Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            // 2. Cria o documento do perfil lá no Firestore com o mesmo ID do usuário (user.uid)
            await setDoc(doc(db, "usuarios", user.uid), {
                nome: nome,
                email: email,
                biografia: "Apaixonado por um bom café, pão de queijo quentinho e por explorar as riquezas escondidas do nosso estado.",
                fotoPerfilBase64: "", // Começa vazio, o HTML já tem a foto padrão
                regiaoMaisVisitada: "Ainda não explorou",
                medalhasExibidas: [],
                ultimasLocalizacoes: [],
                criadoEm: serverTimestamp()
            });

            alert(`Conta criada com sucesso! Bem-vindo(a), ${nome}!`);
            window.location.href = "mapa.html";
            
        } catch (error) {
            alert(`Erro ao criar conta: ${error.message}`);
        }
    });
}

// =====================================================================
// LÓGICA DE LOGIN (Entrar)
// =====================================================================
const formLogin = document.getElementById('form-login');

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;

        try {
            // Tenta fazer login no Firebase
            await signInWithEmailAndPassword(auth, email, senha);
            alert("Login efetuado com sucesso! Entrando...");
            window.location.href = "mapa.html";
        } catch (error) {
            if (error.code === 'auth/invalid-credential') {
                alert("E-mail ou senha incorretos, sô!");
            } else {
                alert(`Erro ao entrar: ${error.message}`);
            }
        }
    });
}