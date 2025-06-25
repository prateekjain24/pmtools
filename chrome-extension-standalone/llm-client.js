// LLM integration for PM Tools Chrome Extension
// Handles Gemini and Anthropic API calls with BYOK

PMTools.llm = {
  // LLM Provider configurations
  providers: {
    [PMTools.LLM_PROVIDERS.GEMINI]: {
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: 'gemini-2.0-flash-exp',
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
      // Return default model as fallback
      return [{
        id: provider.defaultModel,
        displayName: 'Gemini Flash (Default)',
        description: 'Fast and efficient model for most tasks'
      }];
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
          maxOutputTokens: 1024
        }
      }),
      provider: PMTools.LLM_PROVIDERS.GEMINI
    };
    
    const response = await this.fetchWithRetry(url, fetchOptions, provider.maxRetries);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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
      console.error(`${provider} API call failed:`, error);
      
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
    const prompt = `You are a Product Manager expert helping assess experiment hypotheses. 

Analyze this A/B test hypothesis and provide feedback:

"${hypothesis}"

Please provide:
1. **Clarity Score** (1-10): How clear and specific is this hypothesis?
2. **Key Strengths**: What's good about this hypothesis?
3. **Areas for Improvement**: What could be more specific?
4. **Improved Version**: Rewrite the hypothesis to be more specific and testable
5. **Success Metrics**: What metrics should be tracked for this test?

Format your response with clear headings and be constructive. Focus on helping the PM create better experiments.`;

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
    const prompt = `You are a Product Manager expert analyzing A/B test results.

**Experiment Context:**
${context}

**Results Summary:**
- Control: ${results.controlConversionRate * 100}% conversion rate (${results.controlUsers || 'N/A'} users)
- Treatment: ${results.treatmentConversionRate * 100}% conversion rate (${results.treatmentUsers || 'N/A'} users)
- Relative Lift: ${(results.relativeLift * 100).toFixed(1)}%
- P-value: ${results.pValue}
- Statistical Significance: ${results.isSignificant ? 'Yes' : 'No'}

Please provide:
1. **Key Takeaway**: One-sentence summary of the result
2. **Recommendation**: Should we ship this change? Why or why not?
3. **Next Steps**: What should the PM do next?
4. **Follow-up Questions**: 3 strategic questions to explore further

Be practical and actionable. Focus on business impact, not just statistical significance.`;

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
        strengths: this.extractSection(response, ['strengths', 'good'], 'Hypothesis provided'),
        improvements: this.extractSection(response, ['improvement', 'could be'], 'Consider adding more specificity'),
        improvedVersion: this.extractSection(response, ['improved', 'rewrite', 'better'], 'Refine hypothesis with specific metrics and user segments'),
        successMetrics: this.extractSection(response, ['metrics', 'track', 'measure'], 'Track primary conversion metric')
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
        keyTakeaway: this.extractSection(response, ['takeaway', 'summary'], 'Results analyzed'),
        recommendation: this.extractSection(response, ['recommendation', 'should we'], 'Review results carefully'),
        nextSteps: this.extractSection(response, ['next steps', 'what should'], 'Continue monitoring'),
        followUpQuestions: this.extractSection(response, ['questions', 'explore'], 'What factors might have influenced these results?')
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
    let content = '';
    for (let i = sectionStart; i < lines.length; i++) {
      const line = lines[i].trim();
      if (i > sectionStart && line.match(/^\d+\.|^\*\*|^#/)) {
        break; // Next section
      }
      if (line && !line.match(/^\*\*.*\*\*$/)) {
        content += line + ' ';
      }
    }
    
    return content.trim() || fallback;
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
        successMetrics: 'Track your primary conversion metric and any relevant secondary metrics.'
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