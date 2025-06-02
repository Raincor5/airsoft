// find-ip.js - Helper script to find your computer's IP address
const os = require('os');

console.log('\n🌐 Finding your network IP addresses...\n');

const networkInterfaces = os.networkInterfaces();
const addresses = [];

Object.keys(networkInterfaces).forEach(interfaceName => {
  const interfaces = networkInterfaces[interfaceName];
  interfaces.forEach(iface => {
    if (iface.family === 'IPv4' && !iface.internal) {
      addresses.push({
        name: interfaceName,
        address: iface.address
      });
    }
  });
});

if (addresses.length === 0) {
  console.log('❌ No network interfaces found!');
  console.log('Make sure you are connected to a network.\n');
} else {
  console.log('📱 Use one of these IP addresses in your App.js file:\n');
  addresses.forEach(addr => {
    console.log(`   ${addr.name}: ${addr.address}`);
  });
  
  console.log('\n📝 Update App.js with:');
  console.log(`   const WS_URL = 'ws://${addresses[0].address}:8080/ws';\n`);
  
  console.log('ℹ️  Make sure:');
  console.log('   1. Your phone and computer are on the same WiFi network');
  console.log('   2. The server is running (npm start in airsoft-server)');
  console.log('   3. No firewall is blocking port 8080\n');
}