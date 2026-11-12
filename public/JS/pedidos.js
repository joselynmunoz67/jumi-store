proteger();

async function pedidos() {

    const os = await api('/pedidos');

    $('#main').innerHTML = `
        <h2>Mis compras</h2>
    ` + (
        os.map(o => `
            <div class="box">

                <b>Pedido ${o.id}</b>
                · ${new Date(o.fecha).toLocaleDateString('es-CO')}
                · ${money(o.total)}

                <button
                    class="s"
                    onclick="factura(${o.id})"
                    style="float:right"
                >
                    Ver factura
                </button>

                ${o.items.map(i => `
                    <div style="margin-top:12px">

                        ${e(i.nombre)} × ${i.cantidad}

                        <span class="st">
                            ${i.estrellas ? stars(i.estrellas) : ''}
                        </span>

                        <div class="row">

                            <select
                                id="s${i.id}"
                                style="width:auto"
                            >
                                ${
                                    [5, 4, 3, 2, 1].map(n => `
                                        <option
                                            value="${n}"
                                            ${n == i.estrellas ? 'selected' : ''}
                                        >
                                            ${n} ★
                                        </option>
                                    `).join('')
                                }
                            </select>

                            <input
                                id="c${i.id}"
                                placeholder="Comentario (opcional)"
                            >

                            <button onclick="calificar(${i.product_id}, ${i.id})">
                                Calificar
                            </button>

                        </div>
                    </div>
                `).join('')}

            </div>
        `).join('') || '<p>Aún no has comprado nada.</p>'
    );
}

async function calificar(pid, oi) {

    try {
        await api('/resenas', 'POST', {
            product_id: pid,
            estrellas: $('#s' + oi).value,
            comentario: $('#c' + oi).value
        });

        pedidos();

    } catch (x) {
        alert(x.message);
    }
}

pedidos();