$('#entrar').onclick = async () => {

    try {
        sesion(
            await api('/login', 'POST', {
                correo: $('#correo').value,
                password: $('#password').value
            })
        );

    } catch (x) {
        err(x);
    }
};