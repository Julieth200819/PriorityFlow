const express    = require('express');
const bodyParser = require('body-parser');
const path       = require('path');
const db         = require('./db');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#0f172a;min-height:100vh;color:#e2e8f0}
.sidebar{position:fixed;top:0;left:0;width:220px;height:100vh;background:#1e293b;padding:24px 0;border-right:1px solid #334155;z-index:10;overflow-y:auto}
.sidebar .logo{padding:0 20px 24px;border-bottom:1px solid #334155;margin-bottom:16px}
.sidebar .logo h1{font-size:15px;font-weight:700;color:#38bdf8}
.sidebar .logo span{font-size:11px;color:#64748b}
.sidebar a{display:flex;align-items:center;gap:10px;padding:10px 20px;color:#94a3b8;text-decoration:none;font-size:14px;transition:all 0.15s}
.sidebar a:hover{background:#0f172a;color:#38bdf8;border-right:3px solid #38bdf8}
.main{margin-left:220px;padding:32px;min-height:100vh}
.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px}
.topbar h2{font-size:20px;font-weight:700;color:#f1f5f9}
.topbar .right{display:flex;align-items:center;gap:12px}
.topbar .user-tag{font-size:12px;color:#64748b;background:#1e293b;padding:5px 12px;border-radius:20px;border:1px solid #334155}
.btn-logout{background:transparent;color:#64748b;border:1px solid #334155;padding:6px 14px;border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;transition:all 0.15s;font-family:inherit}
.btn-logout:hover{color:#f1f5f9;border-color:#64748b}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:28px}
.card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px}
.card .label{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
.card .value{font-size:28px;font-weight:700;color:#38bdf8}
.card .sub{font-size:12px;color:#64748b;margin-top:4px}
.section{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:24px;margin-bottom:20px}
.section h3{font-size:13px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #334155}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
label{display:block;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
input,select,textarea{width:100%;padding:10px 14px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:14px;font-family:inherit;transition:border-color .2s}
input:focus,select:focus,textarea:focus{outline:none;border-color:#38bdf8}
textarea{min-height:90px;resize:vertical}
select option{background:#1e293b}
.btn{display:inline-block;padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none;transition:all .15s}
.btn-primary{background:#0ea5e9;color:white}.btn-primary:hover{background:#0284c7}
.btn-danger{background:#7f1d1d;color:#fca5a5;padding:5px 12px;font-size:12px;border:1px solid #991b1b}.btn-danger:hover{background:#991b1b}
.btn-warning{background:#78350f;color:#fcd34d;padding:5px 12px;font-size:12px;border:1px solid #92400e}.btn-warning:hover{background:#92400e}
.mt{margin-top:16px}
table{width:100%;border-collapse:collapse}
th{background:#0f172a;font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.06em;padding:10px 14px;text-align:left;border-bottom:1px solid #1e293b}
td{padding:12px 14px;font-size:14px;color:#cbd5e1;border-bottom:1px solid #0f172a20;vertical-align:middle}
tr:hover td{background:#ffffff04}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
.badge-green{background:#052e16;color:#4ade80;border:1px solid #166534}
.badge-red{background:#450a0a;color:#f87171;border:1px solid #991b1b}
.badge-blue{background:#0c1a3a;color:#60a5fa;border:1px solid #1e40af}
.badge-yellow{background:#1c1107;color:#fbbf24;border:1px solid #78350f}
.gap{display:flex;gap:8px;align-items:center}
p.success{background:#052e16;color:#4ade80;border:1px solid #166534;padding:10px 16px;border-radius:8px;font-size:13px;margin-bottom:16px}
p.error{background:#450a0a;color:#f87171;border:1px solid #991b1b;padding:10px 16px;border-radius:8px;font-size:13px;margin-bottom:16px}
`;

function html(title, body, showNav=false, user='') {
    const nav = showNav ? `
    <div class="sidebar">
        <div class="logo"><h1>Priority Flow</h1><span>Notificaciones</span></div>
        <a href="/dashboard?user=${encodeURIComponent(user)}">&#128248; Dashboard</a>
        <a href="/usuarios?user=${encodeURIComponent(user)}">&#128100; Usuarios</a>
        <a href="/personas?user=${encodeURIComponent(user)}">&#128101; Personas</a>
        <a href="/categorias?user=${encodeURIComponent(user)}">&#128193; Categorias</a>
        <a href="/mensajes?user=${encodeURIComponent(user)}">&#128140; Mensajes</a>
        <a href="/parametros?user=${encodeURIComponent(user)}">&#9881; Parametrizacion</a>
        <a href="/medios?user=${encodeURIComponent(user)}">&#128241; Medios</a>
    </div>` : '';
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Priority Flow</title><style>${CSS}</style></head><body>${nav}<div class="${showNav?'main':''}">${body}</div></body></html>`;
}

function topbar(title, user) {
    return `<div class="topbar"><h2>${title}</h2><div class="right"><span class="user-tag">&#128100; ${user}</span><a class="btn-logout" href="/">Cerrar sesion</a></div></div>`;
}

function msg(text, type='success') {
    return text ? `<p class="${type}">${text}</p>` : '';
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query(
        `SELECT u.*, p.nombre pnombre, r.nombre rol FROM usuario u
         JOIN persona p ON u.id_persona=p.id JOIN rol r ON u.id_rol=r.id
         WHERE u.username=? AND u.password=? AND u.estado='activo' LIMIT 1`,
        [username, password], (err, rows) => {
            if (err || !rows.length) return res.redirect('/?error=1');
            res.redirect(`/dashboard?user=${encodeURIComponent(rows[0].username)}`);
        });
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
app.get('/dashboard', (req, res) => {
    const user = req.query.user || 'admin';
    const q = (sql) => new Promise((resolve) => db.query(sql, (e,r) => resolve(r||[])));
    Promise.all([
        q('SELECT COUNT(*) c FROM usuario'),
        q('SELECT COUNT(*) c FROM mensaje'),
        q('SELECT COUNT(*) c FROM persona'),
        q("SELECT COUNT(*) c FROM detalle_mensaje WHERE estado='pendiente'"),
        q(`SELECT m.id,m.asunto,m.fechaCreacion,c.nombre cat FROM mensaje m
           JOIN categoria c ON m.id_categoria=c.id ORDER BY m.id DESC LIMIT 6`)
    ]).then(([u,m,p,d,msgs]) => {
        const rows = msgs.map(x=>`<tr><td>#${x.id}</td><td>${x.asunto}</td><td><span class="badge badge-blue">${x.cat}</span></td><td style="color:#475569;font-size:12px">${new Date(x.fechaCreacion).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="4" style="color:#475569">Sin mensajes aun</td></tr>';
        res.send(html('Dashboard', `
            ${topbar('Dashboard', user)}
            <div class="cards">
                <div class="card"><div class="label">Usuarios</div><div class="value">${u[0].c}</div><div class="sub">registrados</div></div>
                <div class="card"><div class="label">Mensajes</div><div class="value">${m[0].c}</div><div class="sub">enviados</div></div>
                <div class="card"><div class="label">Personas</div><div class="value">${p[0].c}</div><div class="sub">en sistema</div></div>
                <div class="card"><div class="label">Pendientes</div><div class="value">${d[0].c}</div><div class="sub">por procesar</div></div>
            </div>
            <div class="section"><h3>Ultimos mensajes</h3>
                <table><thead><tr><th>ID</th><th>Asunto</th><th>Categoria</th><th>Fecha</th></tr></thead>
                <tbody>${rows}</tbody></table>
            </div>`, true, user));
    });
});

// ── PERSONAS ──────────────────────────────────────────────────────────────────
app.get('/personas', (req, res) => {
    const user = req.query.user||'admin', m=req.query.msg||'';
    db.query('SELECT * FROM persona ORDER BY id DESC', (err, rows) => {
        const trs = (rows||[]).map(p=>`<tr><td>#${p.id}</td><td>${p.nombre}</td><td>${p.apellido}</td><td>${p.documento}</td>
            <td><form action="/personas/del/${p.id}" method="POST" style="margin:0" onsubmit="return confirm('Eliminar?')">
            <input type="hidden" name="user" value="${user}"><button class="btn btn-danger">Eliminar</button></form></td></tr>`).join('');
        res.send(html('Personas',`
            ${topbar('Personas',user)}${msg(m)}
            <div class="section"><h3>Nueva persona</h3>
            <form action="/personas/new" method="POST"><input type="hidden" name="user" value="${user}">
            <div class="form-grid">
                <div><label>Nombre</label><input type="text" name="nombre" required></div>
                <div><label>Apellido</label><input type="text" name="apellido" required></div>
                <div><label>Documento</label><input type="text" name="documento" required></div>
            </div><button class="btn btn-primary mt">Agregar</button></form></div>
            <div class="section"><h3>Personas registradas</h3>
            <table><thead><tr><th>ID</th><th>Nombre</th><th>Apellido</th><th>Documento</th><th>Accion</th></tr></thead>
            <tbody>${trs||'<tr><td colspan="5" style="color:#475569">Sin registros</td></tr>'}</tbody></table></div>
        `, true, user));
    });
});
app.post('/personas/new', (req,res)=>{
    const {nombre,apellido,documento,user}=req.body;
    db.query('INSERT INTO persona (nombre,apellido,documento) VALUES (?,?,?)',[nombre,apellido,documento],(err)=>
        res.redirect(`/personas?user=${user}&msg=${err?'Error:'+err.message:'Persona creada'}`));
});
app.post('/personas/del/:id',(req,res)=>{
    const {user}=req.body;
    db.query('DELETE FROM persona WHERE id=?',[req.params.id],()=>res.redirect(`/personas?user=${user}&msg=Persona eliminada`));
});

// ── USUARIOS ──────────────────────────────────────────────────────────────────
app.get('/usuarios', (req, res) => {
    const user = req.query.user||'admin', m=req.query.msg||'';
    const q=(sql,p=[])=>new Promise(r=>db.query(sql,p,(e,d)=>r(d||[])));
    Promise.all([
        q(`SELECT u.*,p.nombre pn,p.apellido pa,r.nombre rol,o.nombre org FROM usuario u
           JOIN persona p ON u.id_persona=p.id JOIN rol r ON u.id_rol=r.id JOIN organizacion o ON u.id_organizacion=o.id ORDER BY u.id DESC`),
        q('SELECT * FROM persona'), q('SELECT * FROM rol'), q('SELECT * FROM organizacion')
    ]).then(([users,personas,roles,orgs])=>{
        const trs=users.map(u=>`<tr><td>#${u.id}</td><td><strong>${u.username}</strong></td><td>${u.pn} ${u.pa}</td>
            <td><span class="badge badge-blue">${u.rol}</span></td><td>${u.org}</td>
            <td><span class="badge ${u.estado==='activo'?'badge-green':'badge-red'}">${u.estado}</span></td>
            <td class="gap">
                <form action="/usuarios/toggle/${u.id}" method="POST" style="margin:0">
                    <input type="hidden" name="user" value="${user}"><input type="hidden" name="estado" value="${u.estado==='activo'?'inactivo':'activo'}">
                    <button class="btn btn-warning">${u.estado==='activo'?'Desactivar':'Activar'}</button></form>
                <form action="/usuarios/del/${u.id}" method="POST" style="margin:0" onsubmit="return confirm('Eliminar?')">
                    <input type="hidden" name="user" value="${user}"><button class="btn btn-danger">Eliminar</button></form>
            </td></tr>`).join('');
        const optP=personas.map(p=>`<option value="${p.id}">${p.nombre} ${p.apellido}</option>`).join('');
        const optR=roles.map(r=>`<option value="${r.id}">${r.nombre}</option>`).join('');
        const optO=orgs.map(o=>`<option value="${o.id}">${o.nombre}</option>`).join('');
        res.send(html('Usuarios',`
            ${topbar('Gestion de Usuarios',user)}${msg(m)}
            <div class="section"><h3>Nuevo usuario</h3>
            <form action="/usuarios/new" method="POST"><input type="hidden" name="user" value="${user}">
            <div class="form-grid">
                <div><label>Persona</label><select name="id_persona" required>${optP}</select></div>
                <div><label>Rol</label><select name="id_rol" required>${optR}</select></div>
                <div><label>Organizacion</label><select name="id_organizacion" required>${optO}</select></div>
                <div><label>Username</label><input type="text" name="username" required></div>
                <div><label>Password</label><input type="password" name="password" required></div>
                <div><label>Estado</label><select name="estado"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
            </div><button class="btn btn-primary mt">Crear usuario</button></form></div>
            <div class="section"><h3>Usuarios registrados</h3>
            <table><thead><tr><th>ID</th><th>Username</th><th>Persona</th><th>Rol</th><th>Organizacion</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>${trs||'<tr><td colspan="7" style="color:#475569">Sin usuarios</td></tr>'}</tbody></table></div>
        `, true, user));
    });
});
app.post('/usuarios/new',(req,res)=>{
    const {id_persona,id_rol,id_organizacion,username,password,estado,user}=req.body;
    db.query('INSERT INTO usuario (id_persona,id_rol,id_organizacion,username,password,estado) VALUES (?,?,?,?,?,?)',
        [id_persona,id_rol,id_organizacion,username,password,estado],(err)=>
        res.redirect(`/usuarios?user=${user}&msg=${err?'Error:'+err.message:'Usuario creado'}`));
});
app.post('/usuarios/toggle/:id',(req,res)=>{
    const {estado,user}=req.body;
    db.query('UPDATE usuario SET estado=? WHERE id=?',[estado,req.params.id],()=>res.redirect(`/usuarios?user=${user}&msg=Estado actualizado`));
});
app.post('/usuarios/del/:id',(req,res)=>{
    const {user}=req.body;
    db.query('DELETE FROM usuario WHERE id=?',[req.params.id],()=>res.redirect(`/usuarios?user=${user}&msg=Usuario eliminado`));
});

// ── CATEGORIAS ────────────────────────────────────────────────────────────────
app.get('/categorias',(req,res)=>{
    const user=req.query.user||'admin',m=req.query.msg||'';
    const q=(sql)=>new Promise(r=>db.query(sql,(e,d)=>r(d||[])));
    Promise.all([
        q(`SELECT c.*,o.nombre org FROM categoria c JOIN organizacion o ON c.id_organizacion=o.id ORDER BY c.id DESC`),
        q('SELECT * FROM organizacion')
    ]).then(([cats,orgs])=>{
        const trs=cats.map(c=>`<tr><td>#${c.id}</td><td>${c.nombre}</td><td style="color:#64748b">${c.descripcion||'-'}</td><td>${c.org}</td>
            <td><form action="/categorias/del/${c.id}" method="POST" style="margin:0" onsubmit="return confirm('Eliminar?')">
            <input type="hidden" name="user" value="${user}"><button class="btn btn-danger">Eliminar</button></form></td></tr>`).join('');
        const optO=orgs.map(o=>`<option value="${o.id}">${o.nombre}</option>`).join('');
        res.send(html('Categorias',`
            ${topbar('Categorias',user)}${msg(m)}
            <div class="section"><h3>Nueva categoria</h3>
            <form action="/categorias/new" method="POST"><input type="hidden" name="user" value="${user}">
            <div class="form-grid">
                <div><label>Nombre</label><input type="text" name="nombre" required></div>
                <div><label>Organizacion</label><select name="id_organizacion" required>${optO}</select></div>
                <div style="grid-column:1/-1"><label>Descripcion</label><textarea name="descripcion"></textarea></div>
            </div><button class="btn btn-primary mt">Crear</button></form></div>
            <div class="section"><h3>Categorias</h3>
            <table><thead><tr><th>ID</th><th>Nombre</th><th>Descripcion</th><th>Organizacion</th><th>Accion</th></tr></thead>
            <tbody>${trs||'<tr><td colspan="5" style="color:#475569">Sin categorias</td></tr>'}</tbody></table></div>
        `,true,user));
    });
});
app.post('/categorias/new',(req,res)=>{
    const {nombre,descripcion,id_organizacion,user}=req.body;
    db.query('INSERT INTO categoria (nombre,descripcion,id_organizacion) VALUES (?,?,?)',[nombre,descripcion,id_organizacion],(err)=>
        res.redirect(`/categorias?user=${user}&msg=${err?'Error:'+err.message:'Categoria creada'}`));
});
app.post('/categorias/del/:id',(req,res)=>{
    const {user}=req.body;
    db.query('DELETE FROM categoria WHERE id=?',[req.params.id],()=>res.redirect(`/categorias?user=${user}&msg=Categoria eliminada`));
});

// ── MENSAJES ──────────────────────────────────────────────────────────────────
app.get('/mensajes',(req,res)=>{
    const user=req.query.user||'admin',m=req.query.msg||'';
    const q=(sql)=>new Promise(r=>db.query(sql,(e,d)=>r(d||[])));
    Promise.all([
        q(`SELECT m.*,c.nombre cat,p.nombre pn,p.apellido pa,u.username emisor FROM mensaje m
           JOIN categoria c ON m.id_categoria=c.id JOIN persona p ON m.id_persona_receptor=p.id
           JOIN usuario u ON m.id_usuario_emisor=u.id ORDER BY m.id DESC`),
        q('SELECT * FROM categoria'), q('SELECT * FROM persona'), q('SELECT id,username FROM usuario')
    ]).then(([msgs,cats,personas,users])=>{
        const trs=msgs.map(x=>`<tr><td>#${x.id}</td><td>${x.emisor}</td><td>${x.pn} ${x.pa}</td><td>${x.asunto}</td>
            <td><span class="badge badge-blue">${x.cat}</span></td>
            <td style="color:#475569;font-size:12px">${new Date(x.fechaCreacion).toLocaleString()}</td></tr>`).join('');
        const optC=cats.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');
        const optP=personas.map(p=>`<option value="${p.id}">${p.nombre} ${p.apellido}</option>`).join('');
        const optU=users.map(u=>`<option value="${u.id}">${u.username}</option>`).join('');
        res.send(html('Mensajes',`
            ${topbar('Mensajes / Notificaciones',user)}${msg(m)}
            <div class="section"><h3>Nuevo mensaje</h3>
            <form action="/mensajes/new" method="POST"><input type="hidden" name="user" value="${user}">
            <div class="form-grid">
                <div><label>Emisor</label><select name="id_usuario_emisor" required>${optU}</select></div>
                <div><label>Receptor</label><select name="id_persona_receptor" required>${optP}</select></div>
                <div><label>Categoria</label><select name="id_categoria" required>${optC}</select></div>
                <div><label>Asunto</label><input type="text" name="asunto" required></div>
                <div style="grid-column:1/-1"><label>Cuerpo</label><textarea name="cuerpo" required></textarea></div>
            </div><button class="btn btn-primary mt">Enviar mensaje</button></form></div>
            <div class="section"><h3>Historial</h3>
            <table><thead><tr><th>ID</th><th>Emisor</th><th>Receptor</th><th>Asunto</th><th>Categoria</th><th>Fecha</th></tr></thead>
            <tbody>${trs||'<tr><td colspan="6" style="color:#475569">Sin mensajes</td></tr>'}</tbody></table></div>
        `,true,user));
    });
});
app.post('/mensajes/new',(req,res)=>{
    const {id_usuario_emisor,id_persona_receptor,id_categoria,asunto,cuerpo,user}=req.body;
    db.query('INSERT INTO mensaje (id_usuario_emisor,id_persona_receptor,id_categoria,asunto,cuerpo) VALUES (?,?,?,?,?)',
        [id_usuario_emisor,id_persona_receptor,id_categoria,asunto,cuerpo],(err,result)=>{
            if(err) return res.redirect(`/mensajes?user=${user}&msg=Error:${err.message}`);
            db.query('SELECT id_medio FROM parametrizacion_mensaje WHERE id_categoria=?',[id_categoria],(e2,params)=>{
                (params||[]).forEach(p=>db.query('INSERT INTO detalle_mensaje (id_mensaje,id_medio,estado) VALUES (?,?,?)',[result.insertId,p.id_medio,'pendiente']));
                res.redirect(`/mensajes?user=${user}&msg=Mensaje enviado correctamente`);
            });
        });
});

// ── PARAMETRIZACION ───────────────────────────────────────────────────────────
app.get('/parametros',(req,res)=>{
    const user=req.query.user||'admin',m=req.query.msg||'';
    const q=(sql)=>new Promise(r=>db.query(sql,(e,d)=>r(d||[])));
    Promise.all([
        q(`SELECT pm.*,c.nombre cat,i.nombre imp,mc.tipo medio FROM parametrizacion_mensaje pm
           JOIN categoria c ON pm.id_categoria=c.id JOIN importancia i ON pm.id_importancia=i.id
           JOIN medio_comunicacion mc ON pm.id_medio=mc.id ORDER BY pm.id DESC`),
        q('SELECT * FROM categoria'), q('SELECT * FROM importancia ORDER BY orden'), q('SELECT * FROM medio_comunicacion')
    ]).then(([params,cats,imps,medios])=>{
        const trs=params.map(p=>`<tr><td>#${p.id}</td><td>${p.cat}</td>
            <td><span class="badge badge-yellow">${p.imp}</span></td>
            <td><span class="badge badge-blue">${p.medio}</span></td>
            <td><form action="/parametros/del/${p.id}" method="POST" style="margin:0">
            <input type="hidden" name="user" value="${user}"><button class="btn btn-danger">Eliminar</button></form></td></tr>`).join('');
        const optC=cats.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');
        const optI=imps.map(i=>`<option value="${i.id}">${i.nombre}</option>`).join('');
        const optM=medios.map(m=>`<option value="${m.id}">${m.tipo}</option>`).join('');
        res.send(html('Parametrizacion',`
            ${topbar('Parametrizacion de Mensajes',user)}${msg(m)}
            <div class="section"><h3>Nueva parametrizacion</h3>
            <form action="/parametros/new" method="POST"><input type="hidden" name="user" value="${user}">
            <div class="form-grid">
                <div><label>Categoria</label><select name="id_categoria" required>${optC}</select></div>
                <div><label>Importancia</label><select name="id_importancia" required>${optI}</select></div>
                <div><label>Medio</label><select name="id_medio" required>${optM}</select></div>
            </div><button class="btn btn-primary mt">Agregar</button></form></div>
            <div class="section"><h3>Parametrizaciones activas</h3>
            <table><thead><tr><th>ID</th><th>Categoria</th><th>Importancia</th><th>Medio</th><th>Accion</th></tr></thead>
            <tbody>${trs||'<tr><td colspan="5" style="color:#475569">Sin parametrizaciones</td></tr>'}</tbody></table></div>
        `,true,user));
    });
});
app.post('/parametros/new',(req,res)=>{
    const {id_categoria,id_importancia,id_medio,user}=req.body;
    db.query('INSERT INTO parametrizacion_mensaje (id_categoria,id_importancia,id_medio) VALUES (?,?,?)',
        [id_categoria,id_importancia,id_medio],(err)=>
        res.redirect(`/parametros?user=${user}&msg=${err?'Error:'+err.message:'Parametrizacion creada'}`));
});
app.post('/parametros/del/:id',(req,res)=>{
    const {user}=req.body;
    db.query('DELETE FROM parametrizacion_mensaje WHERE id=?',[req.params.id],()=>res.redirect(`/parametros?user=${user}&msg=Eliminado`));
});

// ── MEDIOS ────────────────────────────────────────────────────────────────────
app.get('/medios',(req,res)=>{
    const user=req.query.user||'admin',m=req.query.msg||'';
    db.query('SELECT * FROM medio_comunicacion ORDER BY id DESC',(err,rows)=>{
        const trs=(rows||[]).map(x=>`<tr><td>#${x.id}</td><td><span class="badge badge-blue">${x.tipo}</span></td>
            <td style="color:#475569;font-size:13px">${x.apiEndpoint||'-'}</td>
            <td><form action="/medios/del/${x.id}" method="POST" style="margin:0" onsubmit="return confirm('Eliminar?')">
            <input type="hidden" name="user" value="${user}"><button class="btn btn-danger">Eliminar</button></form></td></tr>`).join('');
        res.send(html('Medios',`
            ${topbar('Medios de Comunicacion',user)}${msg(m)}
            <div class="section"><h3>Nuevo medio</h3>
            <form action="/medios/new" method="POST"><input type="hidden" name="user" value="${user}">
            <div class="form-grid">
                <div><label>Tipo</label><input type="text" name="tipo" placeholder="email, sms, push..." required></div>
                <div><label>API Endpoint</label><input type="url" name="apiEndpoint" placeholder="https://..."></div>
            </div><button class="btn btn-primary mt">Agregar</button></form></div>
            <div class="section"><h3>Medios registrados</h3>
            <table><thead><tr><th>ID</th><th>Tipo</th><th>API Endpoint</th><th>Accion</th></tr></thead>
            <tbody>${trs||'<tr><td colspan="4" style="color:#475569">Sin medios</td></tr>'}</tbody></table></div>
        `,true,user));
    });
});
app.post('/medios/new',(req,res)=>{
    const {tipo,apiEndpoint,user}=req.body;
    db.query('INSERT INTO medio_comunicacion (tipo,apiEndpoint) VALUES (?,?)',[tipo,apiEndpoint||null],(err)=>
        res.redirect(`/medios?user=${user}&msg=${err?'Error:'+err.message:'Medio creado'}`));
});
app.post('/medios/del/:id',(req,res)=>{
    const {user}=req.body;
    db.query('DELETE FROM medio_comunicacion WHERE id=?',[req.params.id],()=>res.redirect(`/medios?user=${user}&msg=Medio eliminado`));
});

// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Priority Flow en http://localhost:${PORT}`));