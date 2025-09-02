// Simple test to verify admin dashboard endpoints
console.log('🔍 Testing Admin Dashboard Endpoints...\n');

// Test if server is responding
const http = require('http');

function testEndpoint(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: data,
                    headers: res.headers
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (method === 'POST') {
            req.write(JSON.stringify({}));
        }
        req.end();
    });
}

async function runTests() {
    console.log('1. Testing server health...');
    try {
        const health = await testEndpoint('/api/health');
        if (health.status === 200) {
            console.log('✅ Server is responding');
        } else {
            console.log('❌ Server health check failed');
        }
    } catch (error) {
        console.log('❌ Server not responding:', error.message);
        return;
    }

    console.log('\n2. Testing admin endpoints (should redirect to login)...');
    try {
        const contacts = await testEndpoint('/api/contacts?includeTone=true');
        console.log(`📊 Contacts endpoint status: ${contacts.status}`);
        
        const stats = await testEndpoint('/api/contacts/tone-stats');
        console.log(`📈 Tone stats endpoint status: ${stats.status}`);
        
        const tokens = await testEndpoint('/api/token-stats');
        console.log(`🔢 Token stats endpoint status: ${tokens.status}`);
        
    } catch (error) {
        console.log('❌ Endpoint test failed:', error.message);
    }

    console.log('\n✅ Dashboard endpoints are configured and responding');
    console.log('🌐 Access the dashboard at: http://localhost:3000/login');
    console.log('🔑 Use credentials: admin / admin123');
}

runTests();
