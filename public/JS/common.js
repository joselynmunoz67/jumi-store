// -----------------------------
// CATEGORÍAS DE PRODUCTOS
// -----------------------------
const CATS = [
  'Dulces',
  'Chocolates',
  'Gomitas',
  'Labiales',
  'Sombras',
  'Skincare',
  'Uñas'
];

// -----------------------------
// VARIABLES PRINCIPALES
// -----------------------------
let U = JSON.parse(localStorage.u || 'null');
let T = localStorage.t || '';
let cart = JSON.parse(localStorage.cart || '[]');
let PC = {};

// -----------------------------
// FUNCIONES GENERALES
// -----------------------------

// Seleccionar elementos HTML
const $ = s => document.querySelector(s);

// Proteger textos
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

// Formato de dinero
const money = n => '$' + Number(n).toLocaleString('es-CO');

// Mostrar estrellas
const stars = n => {
  n = Math.round(n);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
};

// -----------------------------
// CONEXIÓN CON LA API
// -----------------------------
async function api(p, m = 'GET', b) {

  const r = await fetch('/api' + p, {
    method: m,

    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + T
    },

    body: b ? JSON.stringify(b) : undefined
  });

  const d = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(d.error || 'Ocurrió un error');
  }

  return d;
}

// -----------------------------
// VENTANAS MODALES
// -----------------------------
const modal = h => {
  $('#mc').innerHTML = h;
  $('#m').classList.add('on');
};

// Cerrar ventana modal
const cerrar = () => $('#m').classList.remove('on');

// Mostrar errores
const err = x => {

  const m = $('#err');

  if (m) {
    m.textContent = x.message;
  } else {
    alert(x.message);
  }
};

// -----------------------------
// CONTROL DE ACCESO
// -----------------------------
function proteger(roles) {

  if (!U || (roles && !roles.includes(U.rol))) {

    location.href = 'login.html';

    throw new Error('Sin acceso');
  }
}

// Iniciar sesión
function sesion(d) {

  localStorage.u = JSON.stringify(d.user);
  localStorage.t = d.token;

  location.href = 'index.html';
}

// Cerrar sesión
function salir() {

  localStorage.removeItem('u');
  localStorage.removeItem('t');

  location.href = 'index.html';
}

// -----------------------------
// ESTRUCTURA PRINCIPAL
// -----------------------------
function layout() {

  document.body.insertAdjacentHTML('afterbegin', `
    <header>

      <h1>
        <a href="index.html">🍬 Jumis Store</a>
      </h1>

      <input
        id="bus"
        placeholder="Buscar dulces y maquillaje..."
        onkeydown="if(event.key=='Enter')location.href='index.html?q='+encodeURIComponent(this.value)"
      >

      <nav id="nav"></nav>

    </header>
  `);

  document.body.insertAdjacentHTML('beforeend', `
    <aside id="cart"></aside>

    <div
      class="modal"
      id="m"
      onclick="if(event.target==this)cerrar()"
    >
      <div id="mc"></div>
    </div>
  `);

  nav();
}

// -----------------------------
// MENÚ DE NAVEGACIÓN
// -----------------------------
function nav() {

  const n = cart.reduce((a, i) => a + i.cantidad, 0);

  $('#nav').innerHTML =

    `<a class="btn s" href="index.html">Tienda</a>
    <a class="btn s" href="favoritos.html">♥ Favoritos</a>`

    + (U

      ? `<a class="btn s" href="pedidos.html">Mis compras</a>`

        + (U.rol != 'cliente'
          ? `<a class="btn s" href="vender.html">Vender</a>`
          : '')

        + (U.rol == 'admin'
          ? `<a class="btn s" href="admin.html">Admin</a>`
          : '')

        + `<button onclick="salir()">Salir (${e(U.nombre)})</button>`

      : `<a class="btn" href="login.html">Ingresar</a>`)

    + `<a class="btn s" href="contacto.html">Contacto</a>
    <button onclick="toggleCart()">🛒 ${n}</button>`;
}

// -----------------------------
// TARJETAS DE PRODUCTOS
// -----------------------------
const card = (p, f) => {

  PC[p.id] = p;

  return `
    <div class="card">

      ${p.imagen
        ? `<img src="${e(p.imagen)}" alt="${e(p.nombre)}">`
        : '<div class="ph"></div>'}

      <div class="info">

        <b>${e(p.nombre)}</b>

        <small>
          ${e(p.categoria)} · vende ${e(p.vendedor)}
        </small>

        <span class="st">
          ${stars(p.rating)} (${p.resenas})
        </span>

        <span class="pr">
          ${money(p.precio)}
        </span>

        <small>
          ${p.stock > 0 ? p.stock + ' disponibles' : 'Agotado'}
        </small>

        <div class="row">

          <button
            ${p.stock < 1 ? 'disabled' : ''}
            onclick="add(${p.id})"
          >
            Agregar
          </button>

          <button
            class="s"
            onclick="fav(${p.id})"
            aria-label="Favorito"
          >
            ${f ? '♥' : '♡'}
          </button>

        </div>
      </div>
    </div>
  `;
};

