import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const db = getFirestore(app);

// Stripe Public Key - Get yours from Stripe Dashboard (Developers > API keys)
const STRIPE_PUBLIC_KEY = "pk_test_51T4JdDEubKPeyhMdMwCMwPmcnUmr1XDxbLzuooFhAAcxlWP8hsLuVyCCntzK7F7yWXPanYhHGY00iDpB7UWAjUTC00rUK2XcFi";

// Replace with your Firebase Functions URL after deployment
// Example: https://us-central1-ecomerce-app-8789d.cloudfunctions.net
const FUNCTIONS_BASE_URL = "https://us-central1-ecomerce-app-8789d.cloudfunctions.net";

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

const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const placeOrderButton = document.getElementById("placeOrderButton");
const signOutButton = document.getElementById("signOutButton");
const welcomeBanner = document.getElementById("welcomeBanner");
const productSearch = document.getElementById("productSearch");
const productCards = document.querySelectorAll(".product-card");
const orderHistoryList = document.getElementById("orderHistoryList");
const shopNavItems = document.querySelectorAll(".shop-nav-item");
const shopSections = document.querySelectorAll(".shop-section");

// Lightbox Elements
const productLightbox = document.getElementById("productLightbox");
const closeLightbox = document.getElementById("closeLightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxCategory = document.getElementById("lightboxCategory");
const lightboxDescription = document.getElementById("lightboxDescription");
const lightboxPrice = document.getElementById("lightboxPrice");
const lightboxAddToCart = document.getElementById("lightboxAddToCart");

let currentLightboxProduct = null;

const cart = [];

// Lightbox logic
productCards.forEach((card) => {
  card.addEventListener("click", (e) => {
    // Don't open lightbox if "Add" button was clicked
    if (e.target.classList.contains("add-to-cart")) return;

    const id = card.getAttribute("data-id");
    const name = card.getAttribute("data-name");
    const price = card.getAttribute("data-price");
    const description = card.getAttribute("data-description");
    const image = card.querySelector(".product-image").src;
    const category = card.querySelector(".product-category").textContent;

    currentLightboxProduct = card;

    lightboxImage.src = image;
    lightboxTitle.textContent = name;
    lightboxCategory.textContent = category;
    lightboxDescription.textContent = description;
    lightboxPrice.textContent = "R " + Number(price).toFixed(2);

    productLightbox.classList.add("active");
    document.body.style.overflow = "hidden"; // Prevent scroll
  });
});

closeLightbox.addEventListener("click", () => {
  productLightbox.classList.remove("active");
  document.body.style.overflow = "";
});

productLightbox.addEventListener("click", (e) => {
  if (e.target === productLightbox) {
    productLightbox.classList.remove("active");
    document.body.style.overflow = "";
  }
});

lightboxAddToCart.addEventListener("click", () => {
  if (currentLightboxProduct) {
    addToCartFromCard(currentLightboxProduct);
  }
});

// Tab switching logic
shopNavItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");

    // Update active button
    shopNavItems.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Update visible section
    shopSections.forEach((sec) => {
      if (sec.id === target) {
        sec.classList.add("active");
      } else {
        sec.classList.remove("active");
      }
    });
  });
});

// Order History
async function loadOrderHistory(userId) {
  if (!orderHistoryList) return;
  try {
    // Simplified query to check if it's an index issue
    const q = query(
      collection(db, "orders"),
      where("userId", "==", userId)
      // Temporarily removed orderBy to avoid index requirement
    );
    const querySnapshot = await getDocs(q);
    orderHistoryList.innerHTML = "";
    
    if (querySnapshot.empty) {
      orderHistoryList.textContent = "No past orders found.";
      return;
    }

    // Sort manually in JS to avoid index requirement for now
    const docs = [];
    querySnapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
    docs.sort((a, b) => {
      const dateA = a.createdAt ? a.createdAt.toDate() : 0;
      const dateB = b.createdAt ? b.createdAt.toDate() : 0;
      return dateB - dateA;
    });

    docs.forEach((data) => {
      const date = data.createdAt ? data.createdAt.toDate().toLocaleString() : "Recently placed";
      const div = document.createElement("div");
      div.className = "order-item-history";
      div.innerHTML = `
        <div class="order-date">${date}</div>
        <div class="order-details">
          ${data.items.map(i => `${i.name} (x${i.quantity})`).join(", ")}<br>
          <strong>Total: ${formatCurrency(data.totalAmount)}</strong> - Status: ${data.status}
        </div>
      `;
      orderHistoryList.appendChild(div);
    });
  } catch (error) {
    console.error("Detailed Error loading orders:", error);
    orderHistoryList.innerHTML = `
      <div style="color: #ef4444; font-size: 12px;">
        Failed to load order history.<br>
        Check console for details.
      </div>
    `;
  }
}

