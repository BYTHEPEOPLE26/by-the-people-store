const productsEl = document.querySelector('#products');
const filtersEl = document.querySelector('#filters');
const drawer = document.querySelector('#drawer');
const overlay = document.querySelector('#overlay');
const cartItems = document.querySelector('#cartItems');
const cartTotal = document.querySelector('#cartTotal');
const cartCount = document.querySelector('#cartCount');
const modal = document.querySelector('#productModal');
const modalTitle = document.querySelector('#modalTitle');
const modalPrice = document.querySelector('#modalPrice');
const modalDescription = document.querySelector('#modalDescription');
const modalMain = document.querySelector('#modalMain');
const modalThumbs = document.querySelector('#modalThumbs');
const modalAdd = document.querySelector('#modalAdd');
const modalClose = document.querySelector('#modalClose');
const exploreBtn = document.querySelector('#exploreStore');

let products = [];
let cart = JSON.parse(localStorage.getItem('btp-cart') || '[]');
let current = 'All';
let currentProduct = null;

const categories = ['All', 'Businesses', 'Vehicles', 'MLOs'];
const money = n => new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP' }).format(Number(n) || 0);
const priceLabel = p => p.billing === 'monthly' ? `${money(p.price)}/month` : money(p.price);
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imageUrl = file => `/images/public/images/products/${encodeURIComponent(file)}`;

async function load(){
  try {
    const response = await fetch('/api/products', {cache:'no-store'});
    if(!response.ok) throw new Error('Products request failed');
    products = await response.json();
    renderFilters();
    render();
    renderCart();
  } catch(error){
    console.error(error);
    productsEl.innerHTML = `<div class="storeMessage"><h3>Store temporarily unavailable</h3><p>Please refresh the page and try again.</p></div>`;
    renderFilters();
  }
}

