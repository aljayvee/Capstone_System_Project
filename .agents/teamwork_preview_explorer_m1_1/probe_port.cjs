const net = require('net');

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      console.log(`Port ${port} on ${host} is OPEN!`);
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      console.log(`Port ${port} on ${host} TIMED OUT.`);
      socket.destroy();
      resolve(false);
    });
    socket.on('error', (err) => {
      console.log(`Port ${port} on ${host} CLOSED/ERROR: ${err.message}`);
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  console.log("Checking MySQL / MariaDB ports...");
  await checkPort('127.0.0.1', 3306);
  await checkPort('localhost', 3306);
  await checkPort('127.0.0.1', 3307);
}

main();
