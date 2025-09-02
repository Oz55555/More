const toneAnalysis = require('./services/toneAnalysis');

async function testDeepSeekIntegration() {
  console.log('Testing DeepSeek API integration...\n');
  
  const testMessages = [
    'I love this new feature! It\'s absolutely amazing and works perfectly.',
    'This is terrible. I hate how broken everything is.',
    'Can you help me understand how this works?',
    'Estoy muy feliz con los resultados. ¡Excelente trabajo!',
    'I feel so depressed and hopeless about everything.'
  ];

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`\n--- Test ${i + 1} ---`);
    console.log(`Message: "${message}"`);
    
    try {
      const result = await toneAnalysis.analyzeMessageTone(message);
      console.log('Analysis Result:');
      console.log(`- Sentiment: ${result.sentiment} (${Math.round(result.confidence * 100)}% confidence)`);
      console.log(`- Emotion: ${result.emotion}`);
      console.log(`- Toxicity: ${result.toxicity} (score: ${result.toxicityScore})`);
      console.log(`- Language: ${result.language}`);
      console.log(`- Keywords: ${result.keywords.join(', ')}`);
      console.log(`- Topics: ${result.topics.join(', ')}`);
      console.log(`- Summary: ${result.summary}`);
    } catch (error) {
      console.error(`Error analyzing message ${i + 1}:`, error.message);
    }
  }

  // Test token usage stats
  console.log('\n--- Token Usage Stats ---');
  const stats = toneAnalysis.getTokenStats();
  console.log('Total tokens used:', stats.total.tokensUsed);
  console.log('Total requests:', stats.total.requests);
  console.log('Total cost: $', stats.total.cost.toFixed(6));
  console.log('Average tokens per request:', stats.averageTokensPerRequest);
}

// Only run if this file is executed directly
if (require.main === module) {
  testDeepSeekIntegration().catch(console.error);
}

module.exports = { testDeepSeekIntegration };
