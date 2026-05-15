const express      = require("express");
const methodOverride = require("method-override");
const db           = require("./db");

const app  = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static("public"));

// ── SESION SIMPLE (sin express-session, solo query param) ─────────────────────
// El usuario viaja en cada request como ?u=username para simplicidad del taller

function getUsuario(req, res, next) {
    const username = req.query.u || req.body.u || req.params.u;
    if (!username) return res.redirect("/");
    db.query(
        `SELECT u.*,p.nombre,p.apellido,r.nombre as rol,o.nombre as org
         FROM usuario u
         JOIN persona p ON u.id_persona=p.id
         JOIN rol r ON u.id_rol=r.id
         JOIN organizacion o ON u.id_organizacion=o.id
         WHERE u.username=? AND u.estado='activo' LIMIT 1`,
        [username], (err, rows) => {
            if (err) { console.error("getUsuario DB err:", err.message); return res.redirect("/"); }
            if (!rows.length) { console.warn("getUsuario: usuario no encontrado:", username); return res.redirect("/"); }
            req.user = rows[0];
            next();
        });
}

const q = (sql, params=[]) => new Promise((res,rej) =>
    db.query(sql, params, (e,r) => e ? rej(e) : res(r||[])));

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN / LOGOUT
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/", (req, res) => res.render("login", { error: false }));

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    db.query(
        `SELECT u.*,r.nombre as rol FROM usuario u
         JOIN rol r ON u.id_rol=r.id
         WHERE u.username=? AND u.password=? AND u.estado='activo' LIMIT 1`,
        [username, password], (err, rows) => {
            if (err || !rows.length) return res.render("login", { error: true });
            const rol = rows[0].rol.toLowerCase();
            if (rol === "admin")    return res.redirect(`/admin?u=${username}`);
            if (rol === "operador") return res.redirect(`/operador?u=${username}`);
            if (rol === "cliente")  return res.redirect(`/cliente?u=${username}`);
            res.render("login", { error: true });
        });
});

app.get("/logout", (req, res) => res.redirect("/"));

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRO DE CLIENTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/register", (req, res) => {
    res.render("register", { error: false, success: false });
});

