$('#registrar').onclick = async () => {

    try {
        sesion(
            await api('/registro', 'POST', {
                nombre: $('#nombre').value,
                correo: $('#correo').value,
                password: $('#password').value,
                vender: $('#vender').checked
            })
        );

    } catch (x) {
        err(x);
    }
};