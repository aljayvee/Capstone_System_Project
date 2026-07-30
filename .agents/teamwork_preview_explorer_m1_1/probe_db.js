import mysql from 'mysql2/promise';

const configs = [
  { host: '127.0.0.1', port: 3306, user: 'root', password: '' },
  { host: 'localhost', port: 3306, user: 'root', password: '' },
  { host: '127.0.0.1', port: 3306, user: 'root', password: 'root' },
  { host: 'localhost', port: 3306, user: 'root', password: 'root' },
  { host: '127.0.0.1', port: 3306, user: 'root', password: 'password' },
];

async function probe() {
  console.log("Probing MariaDB connections...");
  for (const cfg of configs) {
    try {
      console.log(`Trying ${cfg.user}@${cfg.host}:${cfg.port} (pass: "${cfg.password}")...`);
      const conn = await mysql.createConnection(cfg);
      console.log(`SUCCESS! Connected to MariaDB at ${cfg.host}:${cfg.port}`);
      const [rows] = await conn.query('SHOW DATABASES;');
      console.log('Databases:', rows.map(r => r.Database));
      await conn.end();
      return cfg;
    } catch (err) {
      console.log(`Failed (${cfg.host}:${cfg.port}): ${err.message}`);
    }
  }
  console.log("Could not connect with default probed credentials.");
}

probe();
