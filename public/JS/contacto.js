$('#main').innerHTML = `
    <div class="box caja">
        <h2>Contáctanos</h2>

        <input
            id="kn"
            placeholder="Nombre"
            value="${e(U?.nombre)}"
        >

        <input
            id="kc"
            type="email"
            placeholder="Correo"
            value="${e(U?.correo)}"
        >

        <textarea
            id="km"
            rows="5"
            placeholder="¿En qué te ayudamos?"
        ></textarea>

        <p class="msg" id="err"></p>

        <button onclick="enviar()">
            Enviar mensaje
        </button>
    </div>
`;

async function enviar() {
    try {
        await api('/contacto', 'POST', {
            nombre: $('#kn').value,
            correo: $('#kc').value,
            mensaje: $('#km').value
        });

        $('#main').innerHTML = `
            <div class="box">
                Mensaje enviado. Te responderemos pronto.
            </div>
        `;

    } catch (x) {
        err(x);
    }
}