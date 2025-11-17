// Script para probar la detección de geolocalización
// Uso: node test-geolocation.js [IP opcional]

const fetch = require('node-fetch');

async function testGeolocation(testIp) {
    console.log('🧪 Probando detección de geolocalización...\n');
    
    const ips = testIp ? [testIp] : [
        '84.22.98.123',    // Bulgaria (Sofia)
        '8.8.8.8',         // USA (Google DNS)
        '200.33.171.1',    // México
        '185.60.216.35',   // Alemania
        '103.102.166.224'  // Japón
    ];
    
    for (const ip of ips) {
        console.log(`\n📍 Probando IP: ${ip}`);
        console.log('─'.repeat(40));
        
        // Probar ipapi.co
        try {
            const response = await fetch(`https://ipapi.co/${ip}/json/`);
            const data = await response.json();
            if (data.country_code) {
                console.log(`✅ ipapi.co: ${data.country_code} - ${data.country_name}`);
                console.log(`   Ciudad: ${data.city || 'N/A'}, Región: ${data.region || 'N/A'}`);
            } else {
                console.log(`❌ ipapi.co: No pudo detectar`);
            }
        } catch (error) {
            console.log(`❌ ipapi.co: Error - ${error.message}`);
        }
        
        // Probar ip-api.com
        try {
            const response = await fetch(`http://ip-api.com/json/${ip}`);
            const data = await response.json();
            if (data.status === 'success') {
                console.log(`✅ ip-api.com: ${data.countryCode} - ${data.country}`);
                console.log(`   Ciudad: ${data.city || 'N/A'}, Región: ${data.regionName || 'N/A'}`);
            } else {
                console.log(`❌ ip-api.com: ${data.message || 'No pudo detectar'}`);
            }
        } catch (error) {
            console.log(`❌ ip-api.com: Error - ${error.message}`);
        }
        
        // Probar ipinfo.io
        try {
            const response = await fetch(`https://ipinfo.io/${ip}/json`);
            const data = await response.json();
            if (data.country) {
                console.log(`✅ ipinfo.io: ${data.country} - ${data.city || 'N/A'}`);
                console.log(`   Región: ${data.region || 'N/A'}, Org: ${data.org || 'N/A'}`);
            } else {
                console.log(`❌ ipinfo.io: No pudo detectar`);
            }
        } catch (error) {
            console.log(`❌ ipinfo.io: Error - ${error.message}`);
        }
    }
    
    console.log('\n' + '═'.repeat(40));
    console.log('✨ Pruebas completadas');
}

// Ejecutar prueba
const customIp = process.argv[2];
if (customIp) {
    console.log(`🔧 Usando IP personalizada: ${customIp}`);
}
testGeolocation(customIp);
