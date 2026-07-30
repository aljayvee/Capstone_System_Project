const mysql = require('c:/Capstone_Project_Web/server/node_modules/mysql2/promise');

async function inspectSchema() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'errand_system_db'
  });

  const [tables] = await conn.query('SHOW TABLES;');
  console.log('Tables in errand_system_db:', tables.map(t => Object.values(t)[0]));

  const [cols] = await conn.query('DESCRIBE users;');
  console.log('\nUsers Table Columns:');
  cols.forEach(c => console.log(` - ${c.Field}: ${c.Type} (Null: ${c.Null}, Key: ${c.Key})`));

  const [users] = await conn.query('SELECT * FROM users;');
  console.log('\nExisting Users Data:');
  console.log(users);

  await conn.end();
}

inspectSchema().catch(console.error);
