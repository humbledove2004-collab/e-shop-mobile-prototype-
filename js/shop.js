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
  deleteDoc,
  doc,
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
const productSort = document.getElementById("productSort");
const productsGrid = document.getElementById("productsGrid");
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

// Lightbox Quantity
const qtyDec = document.getElementById("qtyDec");
const qtyInc = document.getElementById("qtyInc");
const lightboxQty = document.getElementById("lightboxQty");

// New UI Elements
const stickyBar = document.getElementById("stickyBar");
const stickyItemCount = document.getElementById("stickyItemCount");
const stickyTotal = document.getElementById("stickyTotal");
const stickyGoToCart = document.getElementById("stickyGoToCart");
const clearCartBtn = document.getElementById("clearCartBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const confModal = document.getElementById("confModal");
const confOrderRef = document.getElementById("confOrderRef");
const confClose = document.getElementById("confClose");
const currencySelector = document.getElementById("currencySelector");
const categoryChips = document.querySelectorAll(".category-chip");

// Currency Configuration
const CURRENCY_CONFIG = {
  USD: { symbol: "$", rate: 1 },
  GHS: { symbol: "GH₵", rate: 15.5 }, // Approximate rate
  ZAR: { symbol: "R", rate: 19.0 },   // Approximate rate
  NGN: { symbol: "₦", rate: 1600.0 }  // Approximate rate
};

let currentCurrency = "USD";
let activeCategory = "all";
let currentLightboxProduct = null;
const cart = [];

// Initial Load Simulation (Skeleton Loader)
async function initShop() {
  const originalHTML = productsGrid.innerHTML;
  
  // Show skeletons
  productsGrid.innerHTML = Array(6).fill('<div class="product-card skeleton" style="height: 280px;"></div>').join("");
  
  // Simulate delay
  await new Promise(r => setTimeout(r, 1000));
  
  productsGrid.innerHTML = originalHTML;
  updateDisplayCurrencies();
  refreshProductCards();
}

function refreshProductCards() {
  const cards = document.querySelectorAll(".product-card");
  cards.forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("add-to-cart")) return;
      openLightbox(card);
    });
    
    const addBtn = card.querySelector(".add-to-cart");
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        addToCartFromCard(card);
      });
    }
  });
}

function openLightbox(card) {
  const name = card.getAttribute("data-name");
  const priceBase = parseFloat(card.getAttribute("data-price"));
  const description = card.getAttribute("data-description");
  const image = card.querySelector(".product-image").src;
  const category = card.querySelector(".product-category").textContent;

  currentLightboxProduct = card;
  lightboxQty.value = 1; // Reset quantity

  lightboxImage.src = image;
  lightboxTitle.textContent = name;
  lightboxCategory.textContent = category;
  lightboxDescription.textContent = description;
  lightboxPrice.textContent = formatCurrency(priceBase);

  productLightbox.classList.add("active");
  document.body.style.overflow = "hidden";
}

qtyInc.addEventListener("click", () => {
  lightboxQty.value = parseInt(lightboxQty.value) + 1;
});

qtyDec.addEventListener("click", () => {
  const val = parseInt(lightboxQty.value);
  if (val > 1) lightboxQty.value = val - 1;
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
    const qty = parseInt(lightboxQty.value);
    addToCartFromCard(currentLightboxProduct, qty);
    productLightbox.classList.remove("active");
    document.body.style.overflow = "";
  }
});

// Category Filter Logic
categoryChips.forEach(chip => {
  chip.addEventListener("click", () => {
    categoryChips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeCategory = chip.getAttribute("data-category");
    filterProducts();
  });
});

function filterProducts() {
  const term = productSearch.value.toLowerCase();
  const cards = document.querySelectorAll(".product-card");
  
  cards.forEach((card) => {
    const name = card.getAttribute("data-name").toLowerCase();
    const category = card.querySelector(".product-category").textContent.toLowerCase();
    
    const matchesSearch = name.includes(term) || category.includes(term);
    const matchesCategory = activeCategory === "all" || category === activeCategory;
    
    card.style.display = (matchesSearch && matchesCategory) ? "flex" : "none";
  });
}

// Sorting logic
productSort.addEventListener("change", () => {
  const mode = productSort.value;
  const cards = Array.from(document.querySelectorAll(".product-card"));
  
  cards.sort((a, b) => {
    const nameA = a.getAttribute("data-name").toLowerCase();
    const nameB = b.getAttribute("data-name").toLowerCase();
    const priceA = parseFloat(a.getAttribute("data-price"));
    const priceB = parseFloat(b.getAttribute("data-price"));
    
    if (mode === "price-low") return priceA - priceB;
    if (mode === "price-high") return priceB - priceA;
    if (mode === "name") return nameA.localeCompare(nameB);
    return 0;
  });
  
  productsGrid.innerHTML = "";
  cards.forEach(c => productsGrid.appendChild(c));
  // Re-attach listeners after moving elements
  refreshProductCards();
});

// Tab switching logic
shopNavItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    shopNavItems.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    shopSections.forEach((sec) => {
      sec.classList.toggle("active", sec.id === target);
    });
    renderCart(); // Update sticky bar visibility based on tab
  });
});

// Sticky bar button
stickyGoToCart.addEventListener("click", () => {
  const cartBtn = Array.from(shopNavItems).find(btn => btn.getAttribute("data-target") === "cartSection");
  if (cartBtn) cartBtn.click();
});

