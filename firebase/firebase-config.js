import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMTSLhey7MMtXy_xV2oSuPe18Tl7sLucY",
  authDomain: "asenha-project-site.firebaseapp.com",
  projectId: "asenha-project-site",
  storageBucket: "asenha-project-site.firebasestorage.app",
  messagingSenderId: "393532682519",
  appId: "1:393532682519:web:d16a441d5428c676128752",
  measurementId: "G-38CG9H4XV8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
