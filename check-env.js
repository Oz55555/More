require('dotenv').config();

console.log('🔍 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 3000);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing');

if (process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY.length);
    console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY.substring(0, 7) + '...');
}

if (process.env.STRIPE_PUBLISHABLE_KEY) {
    console.log('STRIPE_PUBLISHABLE_KEY starts with:', process.env.STRIPE_PUBLISHABLE_KEY.substring(0, 7) + '...');
}

if (process.env.STRIPE_SECRET_KEY) {
    console.log('STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...');
} else {
  console.log('❌ STRIPE_SECRET_KEY is not set in environment variables');
}
