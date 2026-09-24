const productsEl = document.querySelector("#products");
const filtersEl = document.querySelector("#filters");
const drawer = document.querySelector("#drawer");
const overlay = document.querySelector("#overlay");
const cartItems = document.querySelector("#cartItems");
const cartTotal = document.querySelector("#cartTotal");
const cartCount = document.querySelector("#cartCount");
const exploreBtn = document.querySelector("#exploreStore");

let products = [];
let cart = JSON.parse(localStorage.getItem("btp-cart") || "[]");
let current = "All";

const categories = ["All", "Businesses", "Vehicles", "MLOs"];

const money = (n) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(n) || 0);

async function load() {
  try {
    const response = await fetch("/api/products", { cache: "no-store" });

    if (!response.ok) throw new Error("Products request failed");

    products = await response.json();

    renderFilters();
    render();
    renderCart();
  } catch (error) {
    console.error("Store load error:", error);
    productsEl.innerHTML = `
      <div class="storeMessage">
        <h3>Store temporarily unavailable</h3>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
    renderFilters();
    renderCart();
  }
}

function renderFilters() {
  // Critical: remove the old buttons before creating new ones.
  filtersEl.replaceChildren();

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter${current === category ? " active" : ""}`;
    button.textContent = category;

    button.addEventListener("click", () => {
      current = category;
      renderFilters();
      render();
    });

    filtersEl.appendChild(button);
  });
}

function render() {
  productsEl.replaceChildren();

  const filtered = products.filter(
    (product) => current === "All" || product.type === current
  );

  if (!filtered.length) {
    productsEl.innerHTML = `
      <div class="storeMessage">
        <h3>No products in this category yet.</h3>
        <p>Check back soon for new additions.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((product) => {
    const card = document.createElement("article");
    card.className = "card";

    const image = product.image || "";
    const description = product.description || "";
    const type = product.type || "Product";

    card.innerHTML = `
      <div class="cardImg" style="background-image:url('${image.replace(/'/g, "\\'")}')">
        <span class="tag">${type}</span>
      </div>
      <div class="cardBody">
        <h3>${product.name || "Product"}</h3>
        <p>${description}</p>
        <div class="cardBottom">
          <span class="price">${money(product.price)}</span>
          <button class="add" type="button">ADD TO CART</button>
        </div>
      </div>
    `;

    card.querySelector(".add").addEventListener("click", () => add(product.id));
    productsEl.appendChild(card);
  });
}

function add(id) {
  if (!cart.includes(id)) cart.push(id);
  save();
  openCart();
}

function remove(id) {
  cart = cart.filter((item) => String(item) !== String(id));
  save();
}

function save() {
  localStorage.setItem("btp-cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const selected = cart
    .map((id) => products.find((product) => String(product.id) === String(id)))
    .filter(Boolean);

  cartCount.textContent = selected.length;

  if (!selected.length) {
    cartItems.innerHTML = `<p class="emptyCart">Your cart is empty.</p>`;
  } else {
    cartItems.innerHTML = selected
      .map(
        (product) => `
          <div class="cartItem">
            <span>${product.name}<br><small>${money(product.price)}</small></span>
            <button class="remove" type="button" data-id="${product.id}">REMOVE</button>
          </div>
        `
      )
      .join("");

    cartItems.querySelectorAll(".remove").forEach((button) => {
      button.addEventListener("click", () => {
        remove(button.dataset.id);
        renderCart();
      });
    });
  }

  cartTotal.textContent = money(
    selected.reduce((total, product) => total + (Number(product.price) || 0), 0)
  );
}

function openCart() {
  drawer.classList.add("open");
  overlay.classList.add("show");
  renderCart();
}

function closeCart() {
  drawer.classList.remove("open");
  overlay.classList.remove("show");
}

document.querySelector("#cartBtn")?.addEventListener("click", openCart);
document.querySelector("#closeCart")?.addEventListener("click", closeCart);
overlay?.addEventListener("click", closeCart);

document.querySelector("#checkout")?.addEventListener("click", async () => {
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  const checkoutButton = document.querySelector("#checkout");
  checkoutButton.disabled = true;
  checkoutButton.textContent = "LOADING...";

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: cart }),
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || "Checkout could not be created.");
    }
  } catch (error) {
    console.error("Checkout error:", error);
    alert(error.message || "Checkout could not be created.");
    checkoutButton.disabled = false;
    checkoutButton.textContent = "CHECKOUT WITH STRIPE";
  }
});

// Reliable Explore button: use JS as a fallback as well as the anchor target.
if (exploreBtn) {
  exploreBtn.addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelector("#store")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

load();