app.post("/register", async (req, res) => {
    const { nombre, apellido, correo, username, password, confirm } = req.body;
    try {
        if (!nombre || !apellido || !correo || !username || !password) {
            return res.render("register", { error: "Todos los campos son obligatorios", success: false });
        }
        if (password !== confirm) {
            return res.render("register", { error: "Las contraseñas no coinciden", success: false });
        }
        if (password.length < 4) {
            return res.render("register", { error: "La contraseña debe tener al menos 4 caracteres", success: false });
        }
        const existente = await q("SELECT id FROM usuario WHERE username=?", [username]);
        if (existente.length) {
            return res.render("register", { error: "El nombre de usuario ya existe", success: false });
        }
        const correoExistente = await q("SELECT id FROM persona WHERE documento=?", [correo]);
        if (correoExistente.length) {
            return res.render("register", { error: "El correo ya está registrado", success: false });
        }
        // Asignar organizacion por defecto (la primera disponible o crear "General")
        let orgs = await q("SELECT * FROM organizacion ORDER BY id LIMIT 1");
        let idOrg;
        if (orgs.length) {
            idOrg = orgs[0].id;
        } else {
            const r = await new Promise((resolve, reject) =>
                db.query("INSERT INTO organizacion (nombre,nit) VALUES ('General','0000')", (e,r) => e ? reject(e) : resolve(r)));
            idOrg = r.insertId;
        }
        const result = await new Promise((resolve, reject) =>
            db.query("INSERT INTO persona (nombre, apellido, documento) VALUES (?,?,?)",
                [nombre, apellido, correo], (e, r) => e ? reject(e) : resolve(r)));
        const idPersona = result.insertId;
        await new Promise((resolve, reject) =>
            db.query("INSERT INTO usuario (id_persona, id_rol, id_organizacion, username, password, estado) VALUES (?,3,?,?,?,'activo')",
                [idPersona, idOrg, username, password], (e, r) => e ? reject(e) : resolve(r)));
        res.render("register", { error: false, success: "Registro exitoso. Ahora puedes iniciar sesión." });
    } catch (e) {
        res.render("register", { error: "Error al registrarse: " + e.message, success: false });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/admin", getUsuario, async (req, res) => {
    const u = req.user;
    const seccion = req.query.seccion || "dashboard";
    const msg     = req.query.msg || "";
    let data = [], stats = {}, extras = {};

    try {
        if (seccion === "dashboard") {
            const [us,ms,ps,ds] = await Promise.all([
                q("SELECT COUNT(*) c FROM usuario"),
                q("SELECT COUNT(*) c FROM mensaje"),
                q("SELECT COUNT(*) c FROM persona"),
                q("SELECT COUNT(*) c FROM detalle_mensaje WHERE estado='pendiente'")
            ]);
            stats = { usuarios:us[0].c, mensajes:ms[0].c, personas:ps[0].c, pendientes:ds[0].c };
            data  = await q(`SELECT m.id,m.asunto,m.fechaCreacion,c.nombre cat,i.nombre importancia,i.orden
                             FROM mensaje m JOIN categoria c ON m.id_categoria=c.id
                             JOIN parametrizacion_mensaje pm ON pm.id_categoria=c.id
                             JOIN importancia i ON pm.id_importancia=i.id
                             GROUP BY m.id ORDER BY i.orden,m.id DESC LIMIT 8`);
        } else if (seccion === "usuarios") {
            data   = await q(`SELECT u.*,p.nombre pnombre,p.apellido,r.nombre rol,o.nombre org
                              FROM usuario u JOIN persona p ON u.id_persona=p.id
                              JOIN rol r ON u.id_rol=r.id JOIN organizacion o ON u.id_organizacion=o.id
                              ORDER BY u.id DESC`);
            extras = {
                personas: await q("SELECT * FROM persona"),
                roles:    await q("SELECT * FROM rol"),
                orgs:     await q("SELECT * FROM organizacion")
            };
        } else if (seccion === "personas") {
            data = await q("SELECT * FROM persona ORDER BY id DESC");
        } else if (seccion === "organizaciones") {
            data = await q("SELECT * FROM organizacion ORDER BY id DESC");
        } else if (seccion === "categorias") {
            data   = await q("SELECT c.*,o.nombre org FROM categoria c JOIN organizacion o ON c.id_organizacion=o.id ORDER BY c.id DESC");
            extras = { orgs: await q("SELECT * FROM organizacion") };
        } else if (seccion === "importancia") {
            data = await q("SELECT * FROM importancia ORDER BY orden");
        } else if (seccion === "medios") {
            data = await q("SELECT * FROM medio_comunicacion ORDER BY id DESC");
        } else if (seccion === "parametros") {
            data   = await q(`SELECT pm.*,c.nombre cat,i.nombre imp,i.orden,mc.tipo medio
                              FROM parametrizacion_mensaje pm
                              JOIN categoria c ON pm.id_categoria=c.id
                              JOIN importancia i ON pm.id_importancia=i.id
                              JOIN medio_comunicacion mc ON pm.id_medio=mc.id ORDER BY i.orden`);
            extras = {
                cats:   await q("SELECT * FROM categoria"),
                imps:   await q("SELECT * FROM importancia ORDER BY orden"),
                medios: await q("SELECT * FROM medio_comunicacion")
            };
        } else if (seccion === "mensajes") {
            data = await q(`SELECT m.*,c.nombre cat,i.nombre imp,i.orden,
                            CONCAT(p.nombre,' ',p.apellido) receptor,u.username emisor
                            FROM mensaje m
                            JOIN categoria c ON m.id_categoria=c.id
                            JOIN parametrizacion_mensaje pm ON pm.id_categoria=c.id
                            JOIN importancia i ON pm.id_importancia=i.id
                            JOIN persona p ON m.id_persona_receptor=p.id
                            JOIN usuario u ON m.id_usuario_emisor=u.id
                            GROUP BY m.id ORDER BY i.orden,m.id DESC`);
        }
        res.render("admin/dashboard", { usuario:{...u,org:u.org}, seccion, data, stats, extras, msg });
    } catch(e) {
        res.status(500).send("Error: "+e.message);
    }
});

// Admin CRUD helpers
const adminPost = (route, sql, paramsFn, redirect) => {
    app.post(route, (req,res) => {
        const u = req.body.u || req.query.u || "admin";
        db.query(sql, paramsFn(req.body), err =>
            res.redirect(`/admin?seccion=${redirect}&u=${u}&msg=${err?'Error:'+err.message:'Operacion exitosa'}`));
    });
};

app.post("/admin/usuarios/new", (req,res) => {
    const {id_persona,id_rol,id_organizacion,username,password,estado} = req.body;
    const u = req.body.u||"admin";
    db.query("INSERT INTO usuario (id_persona,id_rol,id_organizacion,username,password,estado) VALUES (?,?,?,?,?,?)",
        [id_persona,id_rol,id_organizacion,username,password,estado], err =>
        res.redirect(`/admin?seccion=usuarios&u=${u}&msg=${err?'Error:'+err.message:'Usuario creado'}`));
});
app.post("/admin/usuarios/toggle/:id", (req,res) => {
    const u=req.body.u||"admin";
    db.query("UPDATE usuario SET estado=IF(estado='activo','inactivo','activo') WHERE id=?",[req.params.id],()=>
        res.redirect(`/admin?seccion=usuarios&u=${u}&msg=Estado actualizado`));
});
app.delete("/admin/usuarios/del/:id", (req,res) => {
    const u=req.body.u||"admin";
    db.query("DELETE FROM usuario WHERE id=?",[req.params.id],()=>
        res.redirect(`/admin?seccion=usuarios&u=${u}&msg=Usuario eliminado`));
});
app.post("/admin/usuarios/edit/:id", getUsuario, async (req,res) => {
    const u = req.user;
    const {id_persona,id_rol,id_organizacion,username,password,estado}=req.body;
    try {
        if (password) {
            await q("UPDATE usuario SET id_persona=?,id_rol=?,id_organizacion=?,username=?,password=?,estado=? WHERE id=?",
                [id_persona,id_rol,id_organizacion,username,password,estado,req.params.id]);
        } else {
            await q("UPDATE usuario SET id_persona=?,id_rol=?,id_organizacion=?,username=?,estado=? WHERE id=?",
                [id_persona,id_rol,id_organizacion,username,estado,req.params.id]);
        }
        res.redirect(`/admin?seccion=usuarios&u=${u.username}&msg=Usuario actualizado`);
    } catch(e) {
        res.redirect(`/admin?seccion=usuarios&u=${u.username}&msg=Error:${e.message}`);
    }
});
app.post("/admin/personas/new", (req,res) => {
    const {nombre,apellido,documento} = req.body; const u=req.body.u||"admin";
    db.query("INSERT INTO persona (nombre,apellido,documento) VALUES (?,?,?)",[nombre,apellido,documento],err=>
        res.redirect(`/admin?seccion=personas&u=${u}&msg=${err?'Error:'+err.message:'Persona creada'}`));
});
app.delete("/admin/personas/del/:id",(req,res)=>{
    const u=req.body.u||"admin";
    db.query("DELETE FROM persona WHERE id=?",[req.params.id],()=>
        res.redirect(`/admin?seccion=personas&u=${u}&msg=Persona eliminada`));
});
app.post("/admin/organizaciones/new",(req,res)=>{
    const {nombre,nit}=req.body; const u=req.body.u||"admin";
    db.query("INSERT INTO organizacion (nombre,nit) VALUES (?,?)",[nombre,nit],err=>
        res.redirect(`/admin?seccion=organizaciones&u=${u}&msg=${err?'Error:'+err.message:'Organizacion creada'}`));
});
app.delete("/admin/organizaciones/del/:id",(req,res)=>{
    const u=req.body.u||"admin";
    db.query("DELETE FROM organizacion WHERE id=?",[req.params.id],()=>
        res.redirect(`/admin?seccion=organizaciones&u=${u}&msg=Eliminada`));
});
app.post("/admin/categorias/new",(req,res)=>{
    const {nombre,descripcion,id_organizacion}=req.body; const u=req.body.u||"admin";
    db.query("INSERT INTO categoria (nombre,descripcion,id_organizacion) VALUES (?,?,?)",[nombre,descripcion,id_organizacion],err=>
        res.redirect(`/admin?seccion=categorias&u=${u}&msg=${err?'Error:'+err.message:'Categoria creada'}`));
});
app.delete("/admin/categorias/del/:id",(req,res)=>{
    const u=req.body.u||"admin";
    db.query("DELETE FROM categoria WHERE id=?",[req.params.id],()=>
        res.redirect(`/admin?seccion=categorias&u=${u}&msg=Eliminada`));
});
app.post("/admin/importancia/new",(req,res)=>{
    const {nombre,orden}=req.body; const u=req.body.u||"admin";
    db.query("INSERT INTO importancia (nombre,orden) VALUES (?,?)",[nombre,orden],err=>
        res.redirect(`/admin?seccion=importancia&u=${u}&msg=${err?'Error:'+err.message:'Creado'}`));
});
app.delete("/admin/importancia/del/:id",(req,res)=>{
    const u=req.body.u||"admin";
    db.query("DELETE FROM importancia WHERE id=?",[req.params.id],()=>
        res.redirect(`/admin?seccion=importancia&u=${u}&msg=Eliminado`));
});
app.post("/admin/medios/new",(req,res)=>{
    const {tipo,apiEndpoint}=req.body; const u=req.body.u||"admin";
    db.query("INSERT INTO medio_comunicacion (tipo,apiEndpoint) VALUES (?,?)",[tipo,apiEndpoint||null],err=>
        res.redirect(`/admin?seccion=medios&u=${u}&msg=${err?'Error:'+err.message:'Medio creado'}`));
});
app.delete("/admin/medios/del/:id",(req,res)=>{
    const u=req.body.u||"admin";
    db.query("DELETE FROM medio_comunicacion WHERE id=?",[req.params.id],()=>
        res.redirect(`/admin?seccion=medios&u=${u}&msg=Eliminado`));
});
app.post("/admin/parametros/new",(req,res)=>{
    const {id_categoria,id_importancia,id_medio}=req.body; const u=req.body.u||"admin";
    db.query("INSERT INTO parametrizacion_mensaje (id_categoria,id_importancia,id_medio) VALUES (?,?,?)",[id_categoria,id_importancia,id_medio],err=>
        res.redirect(`/admin?seccion=parametros&u=${u}&msg=${err?'Error:'+err.message:'Creado'}`));
});
app.delete("/admin/parametros/del/:id",(req,res)=>{
    const u=req.body.u||"admin";
    db.query("DELETE FROM parametrizacion_mensaje WHERE id=?",[req.params.id],()=>
        res.redirect(`/admin?seccion=parametros&u=${u}&msg=Eliminado`));
});

// ═══════════════════════════════════════════════════════════════════════════════
// OPERADOR
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/operador", getUsuario, async (req,res) => {
    const u       = req.user;
    const seccion = req.query.seccion || "dashboard";
    const msg     = req.query.msg || "";
    let data=[], stats={}, extras={};
    try {
        if (seccion==="dashboard") {
            const base = `FROM mensaje m
                          JOIN categoria c ON m.id_categoria=c.id
                          JOIN parametrizacion_mensaje pm ON pm.id_categoria=c.id
                          JOIN importancia i ON pm.id_importancia=i.id
                          JOIN usuario us ON m.id_usuario_emisor=us.id
                          WHERE us.id_organizacion=?`;
            const [tot,alt,med,baj] = await Promise.all([
                q(`SELECT COUNT(DISTINCT m.id) c ${base}`,[u.id_organizacion]),
                q(`SELECT COUNT(DISTINCT m.id) c ${base} AND i.orden=1`,[u.id_organizacion]),
                q(`SELECT COUNT(DISTINCT m.id) c ${base} AND i.orden=2`,[u.id_organizacion]),
                q(`SELECT COUNT(DISTINCT m.id) c ${base} AND i.orden>=3`,[u.id_organizacion])
            ]);
            stats = { total:tot[0].c, alta:alt[0].c, media:med[0].c, baja:baj[0].c };
            data  = await q(`SELECT DISTINCT m.id,m.asunto,m.fechaCreacion,
                             i.nombre imp,i.orden,CONCAT(p.nombre,' ',p.apellido) receptor
                             FROM mensaje m
                             JOIN categoria c ON m.id_categoria=c.id
                             JOIN parametrizacion_mensaje pm ON pm.id_categoria=c.id
                             JOIN importancia i ON pm.id_importancia=i.id
                             JOIN persona p ON m.id_persona_receptor=p.id
                             JOIN usuario us ON m.id_usuario_emisor=us.id
                             WHERE us.id_organizacion=?
                             ORDER BY i.orden,m.id DESC LIMIT 6`,[u.id_organizacion]);
        } else if (seccion==="enviar") {
            extras = {
                personas: await q("SELECT * FROM persona"),
                cats:     await q("SELECT * FROM categoria WHERE id_organizacion=?",[u.id_organizacion])
            };
        } else if (seccion==="historial") {
            data = await q(`SELECT DISTINCT m.id,m.asunto,m.fechaCreacion,c.nombre cat,
                            i.nombre imp,i.orden,CONCAT(p.nombre,' ',p.apellido) receptor
                            FROM mensaje m
                            JOIN categoria c ON m.id_categoria=c.id
                            JOIN parametrizacion_mensaje pm ON pm.id_categoria=c.id
                            JOIN importancia i ON pm.id_importancia=i.id
                            JOIN persona p ON m.id_persona_receptor=p.id
                            JOIN usuario us ON m.id_usuario_emisor=us.id
                            WHERE us.id_organizacion=?
                            ORDER BY i.orden,m.id DESC`,[u.id_organizacion]);
        } else if (seccion==="detalles") {
            data = await q(`SELECT dm.*,m.asunto,mc.tipo medio
                            FROM detalle_mensaje dm
                            JOIN mensaje m ON dm.id_mensaje=m.id
                            JOIN medio_comunicacion mc ON dm.id_medio=mc.id
                            JOIN usuario us ON m.id_usuario_emisor=us.id
                            WHERE us.id_organizacion=?
                            ORDER BY dm.id DESC`,[u.id_organizacion]);
        }
        res.render("operador/dashboard",{usuario:{...u},seccion,data,stats,extras,msg});
    } catch(e){ res.status(500).send("Error: "+e.message); }
});

