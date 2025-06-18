// Background Service Worker for PM Tools Chrome Extension

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PM Tools extension installed:', details.reason);
  
  // Set default configuration on install
  if (details.reason === 'install') {
    const defaultConfig = {
      apiHostname: 'http://localhost:8000',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      statisticalDefaults: {
        statistical_power: 0.80,
        significance_level: 0.05,
        variants: 2,
        mde_type: 'relative'
      },
      theme: 'light'
    };
    
    chrome.storage.sync.set({ pmtools_config: defaultConfig }, () => {
      console.log('Default configuration saved');
    });
  }
});

// Handle storage changes to update API client configuration
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.pmtools_config) {
    console.log('Configuration updated:', changes.pmtools_config.newValue);
    // The API client will reload configuration on next request
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('PM Tools extension started');
});

// Handle messages from popup or options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  switch (request.action) {
    case 'testConnection':
      testAPIConnection(request.hostname)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously
      
    case 'getHealth':
      checkAPIHealth()
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// API connection testing
async function testAPIConnection(hostname) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${hostname}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json().catch(() => ({}));
    
    return {
      connected: true,
      status: response.status,
      data: data,
      message: 'Connection successful'
    };
    
  } catch (error) {
    let errorMessage = 'Connection failed';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Connection timed out';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      connected: false,
      error: errorMessage,
      message: errorMessage
    };
  }
}

// API health check
async function checkAPIHealth() {
  try {
    // Get current configuration
    const config = await new Promise((resolve) => {
      chrome.storage.sync.get(['pmtools_config'], (result) => {
        resolve(result.pmtools_config || { apiHostname: 'http://localhost:8000' });
      });
    });
    
    return await testAPIConnection(config.apiHostname);
    
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      message: 'Health check failed'
    };
  }
}

// Periodic health check (optional - can be enabled later)
function startPeriodicHealthCheck() {
  setInterval(async () => {
    try {
      const health = await checkAPIHealth();
      
      // Update badge based on connection status
      if (health.connected) {
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setBadgeBackgroundColor({ color: [0, 128, 0, 255] }); // Green
      } else {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] }); // Red
      }
    } catch (error) {
      console.error('Periodic health check failed:', error);
    }
  }, 60000); // Check every minute
}

// Uncomment to enable periodic health checks
// startPeriodicHealthCheck();