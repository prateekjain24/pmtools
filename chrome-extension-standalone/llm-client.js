// LLM integration for PM Tools Chrome Extension
// Handles Gemini and Anthropic API calls with BYOK

PMTools.llm = {
  // LLM Provider configurations
  providers: {
    [PMTools.LLM_PROVIDERS.GEMINI]: {
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: 'gemini-2.5-flash',
      requiresAuth: true,
      maxRetries: 3,
      timeout: 30000,
      modelsEndpoint: '/models'
    },
    [PMTools.LLM_PROVIDERS.ANTHROPIC]: {
      name: 'Anthropic Claude',
      baseUrl: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-3-5-sonnet-20241022',
      requiresAuth: true,
      maxRetries: 3,
      timeout: 30000,
      modelsEndpoint: '/models'
    }
  },
  
  /**
   * Get stored API key for a provider
   * @param {string} provider - Provider name
   * @returns {Promise<string|null>} API key or null
   */
  async getApiKey(provider) {
    const storageKey = provider === PMTools.LLM_PROVIDERS.GEMINI 
      ? PMTools.STORAGE_KEYS.API_KEY_GEMINI 
      : PMTools.STORAGE_KEYS.API_KEY_ANTHROPIC;
    
    return await PMTools.utils.getStorage(storageKey);
  },
  
  /**
   * Get selected model for a provider
   * @param {string} provider - Provider name
   * @returns {Promise<string>} Selected model ID or default
   */
  async getSelectedModel(provider) {
    const storageKey = provider === PMTools.LLM_PROVIDERS.GEMINI 
      ? PMTools.STORAGE_KEYS.SELECTED_MODEL_GEMINI 
      : PMTools.STORAGE_KEYS.SELECTED_MODEL_ANTHROPIC;
    
    const selectedModel = await PMTools.utils.getStorage(storageKey);
    return selectedModel || this.providers[provider].defaultModel;
  },
  
  /**
   * Save selected model for a provider
   * @param {string} provider - Provider name
   * @param {string} modelId - Model ID to save
   */
  async saveSelectedModel(provider, modelId) {
    const storageKey = provider === PMTools.LLM_PROVIDERS.GEMINI 
      ? PMTools.STORAGE_KEYS.SELECTED_MODEL_GEMINI 
      : PMTools.STORAGE_KEYS.SELECTED_MODEL_ANTHROPIC;
    
    await PMTools.utils.setStorage(storageKey, modelId);
  },
  
  /**
   * Save API key for a provider
   * @param {string} provider - Provider name
   * @param {string} apiKey - API key to save
   */
  async saveApiKey(provider, apiKey) {
    const storageKey = provider === PMTools.LLM_PROVIDERS.GEMINI 
      ? PMTools.STORAGE_KEYS.API_KEY_GEMINI 
      : PMTools.STORAGE_KEYS.API_KEY_ANTHROPIC;
    
    await PMTools.utils.setStorage(storageKey, apiKey);
  },
  
  /**
   * Test API key validity
   * @param {string} provider - Provider name
   * @param {string} apiKey - API key to test
   * @returns {Promise<boolean>} True if valid
   */
  async testApiKey(provider, apiKey) {
    try {
      const response = await this.callProvider(provider, 'Test connection', { apiKey });
      return response && response.length > 0;
    } catch (error) {
      console.error('API key test failed:', error);
      return false;
    }
  },
  
  /**
   * Make API request with retry logic
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options
   * @param {number} retries - Number of retries remaining
   * @returns {Promise<Response>} Fetch response
   */
  async fetchWithRetry(url, options, retries = 3) {
    const timeout = this.providers[options.provider]?.timeout || 30000;
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });
    
    try {
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, options),
        timeoutPromise
      ]);
      
      // Retry on server errors (5xx) or rate limits (429)
      if (!response.ok && retries > 0 && (response.status >= 500 || response.status === 429)) {
        const delay = response.status === 429 ? 2000 : 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      
      return response;
    } catch (error) {
      if (retries > 0 && (error.message === 'Request timeout' || error.name === 'NetworkError')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  },
  
  /**
   * Fetch available Gemini models
   * @param {string} apiKey - API key to use
   * @returns {Promise<Array>} List of available models
   */
  async fetchGeminiModels(apiKey) {
    const provider = this.providers[PMTools.LLM_PROVIDERS.GEMINI];
    const cacheKey = PMTools.STORAGE_KEYS.MODEL_CACHE_GEMINI;
    
    // Check cache first
    const cached = await PMTools.utils.getStorage(cacheKey);
    if (cached && cached.timestamp && (Date.now() - cached.timestamp < PMTools.DEFAULTS.MODEL_CACHE_TTL)) {
      return cached.models;
    }
    
    try {
      const url = `${provider.baseUrl}/models?key=${apiKey}`;
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        provider: PMTools.LLM_PROVIDERS.GEMINI
      }, 1);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      
      const data = await response.json();
      const models = data.models
        .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
        .map(model => ({
          id: model.name.replace('models/', ''),
          displayName: model.displayName || model.name,
          description: model.description || '',
          inputTokenLimit: model.inputTokenLimit,
          outputTokenLimit: model.outputTokenLimit
        }))
        .sort((a, b) => {
          // Prioritize flash models and newer versions
          if (a.id.includes('flash') && !b.id.includes('flash')) return -1;
          if (!a.id.includes('flash') && b.id.includes('flash')) return 1;
          return b.id.localeCompare(a.id);
        });
      
      // Cache the results
      await PMTools.utils.setStorage(cacheKey, {
        models,
        timestamp: Date.now()
      });
      
      return models;
    } catch (error) {
      console.error('Failed to fetch Gemini models:', error);
      // Return default models as fallback
      return [
        {
          id: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          description: 'Latest fast model for most tasks'
        },
        {
          id: 'gemini-1.5-flash',
          displayName: 'Gemini 1.5 Flash',
          description: 'Stable fast model'
        },
        {
          id: 'gemini-1.5-pro',
          displayName: 'Gemini 1.5 Pro',
          description: 'Advanced model for complex tasks'
        }
      ];
    }
  },
  
  /**
   * Fetch available Anthropic models
   * @param {string} apiKey - API key to use
   * @returns {Promise<Array>} List of available models
   */
  async fetchAnthropicModels(apiKey) {
    const provider = this.providers[PMTools.LLM_PROVIDERS.ANTHROPIC];
    const cacheKey = PMTools.STORAGE_KEYS.MODEL_CACHE_ANTHROPIC;
    
    // Check cache first
    const cached = await PMTools.utils.getStorage(cacheKey);
    if (cached && cached.timestamp && (Date.now() - cached.timestamp < PMTools.DEFAULTS.MODEL_CACHE_TTL)) {
      return cached.models;
    }
    
    try {
      const url = `${provider.baseUrl}/models`;
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        provider: PMTools.LLM_PROVIDERS.ANTHROPIC
      }, 1);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      
      const data = await response.json();
      const models = data.data
        .filter(model => model.type === 'model' && !model.id.includes('bedrock'))
        .map(model => ({
          id: model.id,
          displayName: model.display_name || model.id,
          description: `Context: ${model.context_window || 'N/A'} tokens`,
          contextWindow: model.context_window,
          trainingData: model.training_data_cutoff
        }))
        .sort((a, b) => {
          // Sort by model version (newer first)
          return b.id.localeCompare(a.id);
        });
      
      // Cache the results
      await PMTools.utils.setStorage(cacheKey, {
        models,
        timestamp: Date.now()
      });
      
      return models;
    } catch (error) {
      console.error('Failed to fetch Anthropic models:', error);
      // Return default models as fallback
      return [
        {
          id: 'claude-3-5-sonnet-20241022',
          displayName: 'Claude 3.5 Sonnet (Latest)',
          description: 'Most capable model for complex tasks'
        },
        {
          id: 'claude-3-5-haiku-20241022',
          displayName: 'Claude 3.5 Haiku',
          description: 'Fast and efficient for simple tasks'
        }
      ];
    }
  },
  
  /**
   * Get available models for a provider
   * @param {string} provider - Provider name
   * @param {string} apiKey - Optional API key (uses stored if not provided)
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels(provider, apiKey = null) {
    const key = apiKey || await this.getApiKey(provider);
    if (!key) {
      return [];
    }
    
    if (provider === PMTools.LLM_PROVIDERS.GEMINI) {
      return await this.fetchGeminiModels(key);
    } else if (provider === PMTools.LLM_PROVIDERS.ANTHROPIC) {
      return await this.fetchAnthropicModels(key);
    }
    
    return [];
  },
  
  /**
   * Call Gemini API
   * @param {string} prompt - Text prompt
   * @param {Object} options - Call options
   * @returns {Promise<string>} Generated text
   */
  async callGemini(prompt, options = {}) {
    const apiKey = options.apiKey || await this.getApiKey(PMTools.LLM_PROVIDERS.GEMINI);
    if (!apiKey) {
      throw new Error('No Gemini API key configured');
    }
    
    const provider = this.providers[PMTools.LLM_PROVIDERS.GEMINI];
    const model = await this.getSelectedModel(PMTools.LLM_PROVIDERS.GEMINI);
    console.log('Using Gemini model:', model);
    const url = `${provider.baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
          responseMimeType: 'text/plain'
        }
      }),
      provider: PMTools.LLM_PROVIDERS.GEMINI
    };
    
    console.log('Gemini API Request:', {
      url: url,
      model: model,
      promptLength: prompt.length
    });
    
    const response = await this.fetchWithRetry(url, fetchOptions, provider.maxRetries);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Gemini API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Gemini');
    }
    
    const candidate = data.candidates[0];
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Response blocked by safety filters');
    }
    
    return candidate.content.parts[0].text;
  },
  
  /**
   * Call Anthropic Claude API
   * @param {string} prompt - Text prompt
   * @param {Object} options - Call options
   * @returns {Promise<string>} Generated text
   */
  async callAnthropic(prompt, options = {}) {
    const apiKey = options.apiKey || await this.getApiKey(PMTools.LLM_PROVIDERS.ANTHROPIC);
    if (!apiKey) {
      throw new Error('No Anthropic API key configured');
    }
    
    const provider = this.providers[PMTools.LLM_PROVIDERS.ANTHROPIC];
    const model = await this.getSelectedModel(PMTools.LLM_PROVIDERS.ANTHROPIC);
    const url = `${provider.baseUrl}/messages`;
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
      provider: PMTools.LLM_PROVIDERS.ANTHROPIC
    };
    
    const response = await this.fetchWithRetry(url, fetchOptions, provider.maxRetries);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.content || data.content.length === 0) {
      throw new Error('No response generated from Claude');
    }
    
    return data.content[0].text;
  },
  
  /**
   * Call LLM provider with fallback
   * @param {string} provider - Primary provider
   * @param {string} prompt - Text prompt
   * @param {Object} options - Call options
   * @returns {Promise<string>} Generated text
   */
  async callProvider(provider, prompt, options = {}) {
    try {
      if (provider === PMTools.LLM_PROVIDERS.GEMINI) {
        return await this.callGemini(prompt, options);
      } else if (provider === PMTools.LLM_PROVIDERS.ANTHROPIC) {
        return await this.callAnthropic(prompt, options);
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      console.error(`${provider} API call failed:`, {
        provider: provider,
        error: error.message,
        stack: error.stack
      });
      
      // Try fallback provider if enabled and not in test mode
      if (!options.noFallback && !options.apiKey) {
        const fallbackProvider = provider === PMTools.LLM_PROVIDERS.GEMINI 
          ? PMTools.LLM_PROVIDERS.ANTHROPIC 
          : PMTools.LLM_PROVIDERS.GEMINI;
        
        const fallbackKey = await this.getApiKey(fallbackProvider);
        if (fallbackKey) {
          console.log(`Attempting fallback to ${fallbackProvider}`);
          try {
            return await this.callProvider(fallbackProvider, prompt, { ...options, noFallback: true });
          } catch (fallbackError) {
            console.error(`Fallback to ${fallbackProvider} also failed:`, fallbackError);
          }
        }
      }
      
      throw error;
    }
  },
  
  /**
   * Analyze hypothesis quality and provide suggestions
   * @param {string} hypothesis - User's hypothesis
   * @param {string} provider - LLM provider to use
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeHypothesis(hypothesis, provider = PMTools.LLM_PROVIDERS.GEMINI) {
    const prompt = `You are an experienced Product Manager helping a colleague prepare for an A/B test. Be practical, friendly, and focus on business impact.

Analyze this hypothesis:
"${hypothesis}"

Please provide actionable feedback:

**1. Clarity Score (1-10):** Rate how clear and testable this hypothesis is

**2. What's Working Well:** What aspects of this hypothesis are strong?

**3. Key Risks & Gaps:**
- What could go wrong with this test?
- What important details are missing?
- Any potential negative impacts to consider?

**4. Improved Hypothesis:** Rewrite it to include:
- Specific user segment
- Clear change being tested
- Expected impact (with rough %)
- Primary metric to measure

**5. Business Considerations:**
- Estimated revenue/cost impact if successful
- Resources needed (engineering days, design, etc.)
- Key stakeholders to involve
- Alignment with company goals

**6. Success Metrics to Track:**
- Primary metric (the one that matters most)
- Secondary metrics (to catch unintended effects)
- Guardrail metrics (to ensure nothing breaks)

Be specific and practical. Think like a PM who needs to get buy-in and ship this test.`;

    try {
      const response = await this.callProvider(provider, prompt);
      return this.parseHypothesisAnalysis(response);
    } catch (error) {
      return this.getFallbackHypothesisAnalysis(hypothesis);
    }
  },
  
  /**
   * Interpret experiment results with AI insights
   * @param {Object} results - Experiment results data
   * @param {string} context - Additional context
   * @param {string} provider - LLM provider to use
   * @returns {Promise<Object>} Interpretation result
   */
  async interpretResults(results, context = '', provider = PMTools.LLM_PROVIDERS.GEMINI) {
    const prompt = `You are a seasoned Product Manager helping a colleague interpret A/B test results. Be direct, practical, and focus on making the right business decision.

**What We Tested:**
${context || 'No context provided'}

**The Numbers:**
- Control: ${(results.controlConversionRate * 100).toFixed(1)}% conversion (${results.controlUsers || 'N/A'} users, ${results.controlConversions || 'N/A'} conversions)
- Treatment: ${(results.treatmentConversionRate * 100).toFixed(1)}% conversion (${results.treatmentUsers || 'N/A'} users, ${results.treatmentConversions || 'N/A'} conversions)
- Relative Lift: ${(results.relativeLift * 100).toFixed(1)}%
- Statistical Significance: ${results.isSignificant ? 'YES' : 'NO'} (p-value: ${results.pValue.toFixed(4)})

**1. Bottom Line:** 
Give me the TL;DR - what happened and what it means for the business.

**2. Ship Decision:**
- Should we ship this? (YES/NO/MAYBE)
- Key reasons for your recommendation
- Any caveats or conditions?

**3. Practical Significance:**
- Is this result meaningful for the business, regardless of statistics?
- What's the actual impact in terms of revenue/users/engagement?
- Is the improvement worth the implementation effort?

**4. Risk Assessment:**
- What could go wrong if we ship this?
- Which user segments might be negatively affected?
- Any technical debt or maintenance concerns?

**5. Immediate Next Steps:**
Give me 3 specific actions to take this week:
- Who to talk to
- What data to analyze
- What to prepare

**6. Strategic Questions:**
What are the 3 most important questions we should be asking about these results that we haven't considered yet?

Remember: Good PMs ship features that move metrics AND create long-term value. Be honest about trade-offs.`;

    try {
      const response = await this.callProvider(provider, prompt);
      return this.parseResultsInterpretation(response);
    } catch (error) {
      return this.getFallbackResultsInterpretation(results);
    }
  },
  
  /**
   * Parse hypothesis analysis response
   * @param {string} response - Raw LLM response
   * @returns {Object} Parsed analysis
   */
  parseHypothesisAnalysis(response) {
    try {
      const sections = {
        clarityScore: this.extractSection(response, ['clarity score', 'score'], '7'),
        strengths: this.extractSection(response, ['working well', 'strengths', 'good'], 'Hypothesis provided'),
        improvements: this.extractSection(response, ['risks', 'gaps', 'improvement'], 'Consider adding more specificity'),
        improvedVersion: this.extractSection(response, ['improved hypothesis', 'rewrite', 'better'], 'Refine hypothesis with specific metrics and user segments'),
        successMetrics: this.extractSection(response, ['success metrics', 'metrics to track', 'measure'], 'Track primary conversion metric'),
        businessConsiderations: this.extractSection(response, ['business considerations', 'revenue', 'resources'], 'Consider business impact and resource requirements')
      };
      
      return {
        success: true,
        analysis: sections,
        rawResponse: response
      };
    } catch (error) {
      console.error('Failed to parse hypothesis analysis:', error);
      return this.getFallbackHypothesisAnalysis();
    }
  },
  
  /**
   * Parse results interpretation response
   * @param {string} response - Raw LLM response
   * @returns {Object} Parsed interpretation
   */
  parseResultsInterpretation(response) {
    try {
      const sections = {
        keyTakeaway: this.extractSection(response, ['bottom line', 'takeaway', 'summary'], 'Results analyzed'),
        recommendation: this.extractSection(response, ['ship decision', 'recommendation', 'should we'], 'Review results carefully'),
        practicalSignificance: this.extractSection(response, ['practical significance', 'meaningful', 'business impact'], 'Consider business impact'),
        riskAssessment: this.extractSection(response, ['risk assessment', 'could go wrong', 'risks'], 'Evaluate potential risks'),
        nextSteps: this.extractSection(response, ['immediate next steps', 'next steps', 'actions'], 'Continue monitoring'),
        followUpQuestions: this.extractSection(response, ['strategic questions', 'questions', 'explore'], 'What factors might have influenced these results?')
      };
      
      return {
        success: true,
        interpretation: sections,
        rawResponse: response
      };
    } catch (error) {
      console.error('Failed to parse results interpretation:', error);
      return this.getFallbackResultsInterpretation();
    }
  },
  
  /**
   * Extract section content from LLM response
   * @param {string} text - Full response text
   * @param {Array} keywords - Keywords to search for
   * @param {string} fallback - Fallback text
   * @returns {string} Extracted content
   */
  extractSection(text, keywords, fallback) {
    const lines = text.split('\n');
    let sectionStart = -1;
    
    // Find section start
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some(keyword => line.includes(keyword))) {
        sectionStart = i;
        break;
      }
    }
    
    if (sectionStart === -1) return fallback;
    
    // Extract content
    let content = [];
    let isFirstLine = true;
    
    for (let i = sectionStart; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip the header line itself
      if (i === sectionStart) {
        // Check if there's content on the same line as the header
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1 && colonIndex < line.length - 1) {
          const headerContent = line.substring(colonIndex + 1).trim();
          if (headerContent) {
            content.push(headerContent);
            isFirstLine = false;
          }
        }
        continue;
      }
      
      // Check if we've reached the next section
      if (trimmedLine.match(/^\*\*\d+\.|^\*\*[A-Z]/)) {
        break;
      }
      
      // Add the line content
      if (trimmedLine) {
        content.push(trimmedLine);
      } else if (content.length > 0) {
        // Preserve paragraph breaks
        content.push('');
      }
    }
    
    // Join with newlines to preserve structure
    const result = content.join('\n').trim();
    return result || fallback;
  },
  
  /**
   * Get fallback hypothesis analysis when LLM fails
   * @param {string} hypothesis - Original hypothesis
   * @returns {Object} Fallback analysis
   */
  getFallbackHypothesisAnalysis(hypothesis = '') {
    return {
      success: false,
      analysis: {
        clarityScore: '7',
        strengths: 'You\'ve provided a testable hypothesis for your experiment.',
        improvements: 'Consider adding specific metrics, user segments, and expected impact size.',
        improvedVersion: 'Try to include: what you\'ll change, which users it affects, what metric will improve, and by how much.',
        successMetrics: 'Track your primary conversion metric and any relevant secondary metrics.',
        businessConsiderations: 'Think about resource requirements, stakeholder buy-in, and alignment with business goals.'
      },
      rawResponse: 'AI analysis temporarily unavailable. Using fallback guidance.',
      usingFallback: true
    };
  },
  
  /**
   * Get fallback results interpretation when LLM fails
   * @param {Object} results - Results data
   * @returns {Object} Fallback interpretation
   */
  getFallbackResultsInterpretation(results = {}) {
    const isSignificant = results.isSignificant;
    const lift = results.relativeLift || 0;
    
    return {
      success: false,
      interpretation: {
        keyTakeaway: isSignificant 
          ? `The test shows a ${lift > 0 ? 'positive' : 'negative'} statistically significant result.`
          : 'The test results are not statistically significant.',
        recommendation: isSignificant && lift > 0
          ? 'Consider shipping this change after reviewing practical significance.'
          : 'Do not ship this change based on current results.',
        practicalSignificance: 'Evaluate if the observed change is meaningful for your business metrics and worth the implementation effort.',
        riskAssessment: 'Consider potential negative impacts on other metrics and different user segments.',
        nextSteps: 'Review the practical significance, consider running a longer test, or explore different variations.',
        followUpQuestions: 'What might have caused these results? Are there any external factors to consider? Should we test with different user segments?'
      },
      rawResponse: 'AI interpretation temporarily unavailable. Using statistical fallback guidance.',
      usingFallback: true
    };
  },
  
  /**
   * Check if any API keys are configured
   * @returns {Promise<Object>} Status of API keys
   */
  async getApiKeyStatus() {
    const geminiKey = await this.getApiKey(PMTools.LLM_PROVIDERS.GEMINI);
    const anthropicKey = await this.getApiKey(PMTools.LLM_PROVIDERS.ANTHROPIC);
    
    return {
      hasGemini: !!geminiKey,
      hasAnthropic: !!anthropicKey,
      hasAny: !!(geminiKey || anthropicKey)
    };
  }
};

console.log('PM Tools LLM client loaded');