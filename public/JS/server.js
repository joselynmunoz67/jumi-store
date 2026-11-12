const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');

// Base de datos y configuración
const db = new Database('jumis.db');
const SECRET = process.env.SECRET || 'cambia-este-secreto';

// Crear tablas
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        nombre TEXT,
        correo TEXT UNIQUE,
        pass TEXT,
        rol TEXT DEFAULT 'cliente'
    );

    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        vendedor_id INTEGER,
        nombre TEXT,
        descripcion TEXT,
        precio REAL,
        stock INTEGER,
        categoria TEXT,
        imagen TEXT
    );

    CREATE TABLE IF NOT EXISTS favorites (
        user_id INTEGER,
        product_id INTEGER,
        PRIMARY KEY(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        total REAL,
        metodo TEXT,
        fecha TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY,
        order_id INTEGER,
        product_id INTEGER,
        nombre TEXT,
        precio REAL,
        cantidad INTEGER
    );

    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        product_id INTEGER,
        estrellas INTEGER,
        comentario TEXT,
        UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY,
        nombre TEXT,
        correo TEXT,
        mensaje TEXT,
        fecha TEXT
    );
`);

// Seguridad y contraseñas
const hash = p => {
    const s = crypto.randomBytes(16).toString('hex');

    return s + ':' +
        crypto.scryptSync(p, s, 32).toString('hex');
};

const check = (p, h) => {
    const [s, k] = h.split(':');

    return crypto.timingSafeEqual(
        Buffer.from(k, 'hex'),
        crypto.scryptSync(p, s, 32)
    );
};

const mac = b =>
    crypto.createHmac('sha256', SECRET)
        .update(b)
        .digest('base64url');

const sign = p => {
    const b = Buffer.from(JSON.stringify(p)).toString('base64url');

    return b + '.' + mac(b);
};

const verify = t => {
    const [b, s] = (t || '').split('.');

    if (!s || mac(b) !== s) return null;

    return JSON.parse(Buffer.from(b, 'base64url'));
};

// Autenticación y permisos
const auth = roles => (req, res, next) => {

    const p = verify(
        (req.headers.authorization || '').slice(7)
    );

    if (!p) {
        return res.status(401).json({
            error: 'Inicia sesión para continuar'
        });
    }

    const u = db.prepare(
        'SELECT id,nombre,correo,rol FROM users WHERE id=?'
    ).get(p.id);

    if (!u || (roles && !roles.includes(u.rol))) {
        return res.status(403).json({
            error: 'No tienes permiso'
        });
    }

    req.u = u;
    next();
};

// Crear administrador y productos iniciales
if (!db.prepare("SELECT 1 FROM users WHERE rol='admin'").get()) {

    const a = db.prepare(
        'INSERT INTO users(nombre,correo,pass,rol) VALUES(?,?,?,?)'
    ).run(
        'Admin',
        'admin@jumis.com',
        hash('admin123'),
        'admin'
    ).lastInsertRowid;

    const ins = db.prepare(`
        INSERT INTO products(
            vendedor_id,
            nombre,
            descripcion,
            precio,
            stock,
            categoria,
            imagen
        )
        VALUES(?,?,?,?,?,?,?)
    `);

    [
        ['Gomitas de durazno', 'Bolsa de 250 g', 8500, 40, 'Gomitas'],
        ['Labial rosa pastel', 'Acabado mate', 24900, 25, 'Labiales'],
        ['Paleta de sombras lila', '12 tonos', 45000, 15, 'Sombras'],
        ['Caja de chocolates', '12 unidades', 32000, 20, 'Chocolates']
    ].forEach(x => ins.run(a, x[0], x[1], x[2], x[3], x[4], ''));
}

// Configuración del servidor
const app = express();

app.use(express.json({ limit: '3mb' }));
app.use(express.static('public'));

// Funciones auxiliares
const wrap = f => (req, res) => {
    try {
        f(req, res);

    } catch (x) {
        res.status(400).json({
            error: x.message
        });
    }
};

const need = (...v) => {
    if (v.some(x => !String(x ?? '').trim())) {
        throw new Error('Completa todos los campos');
    }
};

// =====================================
// USUARIOS
// =====================================

// Registro
app.post('/api/registro', wrap((req, res) => {

    const { nombre, correo, password, vender } = req.body;

    need(nombre, correo, password);

    if (String(password).length < 6) {
        throw new Error(
            'La contraseña debe tener mínimo 6 caracteres'
        );
    }

    if (db.prepare(
        'SELECT 1 FROM users WHERE correo=?'
    ).get(correo)) {
        throw new Error('Ese correo ya está registrado');
    }

    const rol = vender ? 'vendedor' : 'cliente';

    const id = db.prepare(
        'INSERT INTO users(nombre,correo,pass,rol) VALUES(?,?,?,?)'
    ).run(
        nombre,
        correo,
        hash(password),
        rol
    ).lastInsertRowid;

    res.json({
        token: sign({ id }),
        user: { id, nombre, correo, rol }
    });
}));

// Inicio de sesión
app.post('/api/login', wrap((req, res) => {

    const u = db.prepare(
        'SELECT * FROM users WHERE correo=?'
    ).get(req.body.correo || '');

    if (!u || !check(req.body.password || '', u.pass)) {
        throw new Error('Correo o contraseña incorrectos');
    }

    res.json({
        token: sign({ id: u.id }),
        user: {
            id: u.id,
            nombre: u.nombre,
            correo: u.correo,
            rol: u.rol
        }
    });
}));

// =====================================
// PRODUCTOS
// =====================================

const SEL = `
    SELECT
        p.*,
        u.nombre vendedor,
        COALESCE(AVG(r.estrellas),0) rating,
        COUNT(r.id) resenas
    FROM products p
    JOIN users u ON u.id=p.vendedor_id
    LEFT JOIN reviews r ON r.product_id=p.id
