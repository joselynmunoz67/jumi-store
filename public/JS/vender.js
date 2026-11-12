proteger(['vendedor', 'admin']);

// Si la dirección trae ?editar=NUMERO, la página entra en modo edición
const idEditar = new URLSearchParams(location.search).get('editar');

const fileData = f => new Promise(r => {
  if (!f) return r('');

  if (f.size > 1.5e6) {
    alert('La imagen pesa más de 1.5 MB');
    return r('');
  }

  const fr = new FileReader();
  fr.onload = () => r(fr.result);
  fr.readAsDataURL(f);
});

async function vender() {
  const ps = await api('/mis-productos');

  let editando = null;

  if (idEditar) {
    const todos = await api('/productos');
    editando = todos.find(p => p.id == idEditar);

    if (!editando) {
      alert('Producto no encontrado');
      location.href = 'vender.html';
      return;
    }
  }

  const p0 = editando || {
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria: CATS[0],
    imagen: ''
  };

  $('#main').innerHTML = `
    <div class="box">
      <h2>${editando ? 'Editar producto' : 'Publicar producto'}</h2>

      <input id="pn" placeholder="Nombre" value="${e(p0.nombre)}">

      <textarea id="pd" placeholder="Descripción">${e(p0.descripcion)}</textarea>

      <input id="pp" type="number" placeholder="Precio" value="${p0.precio}">

      <input id="ps" type="number" min="0" placeholder="Cantidad disponible" value="${p0.stock}">

      <select id="pc">
        ${CATS.map(c => `<option ${c == p0.categoria ? 'selected' : ''}>${c}</option>`).join('')}
      </select>

      ${editando && p0.imagen
        ? `<img src="${e(p0.imagen)}" alt="" style="width:120px;border-radius:10px;display:block;margin:8px 0">`
        : ''
      }

      <input id="pi" type="file" accept="image/*">

      ${editando ? '<small>Deja la imagen vacía para conservar la actual.</small>' : ''}

      <p class="msg" id="err"></p>

      <button onclick="guardar()">
        ${editando ? 'Guardar cambios' : 'Publicar'}
      </button>

      ${editando ? '<a class="btn s" href="vender.html">Cancelar</a>' : ''}
    </div>

    <h2>Mis productos</h2>

    <div class="grid">
      ${ps.map(p => `
        <div>
          ${card(p, false)}

          <div class="row" style="margin-top:8px">
            <a class="btn s" href="vender.html?editar=${p.id}">✏️ Editar</a>
            <button class="s" onclick="borrar(${p.id})">🗑️ Eliminar</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function guardar() {
  try {
    const datos = {
      nombre: $('#pn').value,
      descripcion: $('#pd').value,
      precio: $('#pp').value,
      stock: $('#ps').value,
      categoria: $('#pc').value
    };

    const imagen = await fileData($('#pi').files[0]);

    if (idEditar) {
      if (imagen) datos.imagen = imagen;

      await api('/productos/' + idEditar, 'PUT', datos);
      location.href = 'vender.html';
    } else {
      datos.imagen = imagen;

      await api('/productos', 'POST', datos);
      vender();
    }
  } catch (x) {
    err(x);
  }
}

async function borrar(id) {
  if (!confirm('¿Eliminar este producto?')) return;

  try {
    await api('/productos/' + id, 'DELETE');
    vender();
  } catch (x) {
    alert(x.message);
  }
}

const recargar = vender;

vender();