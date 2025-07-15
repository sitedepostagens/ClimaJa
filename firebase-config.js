// Importação correta via CDN para uso em navegador
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCMTSLhey7MMtXy_xV2oSuPe18Tl7sLucY",
  authDomain: "asenha-project-site.firebaseapp.com",
  databaseURL: "https://asenha-project-site-default-rtdb.firebaseio.com",
  projectId: "asenha-project-site",
  storageBucket: "asenha-project-site.firebasestorage.app",
  messagingSenderId: "393532682519",
  appId: "1:393532682519:web:d16a441d5428c676128752",
  measurementId: "G-38CG9H4XV8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Firebase Auth for use in other scripts
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
export const auth = getAuth(app);
window.auth = auth;