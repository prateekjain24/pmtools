/**
 * Direct LLM API Integration for PM Tools Standalone
 * Supports Google Gemini and Anthropic Claude APIs with BYOK
 */

// ==================== LLM PROMPTS ====================
// Port of app/llm/prompts.py

export const LLM_PROMPTS = {
  hypothesisAssessment: (hypothesis) => `
You are a senior statistician reviewing this A/B testing hypothesis. Be moderately critical and rigorous in your evaluation:

"${hypothesis}"

Evaluate using this strict scoring rubric:
• **9-10**: Exceptional - Clear action→metric→magnitude with justification (e.g., "Changing CTA from 'Learn More' to 'Get Started' will increase signup conversion rate by at least 15% because it creates more urgency")
• **7-8**: Good - Specifies change, metric, and expected direction with some quantification  
• **5-6**: Average - Mentions what's being tested and general expectation but lacks precision
• **3-4**: Poor - Vague about change or outcome, missing key elements
• **1-2**: Very Poor - No clear direction, unmeasurable, or fundamentally flawed

**Common issues to penalize:**
- Vague language ("improve", "better", "increase" without specifics)
- No quantified expectation or timeframe
- Unclear what exactly is being changed
- Unmeasurable outcomes
- Missing baseline or comparison point
- No logical reasoning for expected outcome

**Criteria for evaluation:**
1. **Specificity**: Does it clearly state WHAT is changing FROM what TO what?
2. **Measurability**: Is the outcome quantifiable with specific metrics?
3. **Magnitude**: Does it specify HOW MUCH change is expected?
4. **Logic**: Is there reasoning for WHY this change should work?

Be critical - most hypotheses have room for improvement. A score of 8+ should be rare and only for truly well-crafted hypotheses.

Format your response as:
Score: X/10
Assessment: [Your critical assessment in 2-3 sentences explaining the score]
Suggestions: [Specific, actionable improvements - always provide suggestions unless score is 9+]
`,

  resultsInterpretation: (hypothesis, metricName, statisticalResults, pmNotes = null) => {
    const resultsSummary = `
Control conversion rate: ${statisticalResults.control_conversion_rate || 'N/A'}
Treatment conversion rate: ${statisticalResults.treatment_conversion_rate || 'N/A'}
Relative lift: ${statisticalResults.relative_lift || 'N/A'}
P-value: ${statisticalResults.p_value || 'N/A'}
Statistical significance: ${statisticalResults.is_significant || 'N/A'}
`;
    
    const contextSection = pmNotes ? `PM Context: ${pmNotes}` : '';
    
    return `
You are a statistical consultant helping a Product Manager interpret A/B test results.

Original Hypothesis: "${hypothesis}"
Primary Metric: ${metricName}

Statistical Results:
${resultsSummary}

${contextSection}

Please provide a plain-English interpretation of these results. Consider:
1. What do these results mean in practical terms?
2. Are the results statistically significant and practically significant?
3. What factors might explain these results?
4. What are the key takeaways for the Product Manager?

Keep your explanation accessible to someone who is data-literate but not a statistician.
`;
  },

  recommendations: (hypothesis, statisticalResults, pmNotes = null) => {
    const significance = statisticalResults.is_significant || false;
    const pValue = statisticalResults.p_value || 1.0;
    const relativeLift = statisticalResults.relative_lift || 0;
    
    return `
Based on these A/B test results, provide 3-5 specific, actionable next steps for the Product Manager:

Hypothesis: "${hypothesis}"
Statistical significance: ${significance}
P-value: ${pValue}
Relative lift: ${relativeLift}
${pmNotes ? `PM Context: ${pmNotes}` : ''}

For each recommendation, provide:
1. The specific action (e.g., "SHIP TO ALL USERS", "ITERATE AND RE-TEST", "ABANDON HYPOTHESIS")
2. A brief rationale (1-2 sentences)
3. A confidence level (High/Medium/Low)

Format as:
1. ACTION: [Action] - CONFIDENCE: [Level]
   Rationale: [Explanation]

2. ACTION: [Action] - CONFIDENCE: [Level]
   Rationale: [Explanation]

[Continue for 3-5 recommendations]
`;
  },

  followupQuestions: (hypothesis, statisticalResults, pmNotes = null) => `
Based on these A/B test results, generate 5 critical follow-up questions the Product Manager should investigate:

Hypothesis: "${hypothesis}"
Results: ${statisticalResults.is_significant || false} significance, ${statisticalResults.relative_lift || 0} relative lift
${pmNotes ? `PM Context: ${pmNotes}` : ''}

Focus on questions that would:
1. Deepen understanding of user behavior
2. Identify potential confounding factors
3. Explore segmentation opportunities
4. Guide future experiment design
5. Inform broader product strategy

Format as a numbered list of 5 questions, each being specific and actionable.
`
};

