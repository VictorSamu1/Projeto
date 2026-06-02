
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// NOVO: Importando o banco de dados
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// COLE SUAS CHAVES REAIS AQUI (Copie lá do painel do Firebase)
// =====================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBuNZz1ZUOPbM-yD96-ps27NvD-CWN5GBo",
  authDomain: "aquiebomuai.firebaseapp.com",
  projectId: "aquiebomuai",
  storageBucket: "aquiebomuai.firebasestorage.app",
  messagingSenderId: "884861885387",
  appId: "1:884861885387:web:682f42e9ed2c8f5c2ff44e",
  measurementId: "G-2HN8PB8CBG"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);