clearCartBtn.addEventListener("click", () => {
  if (cart.length > 0 && confirm("Are you sure you want to clear your cart?")) {
    cart.length = 0;
    renderCart();
    showToast("Cart cleared", "default");
  }
});

clearHistoryBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  
  if (confirm("Are you sure you want to clear your entire order history? This cannot be undone.")) {
    showToast("Clearing history...", "default");
    try {
      const q = query(collection(db, "orders"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = [];
      querySnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, "orders", document.id)));
      });
      
      await Promise.all(deletePromises);
      showToast("Order history cleared", "success");
      loadOrderHistory(user.uid);
    } catch (error) {
      console.error("Error clearing history:", error);
      showToast("Failed to clear history", "error");
    }
  }
});

// Confirmation Modal button
confClose.addEventListener("click", () => {
  confModal.classList.remove("active");
  const ordersBtn = Array.from(shopNavItems).find(btn => btn.getAttribute("data-target") === "ordersSection");
  if (ordersBtn) ordersBtn.click();
});

// Order History
async function loadOrderHistory(userId) {
  if (!orderHistoryList) return;
  
  // Show skeleton/loading state for orders
  orderHistoryList.innerHTML = '<div class="order-item-history skeleton" style="height: 60px;"></div>';
  
  try {
    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    // Artificial delay for effect
    await new Promise(r => setTimeout(r, 600));
    
    orderHistoryList.innerHTML = "";
    
    if (querySnapshot.empty) {
      orderHistoryList.textContent = "No past orders found.";
      return;
    }

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
    console.error("Error loading orders:", error);
    orderHistoryList.textContent = "Failed to load order history.";
  }
}

// Search functionality
productSearch.addEventListener("input", (e) => {
  filterProducts();
});

function formatCurrency(amountBase) {
  const config = CURRENCY_CONFIG[currentCurrency];
  const convertedAmount = amountBase * config.rate;
  return config.symbol + " " + convertedAmount.toFixed(2);
}

// Update all prices on page
function updateDisplayCurrencies() {
  // Update Product Cards
  const cards = document.querySelectorAll(".product-card");
  cards.forEach(card => {
    const priceBase = parseFloat(card.getAttribute("data-price"));
    const priceSpan = card.querySelector(".price");
    if (priceSpan) priceSpan.textContent = formatCurrency(priceBase);
  });
  
  // Re-render cart to update symbols/rates
  renderCart();
  
  // Update Lightbox if open
  if (productLightbox.classList.contains("active") && currentLightboxProduct) {
    const priceBase = parseFloat(currentLightboxProduct.getAttribute("data-price"));
    lightboxPrice.textContent = formatCurrency(priceBase);
  }
}

// Currency Selector change
currencySelector.addEventListener("change", (e) => {
  currentCurrency = e.target.value;
  updateDisplayCurrencies();
  showToast(`Currency changed to ${currentCurrency}`, "success");
});

function renderCart() {
  cartItemsEl.innerHTML = "";
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!cart.length) {
    cartItemsEl.textContent = "Your cart is empty.";
    cartTotalEl.textContent = formatCurrency(0);
    stickyBar.classList.remove("active");
    return;
  }
  
  cart.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.style.alignItems = "center";
    
    row.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:600;">${item.name}</div>
        <div style="font-size:12px; color:var(--text-muted);">${formatCurrency(item.price * item.quantity)}</div>
      </div>
      <div class="cart-qty-row">
        <button class="cart-qty-btn dec-cart" data-index="${index}">−</button>
        <span style="font-weight:700; min-width:20px; text-align:center;">${item.quantity}</span>
        <button class="cart-qty-btn inc-cart" data-index="${index}">+</button>
      </div>
    `;
    cartItemsEl.appendChild(row);
  });

  // Attach cart button listeners
  document.querySelectorAll(".dec-cart").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = btn.getAttribute("data-index");
      if (cart[idx].quantity > 1) {
        cart[idx].quantity--;
      } else {
        cart.splice(idx, 1);
      }
      renderCart();
    });
  });
  
  document.querySelectorAll(".inc-cart").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = btn.getAttribute("data-index");
      cart[idx].quantity++;
      renderCart();
    });
  });
  
  cartTotalEl.textContent = formatCurrency(total);

  // Update sticky bar
  stickyItemCount.textContent = count;
  stickyTotal.textContent = formatCurrency(total);
  
  // Show sticky bar only on Products tab and if cart not empty
  const activeTab = document.querySelector(".shop-nav-item.active").getAttribute("data-target");
  if (activeTab === "productsSection" && cart.length > 0) {
    stickyBar.classList.add("active");
  } else {
    stickyBar.classList.remove("active");
  }
}

function addToCartFromCard(card, qty = 1) {
  const id = card.getAttribute("data-id");
  const name = card.getAttribute("data-name");
  const price = Number(card.getAttribute("data-price"));
  const existing = cart.find((item) => item.id === id);
  
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ id, name, price, quantity: qty });
  }
  
  // Micro-interaction animation
  card.classList.add("add-to-cart-animate");
  setTimeout(() => card.classList.remove("add-to-cart-animate"), 300);

  showToast(`Added ${qty} ${name} to cart`, "success");
  renderCart();
}

// Initial card setup
initShop();

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
    
    // Show Confirmation Modal
    confOrderRef.textContent = `Ref: #${transactionId}`;
    confModal.classList.add("active");
    
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

