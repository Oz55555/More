/**
 * Script para probar todas las rutas del servidor
 * Ejecutar: node test-routes.js
 */

const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const routes = [
  { path: '/', description: 'Home page' },
  { path: '/login', description: 'Login page' },
  { path: '/donation', description: 'Donation page' },
  { path: '/donation-select', description: 'Donation select page' },
  { path: '/payment', description: 'Payment page' },
  { path: '/transfer', description: 'Transfer page' },
  { path: '/robots.txt', description: 'Robots.txt' },
  { path: '/sitemap.xml', description: 'Sitemap' },
  { path: '/api/health', description: 'Health check' },
  { path: '/css/style.css', description: 'CSS file' },
  { path: '/js/main.js', description: 'JS file' }
];

async function testRoute(route) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${route.path}`;
    
    http.get(url, (res) => {
      const status = res.statusCode;
      const success = status === 200 || status === 304;
      
      console.log(`${success ? '✅' : '❌'} ${route.description.padEnd(25)} - ${route.path.padEnd(25)} - Status: ${status}`);
      
      resolve({ route: route.path, status, success });
    }).on('error', (err) => {
      console.log(`❌ ${route.description.padEnd(25)} - ${route.path.padEnd(25)} - Error: ${err.message}`);
      resolve({ route: route.path, status: 'ERROR', success: false });
    });
  });
}

async function runTests() {
  console.log('\n🧪 Testing Routes...\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  const results = [];
  
  for (const route of routes) {
    const result = await testRoute(route);
    results.push(result);
  }
  
  console.log('\n📊 Summary:\n');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%\n`);
  
  if (failed > 0) {
    console.log('Failed routes:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.route} (${r.status})`);
    });
  }
}

// Run tests
runTests().catch(console.error);