// Search functionality
productSearch.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  productCards.forEach((card) => {
    const name = card.getAttribute("data-name").toLowerCase();
    const category = card.querySelector(".product-category").textContent.toLowerCase();
    if (name.includes(term) || category.includes(term)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
});

function formatCurrency(amount) {
  return "R " + amount.toFixed(2);
}

function renderCart() {
  cartItemsEl.innerHTML = "";
  if (!cart.length) {
    cartItemsEl.textContent = "Your cart is empty.";
    cartTotalEl.textContent = formatCurrency(0);
    return;
  }
  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.textContent = item.name + " × " + item.quantity + " (" + formatCurrency(item.price) + ")";
    cartItemsEl.appendChild(row);
  });
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotalEl.textContent = formatCurrency(total);
}

function addToCartFromCard(card) {
  const id = card.getAttribute("data-id");
  const name = card.getAttribute("data-name");
  const price = Number(card.getAttribute("data-price"));
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }
  showToast("Added to cart", "success");
  renderCart();
}

document.querySelectorAll(".add-to-cart").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".product-card");
    addToCartFromCard(card);
  });
});

/**
 * For a real Stripe integration, you usually need a backend to create a Checkout Session.
 * Since this is a prototype, we will simulate the Stripe Checkout redirection and 
 * success flow to demonstrate the integration logic.
 */
async function payWithStripe(user, total) {
  if (STRIPE_PUBLIC_KEY === "pk_test_your_public_key_here") {
    showToast("Please add your Stripe Public Key to js/shop.js", "error");
    console.error("Stripe Public Key missing. See: https://dashboard.stripe.com/test/apikeys");
    return;
  }

  showToast("Connecting to Stripe...", "default");
  
  // Simulate Stripe Checkout process since Cloud Functions require a paid plan
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    showToast("Payment successful! Saving order...", "success");
    const ordersRef = collection(db, "orders");
    const transactionId = "STRIPE_" + Math.floor(Math.random() * 1000000000);
    
    await addDoc(ordersRef, {
      userId: user.uid,
      items: [...cart], // Copy cart items
      totalAmount: total,
      paymentMethod: "Stripe",
      transactionId: transactionId,
      status: "Paid",
      createdAt: serverTimestamp(),
    });

    cart.length = 0;
    renderCart();
    showToast("Order placed successfully!", "success");
    loadOrderHistory(user.uid);
  } catch (error) {
    console.error("Error saving order:", error);
    showToast("Order saving failed. Please contact support.", "error");
  }
}

/**
 * Handle successful payment after redirect back from Stripe
 */
async function handleStripeSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");
  
  if (sessionId && cart.length > 0) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      showToast("Payment successful! Saving your order...", "success");
      const ordersRef = collection(db, "orders");
      
      await addDoc(ordersRef, {
        userId: user.uid,
        items: [...cart], // Copy cart items
        totalAmount: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        paymentMethod: "Stripe",
        transactionId: sessionId,
        status: "Paid",
        createdAt: serverTimestamp(),
      });

      cart.length = 0;
      renderCart();
      showToast("Order placed successfully!", "success");
      loadOrderHistory(user.uid);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error("Error saving order after Stripe success:", error);
      showToast("Order saving failed. Please contact support.", "error");
    }
  }
}

placeOrderButton.addEventListener("click", async () => {
  if (!cart.length) {
    showToast("Cart is empty", "error");
    return;
  }
  const user = auth.currentUser;
  if (!user) {
    showToast("Please sign in again", "error");
    window.location.href = "index.html";
    return;
  }
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  await payWithStripe(user, total);
});

signOutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    showToast("Could not sign out", "error");
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    welcomeBanner.textContent = `Welcome, ${user.email}!`;
    loadOrderHistory(user.uid);
    handleStripeSuccess(); // Check if we just returned from a successful Stripe payment
  }
});