// ==================== LLM CLIENT CLASSES ====================

/**
 * Google Gemini API Client
 */
export class GoogleGeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-2.5-flash'; // Latest stable model
  }

  async isAvailable() {
    try {
      if (!this.apiKey) return false;
      
      // Test with a simple request
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'x-goog-api-key': this.apiKey
        }
      });
      
      return response.ok;
    } catch (error) {
      console.warn('Gemini availability check failed:', error);
      return false;
    }
  }

  async generateText(prompt) {
    if (!this.apiKey) {
      throw new Error('Google API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/models/${this.model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorData}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      }
      
      throw new Error('Unexpected Gemini API response format');
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }
}

/**
 * Anthropic Claude API Client
 */
export class AnthropicClaudeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.anthropic.com';
    this.model = 'claude-3-5-sonnet-20241022'; // Latest model
  }

  async isAvailable() {
    try {
      if (!this.apiKey) return false;
      
      // Test with a simple request (Claude doesn't have a models endpoint, so we'll use a minimal completion)
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: 'Hi'
          }]
        })
      });
      
      return response.ok;
    } catch (error) {
      console.warn('Claude availability check failed:', error);
      return false;
    }
  }

  async generateText(prompt) {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          temperature: 0.7,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errorData}`);
      }

      const data = await response.json();
      
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
      }
      
      throw new Error('Unexpected Claude API response format');
    } catch (error) {
      console.error('Claude API call failed:', error);
      throw error;
    }
  }
}

// ==================== LLM MANAGER ====================

/**
 * LLM Manager with fallback logic
 * Port of app/llm/manager.py functionality
 */
export class LLMManager {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'gemini';
    this.fallbackEnabled = true;
  }

  async initialize(apiKeys, defaultProvider = 'gemini', fallbackEnabled = true) {
    this.defaultProvider = defaultProvider;
    this.fallbackEnabled = fallbackEnabled;
    
    // Initialize providers based on available API keys
    if (apiKeys.googleApiKey) {
      this.providers.set('gemini', new GoogleGeminiClient(apiKeys.googleApiKey));
    }
    
    if (apiKeys.anthropicApiKey) {
      this.providers.set('claude', new AnthropicClaudeClient(apiKeys.anthropicApiKey));
    }
    
    console.log(`🤖 LLM Manager initialized with ${this.providers.size} provider(s)`);
    console.log(`Default provider: ${this.defaultProvider}, Fallback enabled: ${this.fallbackEnabled}`);
  }

  async getAvailableProviders() {
    const available = [];
    
    for (const [name, client] of this.providers) {
      try {
        const isAvailable = await client.isAvailable();
        if (isAvailable) {
          available.push(name);
        }
      } catch (error) {
        console.warn(`Provider ${name} availability check failed:`, error);
      }
    }
    
    return available;
  }

  async generateText(prompt, preferredProvider = null) {
    const providerToUse = preferredProvider || this.defaultProvider;
    
    // Try preferred provider first
    if (this.providers.has(providerToUse)) {
      try {
        console.log(`🎯 Using ${providerToUse} for LLM generation`);
        const result = await this.providers.get(providerToUse).generateText(prompt);
        return {
          text: result,
          provider: providerToUse,
          fallback_used: false
        };
      } catch (error) {
        console.warn(`${providerToUse} failed:`, error.message);
        
        if (!this.fallbackEnabled) {
          throw error;
        }
      }
    }
    
    // Try fallback providers if enabled
    if (this.fallbackEnabled) {
      for (const [name, client] of this.providers) {
        if (name !== providerToUse) {
          try {
            console.log(`🔄 Trying fallback provider: ${name}`);
            const result = await client.generateText(prompt);
            return {
              text: result,
              provider: name,
              fallback_used: true
            };
          } catch (error) {
            console.warn(`Fallback provider ${name} failed:`, error.message);
          }
        }
      }
    }
    
    // All providers failed, return static fallback
    return this.getStaticFallback(prompt);
  }

  getStaticFallback(prompt) {
    console.warn('🚨 All LLM providers failed, using static fallback');
    
    if (prompt.includes('Score:')) {
      // Hypothesis assessment fallback
      return {
        text: `Score: 5/10
Assessment: Unable to assess hypothesis due to AI service unavailability. Please review manually for clarity, measurability, and specificity.
Suggestions: Ensure hypothesis specifies what is changing, expected metric impact, and magnitude of change.`,
        provider: 'fallback',
        fallback_used: true
      };
    } else if (prompt.includes('recommendations') || prompt.includes('ACTION:')) {
      // Recommendations fallback
      return {
        text: `1. ACTION: REVIEW RESULTS MANUALLY - CONFIDENCE: Medium
   Rationale: AI analysis unavailable. Review statistical significance and effect size to make decision.

