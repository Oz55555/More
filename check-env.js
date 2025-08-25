require('dotenv').config();

console.log('🔍 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');

if (process.env.OPENAI_API_KEY) {
  console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY.length);
  console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY.substring(0, 7) + '...');
} else {
  console.log('❌ OPENAI_API_KEY is not set in environment variables');
}
