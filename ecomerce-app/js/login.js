import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAWnl9yrw4__RqblJD6oTIFCCFbKej4QiI",
  authDomain: "ecomerce-app-8789d.firebaseapp.com",
  projectId: "ecomerce-app-8789d",
  storageBucket: "ecomerce-app-8789d.firebasestorage.app",
  messagingSenderId: "360273478776",
  appId: "1:360273478776:web:bfa2f20e7bce3c0171198d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// helper keys for remembering email
const REMEMBER_KEY = "rememberedEmail";
const REMEMBER_EXP_KEY = "rememberExpiry";

const toastContainer = document.getElementById("toastContainer");

function showToast(message, type = "default") {
  if (!toastContainer) {
    return;
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  if (type === "success") {
    toast.classList.add("toast-success");
  } else if (type === "error") {
    toast.classList.add("toast-error");
  }
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2600);
}

const tabSignIn = document.getElementById("tabSignIn");
const tabSignUp = document.getElementById("tabSignUp");
const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");
const rememberCheckbox = document.getElementById("rememberMe");

// clear inputs on load to prevent any previous data remaining
window.addEventListener("DOMContentLoaded", () => {
  // clear any values (browser autofill may populate after reset)
  signInForm.reset();
  document.getElementById("signInEmail").value = "";
  document.getElementById("signInPassword").value = "";
  signUpForm.reset();
  document.getElementById("signUpEmail").value = "";
  document.getElementById("signUpPassword").value = "";
  // restore email if remembered and not expired
  const expiry = localStorage.getItem(REMEMBER_EXP_KEY);
  const email = localStorage.getItem(REMEMBER_KEY);
  if (email && expiry && Date.now() < parseInt(expiry, 10)) {
    document.getElementById("signInEmail").value = email;
    rememberCheckbox.checked = true;
  } else {
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(REMEMBER_EXP_KEY);
  }
});

tabSignIn.addEventListener("click", () => {
  tabSignIn.classList.add("tab-active");
  tabSignUp.classList.remove("tab-active");
  signInForm.classList.remove("form-hidden");
  signUpForm.classList.add("form-hidden");
});

tabSignUp.addEventListener("click", () => {
  tabSignUp.classList.add("tab-active");
  tabSignIn.classList.remove("tab-active");
  signUpForm.classList.remove("form-hidden");
  signInForm.classList.add("form-hidden");
});

signUpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("signUpEmail").value.trim();
  const password = document.getElementById("signUpPassword").value;
  if (!email || !password) {
    showToast("Enter email and password", "error");
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showToast(
      "Welcome! Account created. Sign in to explore the shop.",
      "success",
    );
    tabSignIn.click();
  } catch (error) {
    const message = error && error.message ? error.message : "Sign up failed";
    showToast(message, "error");
  }
});

signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("signInEmail").value.trim();
  const password = document.getElementById("signInPassword").value;
  const remember = rememberCheckbox.checked;
  if (!email || !password) {
    showToast("Enter email and password", "error");
    return;
  }
  try {
    // adjust persistence based on remember checkbox
    if (remember) {
      await setPersistence(auth, browserLocalPersistence);
      // store email with 2 week expiry
      const expiry = Date.now() + 14 * 24 * 60 * 60 * 1000;
      localStorage.setItem(REMEMBER_KEY, email);
      localStorage.setItem(REMEMBER_EXP_KEY, expiry.toString());
    } else {
      await setPersistence(auth, browserSessionPersistence);
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(REMEMBER_EXP_KEY);
    }

    await signInWithEmailAndPassword(auth, email, password);
    showToast("Welcome back! Explore our latest products.", "success");
    setTimeout(() => {
      window.location.href = "shop.html";
    }, 1200);
  } catch (error) {
    const message = error && error.message ? error.message : "Sign in failed";
    showToast(message, "error");
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "shop.html";
  }
});