// Agregar a favoritos
async function fav(id) {

  if (!U) {
    location.href = 'login.html';
    return;
  }

  await api('/favoritos/' + id, 'POST');

  recargar();
}

// -----------------------------
// FUNCIONES DEL CARRITO
// -----------------------------

// Guardar carrito
function saveCart() {

  localStorage.cart = JSON.stringify(cart);

  nav();
  drawCart();
}

// Agregar producto
function add(id) {

  const p = PC[id];
  const i = cart.find(x => x.id == id);

  if (i) {

    if (i.cantidad < p.stock) {
      i.cantidad++;
    }

  } else {

    cart.push({
      id,
      nombre: p.nombre,
      precio: p.precio,
      cantidad: 1,
      stock: p.stock
    });
  }

  saveCart();

  $('#cart').classList.add('on');
}

// Cambiar cantidad de productos
function qty(id, d) {

  const i = cart.find(x => x.id == id);

  i.cantidad += d;

  if (i.cantidad > i.stock) {
    i.cantidad = i.stock;
  }

  if (i.cantidad < 1) {
    cart = cart.filter(x => x.id != id);
  }

  saveCart();
}

// Abrir o cerrar carrito
const toggleCart = () => {

  drawCart();

  $('#cart').classList.toggle('on');
};

// Mostrar contenido del carrito
function drawCart() {

  const t = cart.reduce(
    (a, i) => a + i.precio * i.cantidad,
    0
  );

  $('#cart').innerHTML = `

    <div style="display:flex;justify-content:space-between">

      <h2>Mi carrito</h2>

      <button class="s" onclick="toggleCart()">
        ✖
      </button>

    </div>

    ${cart.map(i => `
      <div class="box">

        <b>${e(i.nombre)}</b><br>

        ${money(i.precio)} × ${i.cantidad}

        <div class="row" style="margin-top:8px">

          <button class="s" onclick="qty(${i.id}, -1)">
            −
          </button>

          <button class="s" onclick="qty(${i.id}, 1)">
            +
          </button>

        </div>
      </div>
    `).join('') || '<p>Tu carrito está vacío.</p>'}

    <h3>Total: ${money(t)}</h3>

    <button
      style="width:100%"
      ${cart.length ? '' : 'disabled'}
      onclick="pago()"
    >
      Finalizar compra
    </button>
  `;
}

// -----------------------------
// PROCESO DE PAGO
// -----------------------------
function pago() {

  if (!U) {
    location.href = 'login.html';
    return;
  }

  modal(`
    <h2>Finalizar compra</h2>

    <h3>
      ${money(cart.reduce((a, i) => a + i.precio * i.cantidad, 0))}
    </h3>

    <select id="met">
      <option>PSE</option>
      <option>Nequi</option>
      <option>Daviplata</option>
      <option>PayPal</option>
    </select>

    <p class="msg" id="err"></p>

    <button
      style="width:100%"
      onclick="pagar()"
    >
      Pagar ahora
    </button>
  `);
}

// Ejecutar pago
async function pagar() {

  try {

    const r = await api('/pedidos', 'POST', {
      items: cart,
      metodo: $('#met').value
    });

    cart = [];

    saveCart();

    $('#cart').classList.remove('on');

    factura(r.id);

  } catch (x) {

    err(x);
  }
}

// -----------------------------
// GENERAR FACTURA
// -----------------------------
async function factura(id) {

  const o = await api('/pedidos/' + id);

  modal(`
    <div id="fac">

      <h2>🍬 Jumis Store</h2>

      <h3>Factura N° ${o.id}</h3>

      <p>
        Fecha: ${new Date(o.fecha).toLocaleString('es-CO')}<br>
        Cliente: ${e(o.cliente)} (${e(o.correo)})<br>
        Pago: ${e(o.metodo)}
      </p>

      <table>

        <tr>
          <th>Producto</th>
          <th>Cant.</th>
          <th>Precio</th>
          <th>Subtotal</th>
        </tr>

        ${o.items.map(i => `
          <tr>
            <td>${e(i.nombre)}</td>
            <td>${i.cantidad}</td>
            <td>${money(i.precio)}</td>
            <td>${money(i.precio * i.cantidad)}</td>
          </tr>
        `).join('')}

      </table>

      <h3>Total: ${money(o.total)}</h3>

    </div>

    <div class="row">

      <button onclick="print()">
        Imprimir
      </button>

      <button
        class="s"
        onclick="cerrar();if(typeof pedidos==='function')pedidos();else location.href='pedidos.html'"
      >
        Cerrar
      </button>

    </div>
  `);
}

// -----------------------------
// INICIAR ESTRUCTURA
// -----------------------------
layout();