app.post("/operador/mensajes/new", getUsuario, async (req,res) => {
    const u = req.user;
    let {id_persona_receptor,id_categoria,asunto,cuerpo,nueva_categoria} = req.body;
    try {
        if (id_categoria === "otra") {
            if (!nueva_categoria || !nueva_categoria.trim()) {
                return res.redirect(`/operador?seccion=enviar&u=${u.username}&msg=Especifica el nombre de la nueva categoria`);
            }
            const r = await new Promise((resolve,reject) =>
                db.query("INSERT INTO categoria (nombre,descripcion,id_organizacion) VALUES (?,?,?)",
                    [nueva_categoria.trim(), "Creada desde operador", u.id_organizacion], (e,r2)=>e?reject(e):resolve(r2)));
            id_categoria = r.insertId;
        }
        const result = await new Promise((resolve,reject) =>
            db.query("INSERT INTO mensaje (id_usuario_emisor,id_persona_receptor,id_categoria,asunto,cuerpo) VALUES (?,?,?,?,?)",
                [u.id,id_persona_receptor,id_categoria,asunto,cuerpo],(e,r)=>e?reject(e):resolve(r)));
        const params = await q("SELECT id_medio FROM parametrizacion_mensaje WHERE id_categoria=?",[id_categoria]);
        for (const p of params) {
            await new Promise(resolve=>db.query(
                "INSERT INTO detalle_mensaje (id_mensaje,id_medio,estado,intento) VALUES (?,?,'pendiente',0)",
                [result.insertId,p.id_medio],resolve));
        }
        res.redirect(`/operador?seccion=historial&u=${u.username}&msg=Mensaje enviado correctamente`);
    } catch(e){ res.status(500).send("Error: "+e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTE
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/cliente", getUsuario, async (req,res) => {
    const u      = req.user;
    const filtro = req.query.filtro || "";
    try {
        let sql = `SELECT DISTINCT m.id,m.asunto,m.cuerpo,m.fechaCreacion,
                   c.nombre cat,i.nombre imp,i.orden,o.nombre org
                   FROM mensaje m
                   JOIN categoria c ON m.id_categoria=c.id
                   JOIN organizacion o ON c.id_organizacion=o.id
                   JOIN parametrizacion_mensaje pm ON pm.id_categoria=c.id
                   JOIN importancia i ON pm.id_importancia=i.id
                   WHERE m.id_persona_receptor=?`;
        if (filtro==="alta")  sql += " AND i.orden=1";
        if (filtro==="media") sql += " AND i.orden=2";
        if (filtro==="baja")  sql += " AND i.orden>=3";
        sql += " ORDER BY i.orden, m.id DESC";

        let mensajes = await q(sql,[u.id_persona]);
        // Agregar canales de envio a cada mensaje
        for (let m of mensajes) {
            const canales = await q(`SELECT mc.tipo FROM detalle_mensaje dm
                                     JOIN medio_comunicacion mc ON dm.id_medio=mc.id
                                     WHERE dm.id_mensaje=?`,[m.id]);
            m.canales = canales.map(c=>c.tipo);
        }
        res.render("cliente/bandeja",{
            usuario:{...u, nombre:u.nombre, apellido:u.apellido},
            mensajes, filtro
        });
    } catch(e){ res.status(500).send("Error: "+e.message); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERFIL DE CLIENTE
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/cliente/perfil", getUsuario, async (req, res) => {
    const u = req.user;
    try {
        const p = await q("SELECT * FROM persona WHERE id=?", [u.id_persona]);
        res.render("cliente/perfil", { usuario: {...u, nombre: u.nombre, apellido: u.apellido}, persona: p[0] || {}, msg: req.query.msg || "" });
    } catch(e) {
        res.status(500).send("Error: "+e.message);
    }
});

app.post("/cliente/perfil", getUsuario, async (req, res) => {
    const u = req.user;
    const { nombre, apellido, correo, password, confirm } = req.body;
    try {
        if (!nombre || !apellido || !correo) {
            return res.redirect(`/cliente/perfil?u=${u.username}&msg=Todos los campos obligatorios`);
        }
        const p = await q("SELECT * FROM persona WHERE id=?", [u.id_persona]);
        if (password) {
            if (password.length < 4) {
                return res.redirect(`/cliente/perfil?u=${u.username}&msg=La contraseña debe tener al menos 4 caracteres`);
            }
            if (password !== confirm) {
                return res.redirect(`/cliente/perfil?u=${u.username}&msg=Las contraseñas no coinciden`);
            }
            await q("UPDATE usuario SET password=? WHERE id=?", [password, u.id]);
        }
        const correoDup = await q("SELECT id FROM persona WHERE documento=? AND id!=?", [correo, u.id_persona]);
        if (correoDup.length) {
            return res.redirect(`/cliente/perfil?u=${u.username}&msg=Ese correo ya está en uso`);
        }
        await q("UPDATE persona SET nombre=?, apellido=?, documento=? WHERE id=?", [nombre, apellido, correo, u.id_persona]);
        res.redirect(`/cliente/perfil?u=${u.username}&msg=Perfil actualizado correctamente`);
    } catch(e) {
        res.redirect(`/cliente/perfil?u=${u.username}&msg=Error: `+e.message);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => console.log(`Priority Flow en http://localhost:${PORT}`));
