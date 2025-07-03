import { auth } from "./sistema de login/sistema-de-login-main/firebase/firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("register-email").value;
    const senha = document.getElementById("register-password").value;
    try {
      await createUserWithEmailAndPassword(auth, email, senha);
      localStorage.setItem('usuarioLogado', 'true');
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
    signInWithEmailAndPassword(auth, email, senha)
      .then((userCredential) => {
        localStorage.setItem('usuarioLogado', 'true');
        window.location.href = "../../index.html";
      })
      .catch((error) => {
        alert("Erro: " + error.message);
      });
  });
}
