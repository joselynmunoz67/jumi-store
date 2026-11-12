// ======================================
// PROTECCIÓN DEL ADMIN
// (solo entra quien tenga rol admin)
// ======================================

proteger(['admin']);


// ======================================
// ELEMENTOS
// ======================================

const contenido = document.getElementById("main");


// ======================================
// PANEL PRINCIPAL (pestañas)
// ======================================

async function admin(pestana = "usuarios") {

    const nombres = ["usuarios", "productos", "mensajes"];

    let botones = "";

    nombres.forEach((nombre) => {

        botones += `
            <button
                class="${nombre === pestana ? "" : "s"}"
                onclick="admin('${nombre}')">
                ${nombre}
            </button>
        `;

    });

    let html = "";

    try {

        if (pestana === "usuarios") {
            html = await cargarUsuarios();
        }

        if (pestana === "productos") {
            html = await cargarProductos();
        }

        if (pestana === "mensajes") {
            html = await cargarMensajes();
        }

    } catch (error) {

        html = `<p>${e(error.message)}</p>`;

    }

    contenido.innerHTML = `
        <h2>Panel de administrador</h2>
        <div class="tabs">${botones}</div>
        <div class="box">${html}</div>
    `;

}


// ======================================
// USUARIOS
// ======================================

async function cargarUsuarios() {

    const usuarios = await api("/usuarios");

    let filas = "";

    usuarios.forEach((usuario) => {

        let opciones = "";

        ["cliente", "vendedor", "admin"].forEach((rolOpcion) => {

            opciones += `
                <option ${rolOpcion === usuario.rol ? "selected" : ""}>
                    ${rolOpcion}
                </option>
            `;

        });

        filas += `
            <tr>
                <td>${e(usuario.nombre)}</td>
                <td>${e(usuario.correo)}</td>
                <td>
                    <select onchange="rol(${usuario.id}, this.value)">
                        ${opciones}
                    </select>
                </td>
                <td>
                    <button
                        class="s"
                        onclick="del('/usuarios/${usuario.id}', 'usuarios')">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;

    });

    return `
        <table>
            <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th></th>
            </tr>
            ${filas}
        </table>
    `;

}


// ======================================
// PRODUCTOS
// ======================================

async function cargarProductos() {

    const productos = await api("/productos");

    let filas = "";

    productos.forEach((producto) => {

      
                                    <td>
                    <a class="btn s" href="vender.html?editar=${producto.id}">Editar</a>
                    <button
                        class="s"
                        onclick="del('/productos/${producto.id}', 'productos')">
                        Eliminar
                    </button>
                </td>
    });

    return `
        <table>
            <tr>
                <th>Producto</th>
                <th>Vendedor</th>
                <th>Precio</th>
                <th>Stock</th>
                <th></th>
            </tr>
            ${filas}
        </table>
    `;

}


// ======================================
// MENSAJES DE CONTACTO
// ======================================

async function cargarMensajes() {

    const mensajes = await api("/contactos");

    if (mensajes.length === 0) {
        return "<p>No hay mensajes.</p>";
    }

    let html = "";

    mensajes.forEach((mensaje) => {

        html += `
            <div class="box">
                <b>${e(mensaje.nombre)}</b> · ${e(mensaje.correo)} ·
                <small>${new Date(mensaje.fecha).toLocaleString("es-CO")}</small>
                <p>${e(mensaje.mensaje)}</p>
                <button
                    class="s"
                    onclick="del('/contactos/${mensaje.id}', 'mensajes')">
                    Eliminar
                </button>
            </div>
        `;

    });

    return html;

}


// ======================================
// CAMBIAR ROL DE UN USUARIO
// ======================================

async function rol(id, nuevoRol) {

    try {

        await api(`/usuarios/${id}/rol`, "PUT", { rol: nuevoRol });

    } catch (error) {

        alert(error.message);

    }

}


// ======================================
// ELIMINAR (usuario, producto o mensaje)
// ======================================

async function del(ruta, pestana) {

    if (!confirm("¿Eliminar definitivamente?")) {
        return;
    }

    try {

        await api(ruta, "DELETE");

        admin(pestana);

    } catch (error) {

        alert(error.message);

    }

}


// ======================================
// INICIO
// ======================================

admin();