2. ACTION: CONSULT WITH TEAM - CONFIDENCE: High
   Rationale: Get additional perspectives on results interpretation and next steps.`,
        provider: 'fallback',
        fallback_used: true
      };
    } else if (prompt.includes('follow-up questions') || prompt.includes('questions')) {
      // Follow-up questions fallback
      return {
        text: `1. What segments showed different behavior patterns?
2. Were there any external factors during the test period?
3. How do these results compare to historical baselines?
4. What would be the business impact of implementing this change?
5. Should we test variations of this approach?`,
        provider: 'fallback',
        fallback_used: true
      };
    } else {
      // General interpretation fallback
      return {
        text: `AI interpretation unavailable. Please review the statistical results manually:
- Check if results are statistically significant (p-value < 0.05)
- Evaluate practical significance of the effect size
- Consider business context and implementation costs
- Review confidence intervals for decision-making`,
        provider: 'fallback',
        fallback_used: true
      };
    }
  }
}

// ==================== RESPONSE PARSERS ====================

/**
 * Parse hypothesis assessment response
 */
export function parseHypothesisAssessment(text) {
  try {
    const scoreMatch = text.match(/Score:\s*(\d+)\/10/i);
    const assessmentMatch = text.match(/Assessment:\s*([^]*?)(?=Suggestions:|$)/i);
    const suggestionsMatch = text.match(/Suggestions:\s*([^]*?)$/i);
    
    return {
      score: scoreMatch ? parseInt(scoreMatch[1]) : null,
      assessment: assessmentMatch ? assessmentMatch[1].trim() : text,
      suggestions: suggestionsMatch ? suggestionsMatch[1].trim() : ''
    };
  } catch (error) {
    console.warn('Failed to parse hypothesis assessment:', error);
    return {
      score: null,
      assessment: text,
      suggestions: ''
    };
  }
}

/**
 * Parse recommendations response
 */
export function parseRecommendations(text) {
  try {
    const recommendations = [];
    const actionRegex = /(\d+\.\s*ACTION:\s*[^-]+)\s*-\s*CONFIDENCE:\s*([^\\n]+)\s*Rationale:\s*([^\\n]+)/gi;
    
    let match;
    while ((match = actionRegex.exec(text)) !== null) {
      recommendations.push({
        action: match[1].replace(/^\d+\.\s*ACTION:\s*/i, '').trim(),
        confidence: match[2].trim(),
        rationale: match[3].trim()
      });
    }
    
    return recommendations.length > 0 ? recommendations : [{ action: text, confidence: 'Medium', rationale: 'AI parsing unavailable' }];
  } catch (error) {
    console.warn('Failed to parse recommendations:', error);
    return [{ action: text, confidence: 'Medium', rationale: 'AI parsing unavailable' }];
  }
}

/**
 * Parse follow-up questions response
 */
export function parseFollowupQuestions(text) {
  try {
    const questions = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const questionMatch = line.match(/^\d+\.\s*(.+)$/);
      if (questionMatch) {
        questions.push(questionMatch[1].trim());
      }
    }
    
    return questions.length > 0 ? questions : [text];
  } catch (error) {
    console.warn('Failed to parse follow-up questions:', error);
    return [text];
  }
}

// ==================== STORAGE FUNCTIONS ====================

/**
 * Get API keys from Chrome storage
 */
export async function getAPIKeys() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['googleApiKey', 'anthropicApiKey'], (result) => {
      resolve({
        googleApiKey: result.googleApiKey || '',
        anthropicApiKey: result.anthropicApiKey || ''
      });
    });
  });
}

/**
 * Save API keys to Chrome storage
 */
export async function saveAPIKeys(googleApiKey, anthropicApiKey) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({
      googleApiKey: googleApiKey || '',
      anthropicApiKey: anthropicApiKey || ''
    }, () => {
      resolve();
    });
  });
}

// ==================== SINGLETON INSTANCE ====================

let llmManagerInstance = null;

/**
 * Get singleton LLM Manager instance
 */
export async function getLLMManager() {
  if (!llmManagerInstance) {
    llmManagerInstance = new LLMManager();
    
    // Initialize with stored API keys
    const apiKeys = await getAPIKeys();
    const preferences = await getUserLLMPreferences();
    
    await llmManagerInstance.initialize(
      apiKeys,
      preferences.defaultProvider,
      preferences.fallbackEnabled
    );
  }
  
  return llmManagerInstance;
}

/**
 * Get user LLM preferences
 */
async function getUserLLMPreferences() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['defaultLLMProvider', 'llmFallbackEnabled'], (result) => {
      resolve({
        defaultProvider: result.defaultLLMProvider || 'gemini',
        fallbackEnabled: result.llmFallbackEnabled !== false
      });
    });
  });
}