`;

// Mostrar productos
app.get('/api/productos', wrap((req, res) => {

    const q = '%' + (req.query.q || '') + '%';
    const c = req.query.cat || '';

    res.json(
        db.prepare(
            SEL + `
                WHERE
                    (p.nombre LIKE ? OR p.descripcion LIKE ?)
                    AND (?='' OR p.categoria=?)
                GROUP BY p.id
                ORDER BY p.id DESC
            `
        ).all(q, q, c, c)
    );
}));

// Mostrar reseñas de un producto
app.get('/api/productos/:id/resenas', wrap((req, res) => {

    res.json(
        db.prepare(`
            SELECT
                r.estrellas,
                r.comentario,
                u.nombre
            FROM reviews r
            JOIN users u ON u.id=r.user_id
            WHERE product_id=?
        `).all(req.params.id)
    );
}));

// Productos del vendedor
app.get(
    '/api/mis-productos',
    auth(['vendedor', 'admin']),
    wrap((req, res) => {

        res.json(
            db.prepare(
                SEL + `
                    WHERE p.vendedor_id=?
                    GROUP BY p.id
                    ORDER BY p.id DESC
                `
            ).all(req.u.id)
        );
    })
);

// Publicar producto
app.post(
    '/api/productos',
    auth(['vendedor', 'admin']),
    wrap((req, res) => {

        const b = req.body;

        need(b.nombre, b.precio, b.stock, b.categoria);

        if (+b.precio <= 0 || +b.stock < 0) {
            throw new Error('Precio o stock inválido');
        }

        const id = db.prepare(`
            INSERT INTO products(
                vendedor_id,
                nombre,
                descripcion,
                precio,
                stock,
                categoria,
                imagen
            )
            VALUES(?,?,?,?,?,?,?)
        `).run(
            req.u.id,
            b.nombre,
            b.descripcion || '',
            +b.precio,
            +b.stock,
            b.categoria,
            b.imagen || ''
        ).lastInsertRowid;

        res.json({ id });
    })
);

// Eliminar producto
app.delete(
    '/api/productos/:id',
    auth(['vendedor', 'admin']),
    wrap((req, res) => {

        const p = db.prepare(
            'SELECT * FROM products WHERE id=?'
        ).get(req.params.id);

        if (
            !p ||
            (p.vendedor_id !== req.u.id && req.u.rol !== 'admin')
        ) {
            throw new Error('No puedes eliminar este producto');
        }

        db.prepare(
            'DELETE FROM products WHERE id=?'
        ).run(p.id);

        db.prepare(
            'DELETE FROM favorites WHERE product_id=?'
        ).run(p.id);

        res.json({ ok: 1 });
    })
);

// =====================================
// FAVORITOS
// =====================================

// Mostrar favoritos
app.get(
    '/api/favoritos',
    auth(),
    wrap((req, res) => {

        res.json(
            db.prepare(
                SEL + `
                    WHERE p.id IN (
                        SELECT product_id
                        FROM favorites
                        WHERE user_id=?
                    )
                    GROUP BY p.id
                `
            ).all(req.u.id)
        );
    })
);

// Agregar o quitar favoritos
app.post(
    '/api/favoritos/:id',
    auth(),
    wrap((req, res) => {

        const d = db.prepare(
            'DELETE FROM favorites WHERE user_id=? AND product_id=?'
        ).run(req.u.id, req.params.id);

        if (!d.changes) {
            db.prepare(
                'INSERT INTO favorites VALUES(?,?)'
            ).run(req.u.id, req.params.id);
        }

        res.json({
            favorito: !d.changes
        });
    })
);

// =====================================
// PEDIDOS Y FACTURAS
// =====================================

// Crear pedido
app.post('/api/pedidos', auth(), wrap((req, res) => {

    const { items, metodo } = req.body;

    if (!Array.isArray(items) || !items.length) {
        throw new Error('El carrito está vacío');
    }

    const id = db.transaction(() => {

        let total = 0;

        const rows = items.map(i => {

            const p = db.prepare(
                'SELECT * FROM products WHERE id=?'
            ).get(i.id);

            const c = Math.floor(+i.cantidad);

            if (!p || c < 1 || p.stock < c) {
                throw new Error(
                    'Sin stock suficiente: ' + (p ? p.nombre : i.id)
                );
            }

            total += p.precio * c;

            return [p, c];
        });

        const o = db.prepare(
            'INSERT INTO orders(user_id,total,metodo,fecha) VALUES(?,?,?,?)'
        ).run(
            req.u.id,
            total,
            metodo || 'PSE',
            new Date().toISOString()
        ).lastInsertRowid;

        for (const [p, c] of rows) {

            db.prepare(`
                INSERT INTO order_items(
                    order_id,
                    product_id,
                    nombre,
                    precio,
                    cantidad
                )
                VALUES(?,?,?,?,?)
            `).run(o, p.id, p.nombre, p.precio, c);

            db.prepare(
                'UPDATE products SET stock=stock-? WHERE id=?'
            ).run(c, p.id);
        }

        return o;
    })();

    res.json({ id });
}));

// Mostrar pedidos
app.get('/api/pedidos', auth(), wrap((req, res) => {

    const os = db.prepare(
        'SELECT * FROM orders WHERE user_id=? ORDER BY id DESC'
    ).all(req.u.id);

    os.forEach(o => {

        o.items = db.prepare(`
            SELECT
                oi.*,
                r.estrellas
            FROM order_items oi
            LEFT JOIN reviews r
                ON r.product_id=oi.product_id
                AND r.user_id=?
            WHERE oi.order_id=?
        `).all(req.u.id, o.id);

    });

    res.json(os);
}));

// Mostrar factura
app.get('/api/pedidos/:id', auth(), wrap((req, res) => {

    const o = db.prepare(`
        SELECT
            o.*,
            u.nombre cliente,
            u.correo
        FROM orders o
        JOIN users u ON u.id=o.user_id
        WHERE o.id=?
    `).get(req.params.id);

    if (
        !o ||
        (o.user_id !== req.u.id && req.u.rol !== 'admin')
    ) {
        throw new Error('Factura no encontrada');
    }

    o.items = db.prepare(
        'SELECT * FROM order_items WHERE order_id=?'
    ).all(o.id);

    res.json(o);
}));

// =====================================
// RESEÑAS Y CALIFICACIONES
// =====================================

app.post('/api/resenas', auth(), wrap((req, res) => {

    const { product_id, estrellas, comentario } = req.body;
    const n = Math.floor(+estrellas);

    if (!(n >= 1 && n <= 5)) {
        throw new Error('Elige de 1 a 5 estrellas');
    }

    if (!db.prepare(`
        SELECT 1
        FROM order_items oi
        JOIN orders o ON o.id=oi.order_id
        WHERE o.user_id=? AND oi.product_id=?
    `).get(req.u.id, product_id)) {

        throw new Error(
            'Solo puedes calificar productos que compraste'
        );
    }

    db.prepare(`
        INSERT INTO reviews(
            user_id,
            product_id,
            estrellas,
            comentario
        )
        VALUES(?,?,?,?)
        ON CONFLICT(user_id,product_id)
        DO UPDATE SET
            estrellas=excluded.estrellas,
            comentario=excluded.comentario
    `).run(
        req.u.id,
        product_id,
        n,
        comentario || ''
    );

    res.json({ ok: 1 });
}));

// =====================================
// CONTACTO
// =====================================

// Recibir mensajes
app.post('/api/contacto', wrap((req, res) => {

    const { nombre, correo, mensaje } = req.body;

    need(nombre, correo, mensaje);

    db.prepare(`
        INSERT INTO contacts(
            nombre,
            correo,
            mensaje,
            fecha
        )
        VALUES(?,?,?,?)
    `).run(
        nombre,
        correo,
        mensaje,
        new Date().toISOString()
    );

    res.json({ ok: 1 });
}));

// Mostrar contactos (administrador)
app.get(
    '/api/contactos',
    auth(['admin']),
    wrap((req, res) => {

        res.json(
            db.prepare(
                'SELECT * FROM contacts ORDER BY id DESC'
            ).all()
        );
    })
);

// Eliminar contactos
app.delete(
    '/api/contactos/:id',
    auth(['admin']),
    wrap((req, res) => {

        db.prepare(
            'DELETE FROM contacts WHERE id=?'
        ).run(req.params.id);

        res.json({ ok: 1 });
    })
);

// =====================================
// ADMINISTRACIÓN DE USUARIOS
// =====================================

// Mostrar usuarios
app.get(
    '/api/usuarios',
    auth(['admin']),
    wrap((req, res) => {

        res.json(
            db.prepare(
                'SELECT id,nombre,correo,rol FROM users'
            ).all()
        );
    })
);

// Cambiar rol de usuario
app.put(
    '/api/usuarios/:id/rol',
    auth(['admin']),
    wrap((req, res) => {

        if (!['cliente', 'vendedor', 'admin'].includes(req.body.rol)) {
            throw new Error('Rol inválido');
        }

        db.prepare(
            'UPDATE users SET rol=? WHERE id=?'
        ).run(req.body.rol, req.params.id);

        res.json({ ok: 1 });
    })
);

// Eliminar usuario
app.delete(
    '/api/usuarios/:id',
    auth(['admin']),
    wrap((req, res) => {

        if (+req.params.id === req.u.id) {
            throw new Error('No puedes eliminar tu propia cuenta');
        }

        db.prepare(
            'DELETE FROM products WHERE vendedor_id=?'
        ).run(req.params.id);

        db.prepare(
            'DELETE FROM favorites WHERE user_id=?'
        ).run(req.params.id);

        db.prepare(
            'DELETE FROM users WHERE id=?'
        ).run(req.params.id);

        res.json({ ok: 1 });
    })
);

// =====================================
// INICIAR SERVIDOR
// =====================================

app.listen(
    process.env.PORT || 3000,
    () => console.log('Jumis Store en http://localhost:3000')
);