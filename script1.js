import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
const db = getFirestore();
import { auth } from "../firebase/firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

async function salvarRelatoFirestore(relato) {
  try {
    await addDoc(collection(db, "relatos"), {
      ...relato,
      dataHora: serverTimestamp()
    });
    return true;
  } catch (e) {
    console.error("Erro ao salvar relato no Firestore:", e);
    return false;
  }
}

const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("register-email").value;
    const senha = document.getElementById("register-password").value;

    try {
      await createUserWithEmailAndPassword(auth, email, senha);
      alert("Usuário cadastrado com sucesso!");
      window.location.href = "login.html";
    } catch (error) {
      alert("Erro: " + error.message);
    }
  });
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const senha = document.getElementById("login-password").value;

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      window.location.href = "index.html";
    } catch (error) {
      alert("Erro: " + error.message);
    }
  });
}