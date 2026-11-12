let cat = '';

let q = new URLSearchParams(location.search).get('q') || '';

async function tienda() {

    $('#main').innerHTML = `
        <div class="cats">

            <button
                class="${cat ? '' : 'on'}"
                onclick="cat='';tienda()"
            >
                Todo
            </button>

            ${CATS.map(c => `
                <button
                    class="${c == cat ? 'on' : ''}"
                    onclick="cat='${c}';tienda()"
                >
                    ${c}
                </button>
            `).join('')}

        </div>

        <div class="grid" id="g"></div>
    `;

    const ps = await api(
        `/productos?q=${encodeURIComponent(q)}&cat=${cat}`
    );

    const f = U
        ? (await api('/favoritos')).map(p => p.id)
        : [];

    $('#g').innerHTML = (
        ps.map(p => card(p, f.includes(p.id))).join('') ||
        '<p>No encontramos productos. Prueba con otra búsqueda.</p>'
    );
}

const recargar = tienda;

tienda().catch(x => alert(x.message));