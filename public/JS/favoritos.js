proteger();

async function favoritos() {

    const ps = await api('/favoritos');

    $('#main').innerHTML = `
        <h2>Mis favoritos</h2>

        <div class="grid">
            ${
                ps.map(p => card(p, true)).join('') ||
                '<p>Aún no tienes favoritos. Toca ♡ en un producto.</p>'
            }
        </div>
    `;
}

const recargar = favoritos;

favoritos();