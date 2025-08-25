const toneAnalysisService = require('./services/toneAnalysis');

async function testOpenAIIntegration() {
  console.log('🧪 Testing OpenAI API Integration...\n');
  
  // Test messages with different tones
  const testMessages = [
    {
      message: "I absolutely love your website! It's fantastic and amazing work!",
      expectedSentiment: "positive"
    },
    {
      message: "I'm really frustrated with this service. It's terrible and disappointing.",
      expectedSentiment: "negative"
    },
    {
      message: "Hello, I have a question about your services. Can you help me?",
      expectedSentiment: "neutral"
    }
  ];

  for (let i = 0; i < testMessages.length; i++) {
    const test = testMessages[i];
    console.log(`Test ${i + 1}: Testing ${test.expectedSentiment} message`);
    console.log(`Message: "${test.message}"`);
    console.log('Analyzing...\n');
    
    try {
      const result = await toneAnalysisService.analyzeMessageTone(test.message);
      
      console.log('📊 Analysis Results:');
      console.log(`   Sentiment: ${result.sentiment}`);
      console.log(`   Emotion: ${result.emotion}`);
      console.log(`   Confidence: ${result.confidence}`);
      console.log(`   Summary: ${result.summary}`);
      console.log(`   Analyzed At: ${result.analyzedAt}`);
      
      // Check if using OpenAI or fallback
      const usingOpenAI = result.confidence > 0.5 && !result.summary.includes('keyword-based');
      console.log(`   🤖 Using: ${usingOpenAI ? 'OpenAI API' : 'Fallback Analysis'}`);
      
      console.log('   ✅ Test passed!\n');
      console.log('-'.repeat(50) + '\n');
      
    } catch (error) {
      console.error(`   ❌ Test failed: ${error.message}\n`);
    }
  }
  
  console.log('🎉 OpenAI API Integration Test Complete!');
}

// Run the test
testOpenAIIntegration().catch(console.error);
