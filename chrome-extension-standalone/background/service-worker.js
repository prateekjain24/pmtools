// Background Service Worker for PM Tools Standalone Edition
// Self-sufficient with BYOK AI integration

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🚀 PM Tools Standalone extension installed:', details.reason);
  
  // Set default user preferences on install
  if (details.reason === 'install') {
    const defaultPreferences = {
      statisticalDefaults: {
        statistical_power: 0.80,
        significance_level: 0.05,
        variants: 2,
        mde_type: 'relative'
      },
      userExperience: {
        theme: 'light',
        autoSave: true,
        clearOnSuccess: false,
        showTooltips: true,
        exportFormat: 'json',
        animationEnabled: true
      },
      llmSettings: {
        defaultProvider: 'gemini',
        fallbackEnabled: true
      }
    };
    
    chrome.storage.sync.set({ pmtools_standalone_preferences: defaultPreferences }, () => {
      console.log('✅ Default preferences saved for standalone edition');
    });
  }
});

// Handle storage changes to monitor user preferences
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.pmtools_standalone_preferences) {
      console.log('⚙️ User preferences updated:', changes.pmtools_standalone_preferences.newValue);
    }
    if (changes.pmtools_google_api_key) {
      console.log('🔑 Google API key updated');
    }
    if (changes.pmtools_anthropic_api_key) {
      console.log('🔑 Anthropic API key updated');
    }
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 PM Tools Standalone extension started');
});

// Handle messages from popup or options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request);
  
  switch (request.action) {
    case 'checkLLMAvailability':
      checkLLMAvailability()
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously
      
    case 'testLLMConnection':
      testLLMConnection(request.provider, request.apiKey)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getExtensionStatus':
      getExtensionStatus()
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Check LLM availability based on stored API keys
async function checkLLMAvailability() {
  try {
    const storage = await new Promise((resolve) => {
      chrome.storage.sync.get([
        'pmtools_google_api_key', 
        'pmtools_anthropic_api_key'
      ], resolve);
    });
    
    const hasGoogleKey = !!storage.pmtools_google_api_key;
    const hasAnthropicKey = !!storage.pmtools_anthropic_api_key;
    
    return {
      google: {
        available: hasGoogleKey,
        provider: 'Google Gemini'
      },
      anthropic: {
        available: hasAnthropicKey,
        provider: 'Anthropic Claude'
      },
      anyAvailable: hasGoogleKey || hasAnthropicKey
    };
    
  } catch (error) {
    return {
      google: { available: false, error: error.message },
      anthropic: { available: false, error: error.message },
      anyAvailable: false
    };
  }
}

// Test LLM connection with provided API key
async function testLLMConnection(provider, apiKey) {
  if (!provider || !apiKey) {
    throw new Error('Provider and API key required');
  }
  
  try {
    if (provider === 'gemini') {
      return await testGeminiConnection(apiKey);
    } else if (provider === 'claude') {
      return await testClaudeConnection(apiKey);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    return {
      connected: false,
      provider: provider,
      error: error.message,
      message: `${provider} connection failed`
    };
  }
}

// Test Google Gemini connection
async function testGeminiConnection(apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Test connection - respond with "OK"' }]
          }]
        })
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      connected: true,
      provider: 'gemini',
      message: 'Gemini connection successful',
      response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK'
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Connection timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Test Anthropic Claude connection
async function testClaudeConnection(apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Test connection - respond with "OK"'
        }]
      })
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      connected: true,
      provider: 'claude',
      message: 'Claude connection successful',
      response: data.content?.[0]?.text || 'OK'
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Connection timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Get overall extension status
async function getExtensionStatus() {
  try {
    const llmStatus = await checkLLMAvailability();
    const storage = await new Promise((resolve) => {
      chrome.storage.sync.get(['pmtools_standalone_preferences'], resolve);
    });
    
    return {
      version: '1.0.0',
      mode: 'standalone',
      llmProviders: llmStatus,
      hasPreferences: !!storage.pmtools_standalone_preferences,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      version: '1.0.0',
      mode: 'standalone',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Set extension badge to indicate AI availability (optional)
async function updateExtensionBadge() {
  try {
    const llmStatus = await checkLLMAvailability();
    
    if (llmStatus.anyAvailable) {
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setBadgeBackgroundColor({ color: [0, 128, 0, 255] }); // Green
    } else {
      chrome.action.setBadgeText({ text: '⚡' });
      chrome.action.setBadgeBackgroundColor({ color: [255, 165, 0, 255] }); // Orange
    }
  } catch (error) {
    console.error('Failed to update badge:', error);
  }
}

// Optional: Update badge when API keys change
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && (changes.pmtools_google_api_key || changes.pmtools_anthropic_api_key)) {
    updateExtensionBadge();
  }
});

// Initialize badge on startup
updateExtensionBadge();