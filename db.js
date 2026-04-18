const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'priority_flow',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, conn) => {
    if (err) { console.error('Error conectando a MySQL:', err.message); return; }
    console.log('Conectado a MySQL — priority_flow');
    conn.release();
});

module.exports = db;