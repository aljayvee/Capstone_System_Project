const bcrypt = require('c:/Capstone_Project_Web/server/node_modules/bcryptjs');

const users = [
  { username: 'owner', hash: '$2a$10$.u/6q.J9RNjZ6.N6XqMMcOIRZ9vL.OmwlVtXI7aGRZGAJg1.j1n2C', testPass: 'owner123' },
  { username: 'dispatcher', hash: '$2a$10$P4I9ruAwSCVThutxtBzI3eL7dTrkYU0Kj3dCLF4eO/s4jZVvBxEs6', testPass: 'dispatch123' },
  { username: 'rider01', hash: '$2a$10$AMWMSptkqfTsB1Z4pe1gPe/XL7WcANBM3KadwFtcKebW7jaZ/hbK2', testPass: 'rider123' },
];

async function check() {
  for (const u of users) {
    const match = await bcrypt.compare(u.testPass, u.hash);
    console.log(`User '${u.username}' password '${u.testPass}' matches hash: ${match}`);
  }
}

check();
