import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDU5ubRhulfZtNcv7MkKNoMy7xTu9l2WUE",
  authDomain: "login-sistema-c46ff.firebaseapp.com",
  projectId: "login-sistema-c46ff",
  storageBucket: "login-sistema-c46ff.appspot.com",
  messagingSenderId: "356267105486",
  appId: "1:356267105486:web:afe409f8d23993eeaa449f",
  measurementId: "G-ND9YWZVVZ7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