function renderFilters(){
  filtersEl.replaceChildren();
  categories.forEach(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter${current === category ? ' active' : ''}`;
    button.textContent = category;
    button.addEventListener('click', () => { current = category; renderFilters(); render(); });
    filtersEl.appendChild(button);
  });
}

function render(){
  productsEl.replaceChildren();
  const filtered = products.filter(p => current === 'All' || p.type === current);
  if(!filtered.length){
    productsEl.innerHTML = `<div class="storeMessage"><h3>No products in this category yet.</h3><p>Check back soon for new additions.</p></div>`;
    return;
  }

  filtered.forEach(product => {
    const card = document.createElement('article');
    card.className = 'card';
    const stockText = product.stock === 1 ? '1 AVAILABLE' : `${product.stock} AVAILABLE`;
    const stockClass = product.stock <= 0 ? ' soldOut' : '';
    card.innerHTML = `
      <div class="cardImg" style="background-image:url('${imageUrl(product.images[0])}')">
        <span class="tag">${safe(product.type)}</span>
        <button class="photoBtn" type="button">VIEW PHOTOS${product.images.length > 1 ? ` (${product.images.length})` : ''}</button>
      </div>
      <div class="cardBody">
        <div class="productMeta"><span>${product.billing === 'monthly' ? 'MONTHLY SUBSCRIPTION' : 'ONE-TIME PURCHASE'}</span><b class="stock${stockClass}">${product.stock > 0 ? stockText : 'SOLD OUT'}</b></div>
        <h3>${safe(product.name)}</h3>
        <p>${safe(product.description)}</p>
        <div class="cardBottom">
          <span class="price">${priceLabel(product)}</span>
          <button class="add" type="button" ${product.stock <= 0 ? 'disabled' : ''}>${product.stock <= 0 ? 'SOLD OUT' : 'ADD TO CART'}</button>
        </div>
      </div>`;
    card.querySelector('.photoBtn').addEventListener('click', () => openProduct(product));
    card.querySelector('.add').addEventListener('click', () => add(product.id));
    productsEl.appendChild(card);
  });
}

function add(id){
  const product = products.find(p => p.id === id);
  if(!product || product.stock <= 0) return alert('This product is currently sold out.');
  if(cart.length){
    const existing = products.find(p => p.id === cart[0]);
    if(existing && existing.billing !== product.billing){
      return alert('Please checkout one payment type at a time. Vehicles are one-time purchases, while houses/businesses/MLOs are monthly subscriptions.');
    }
  }
  if(!cart.includes(id)) cart.push(id);
  save();
  openCart();
}

function remove(id){ cart = cart.filter(x => String(x) !== String(id)); save(); }
function save(){ localStorage.setItem('btp-cart', JSON.stringify(cart)); renderCart(); }

function renderCart(){
  const selected = cart.map(id => products.find(p => String(p.id) === String(id))).filter(Boolean);
  cartCount.textContent = selected.length;
  if(!selected.length){
    cartItems.innerHTML = '<p class="emptyCart">Your cart is empty.</p>';
  } else {
    cartItems.innerHTML = selected.map(p => `
      <div class="cartItem">
        <span>${safe(p.name)}<br><small>${priceLabel(p)}</small></span>
        <button class="remove" type="button" data-id="${safe(p.id)}">REMOVE</button>
      </div>`).join('');
    cartItems.querySelectorAll('.remove').forEach(button => button.addEventListener('click', () => remove(button.dataset.id)));
  }
  const total = selected.reduce((sum,p) => sum + (Number(p.price)||0), 0);
  const monthly = selected.some(p => p.billing === 'monthly');
  cartTotal.textContent = `${money(total)}${monthly ? '/month' : ''}`;
}

function openCart(){ drawer.classList.add('open'); overlay.classList.add('show'); renderCart(); }
function closeCart(){ drawer.classList.remove('open'); overlay.classList.remove('show'); }

document.querySelector('#cartBtn')?.addEventListener('click', openCart);
document.querySelector('#closeCart')?.addEventListener('click', closeCart);
overlay?.addEventListener('click', closeCart);

function openProduct(product){
  currentProduct = product;
  modalTitle.textContent = product.name;
  modalPrice.textContent = priceLabel(product);
  modalDescription.textContent = product.description;
  modalMain.src = imageUrl(product.images[0]);
  modalThumbs.innerHTML = product.images.map((file, i) => `<button type="button" class="thumb${i===0?' active':''}" data-file="${safe(file)}"><img src="${imageUrl(file)}" alt="${safe(product.name)}"></button>`).join('');
  modalThumbs.querySelectorAll('.thumb').forEach(btn => btn.addEventListener('click', () => {
    modalMain.src = imageUrl(btn.dataset.file);
    modalThumbs.querySelectorAll('.thumb').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
  }));
  modalAdd.disabled = product.stock <= 0;
  modalAdd.textContent = product.stock <= 0 ? 'SOLD OUT' : 'ADD TO CART';
  modal.classList.add('show');
  document.body.classList.add('modalOpen');
}
function closeProduct(){ modal.classList.remove('show'); document.body.classList.remove('modalOpen'); currentProduct = null; }
modalClose?.addEventListener('click', closeProduct);
modal?.addEventListener('click', e => { if(e.target === modal) closeProduct(); });
modalAdd?.addEventListener('click', () => { if(currentProduct){ add(currentProduct.id); closeProduct(); } });

document.querySelector('#checkout')?.addEventListener('click', async () => {
  if(!cart.length) return alert('Your cart is empty.');
  const button = document.querySelector('#checkout');
  button.disabled = true;
  button.textContent = 'LOADING...';
  try {
    const response = await fetch('/api/create-checkout-session', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({productIds:cart})
    });
    const data = await response.json();
    if(data.url) window.location.href = data.url;
    else throw new Error(data.error || 'Checkout could not be created.');
  } catch(error){
    console.error(error);
    alert(error.message || 'Checkout could not be created.');
    button.disabled = false;
    button.textContent = 'CHECKOUT WITH STRIPE';
  }
});

if(exploreBtn) exploreBtn.addEventListener('click', e => { e.preventDefault(); document.querySelector('#store')?.scrollIntoView({behavior:'smooth'}); });

document.querySelectorAll('.categoryCard').forEach(card => card.addEventListener('click', () => {
  const wanted = card.dataset.category;
  document.querySelector('#store').scrollIntoView({behavior:'smooth'});
  setTimeout(() => {
    const match = [...document.querySelectorAll('#filters .filter')].find(btn => btn.textContent.trim().toLowerCase() === wanted.toLowerCase());
    if(match) match.click();
  }, 350);
}));

load();
