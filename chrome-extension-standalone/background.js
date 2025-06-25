// Background service worker for PM Tools Chrome Extension

console.log('PM Tools background service worker loaded');

// Install event - fired when extension is first installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PM Tools extension installed/updated:', details);
  
  if (details.reason === 'install') {
    // First-time installation
    handleFirstInstall();
  } else if (details.reason === 'update') {
    // Extension update
    handleUpdate(details.previousVersion);
  }
});

// Startup event - fired when Chrome starts up
chrome.runtime.onStartup.addListener(() => {
  console.log('Chrome startup - PM Tools extension active');
});

// Handle first-time installation
async function handleFirstInstall() {
  console.log('First-time installation detected');
  
  try {
    // Set default preferences
    const defaultPreferences = {
      preferredProvider: 'gemini',
      enableFallback: true,
      autoSaveForm: true,
      showTooltips: true,
      defaultPower: 80,
      defaultAlpha: 5
    };
    
    await chrome.storage.local.set({
      'pm_tools_preferences': defaultPreferences
    });
    
    // Show welcome notification
    chrome.notifications.create('welcome', {
      type: 'basic',
      iconUrl: 'assets/icons/icon48.png',
      title: 'Welcome to PM Tools!',
      message: 'Your A/B testing assistant is ready. Click the extension icon to get started.'
    });
    
    // Open options page for API key setup
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
    
  } catch (error) {
    console.error('Error during first install:', error);
  }
}

// Handle extension updates
async function handleUpdate(previousVersion) {
  console.log(`Extension updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`);
  
  try {
    // Perform any necessary data migrations here
    await migrateData(previousVersion);
    
    // Show update notification
    chrome.notifications.create('update', {
      type: 'basic',
      iconUrl: 'assets/icons/icon48.png',
      title: 'PM Tools Updated!',
      message: `Updated to v${chrome.runtime.getManifest().version}. Check out the new features!`
    });
    
  } catch (error) {
    console.error('Error during update:', error);
  }
}

// Data migration logic for updates
async function migrateData(previousVersion) {
  // Add migration logic here if needed in future versions
  console.log('Checking for data migrations...');
  
  // Example migration for future versions:
  // if (isVersionLessThan(previousVersion, '1.1.0')) {
  //   await migrateToV1_1_0();
  // }
}

// Utility function to compare version numbers
function isVersionLessThan(version1, version2) {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part < v2part) return true;
    if (v1part > v2part) return false;
  }
  
  return false;
}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);
  
  // Clear the notification
  chrome.notifications.clear(notificationId);
  
  if (notificationId === 'welcome' || notificationId === 'update') {
    // Open the extension popup or options page
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.action.openPopup();
      }
    });
  }
});

// Handle extension icon clicks (this is mainly handled by the popup, but we can add logic here)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
  // The popup will open automatically due to manifest configuration
});

// Message passing between content scripts, popup, and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  // Handle different message types
  switch (request.type) {
    case 'GET_EXTENSION_INFO':
      sendResponse({
        version: chrome.runtime.getManifest().version,
        name: chrome.runtime.getManifest().name
      });
      break;
      
    case 'OPEN_OPTIONS':
      chrome.runtime.openOptionsPage();
      sendResponse({success: true});
      break;
      
    case 'SHOW_NOTIFICATION':
      showNotification(request.data);
      sendResponse({success: true});
      break;
      
    case 'CLEAR_STORAGE':
      clearAllStorage()
        .then(() => sendResponse({success: true}))
        .catch(error => sendResponse({success: false, error: error.message}));
      return true; // Indicates we will send a response asynchronously
      
    default:
      console.warn('Unknown message type:', request.type);
      sendResponse({success: false, error: 'Unknown message type'});
  }
});

// Utility function to show notifications
function showNotification(data) {
  const options = {
    type: 'basic',
    iconUrl: 'assets/icons/icon48.png',
    title: data.title || 'PM Tools',
    message: data.message || 'Notification from PM Tools'
  };
  
  chrome.notifications.create(data.id || 'general', options);
}

// Utility function to clear all storage (used by options page)
async function clearAllStorage() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        console.log('All storage cleared');
        resolve();
      }
    });
  });
}

// Periodic maintenance tasks
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  
  if (alarm.name === 'cleanup') {
    performMaintenanceCleanup();
  }
});

// Set up periodic maintenance (runs once a day)
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('cleanup', {
    delayInMinutes: 1440, // 24 hours
    periodInMinutes: 1440
  });
});

// Maintenance cleanup function
async function performMaintenanceCleanup() {
  console.log('Performing maintenance cleanup...');
  
  try {
    // Clean up old experiment data (keep last 30 days)
    const result = await chrome.storage.local.get(['pm_tools_experiments']);
    const experiments = result.pm_tools_experiments || [];
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentExperiments = experiments.filter(exp => 
      exp.timestamp && exp.timestamp > thirtyDaysAgo
    );
    
    if (recentExperiments.length !== experiments.length) {
      await chrome.storage.local.set({
        'pm_tools_experiments': recentExperiments
      });
      console.log(`Cleaned up ${experiments.length - recentExperiments.length} old experiments`);
    }
    
  } catch (error) {
    console.error('Error during maintenance cleanup:', error);
  }
}

// Handle storage changes (useful for debugging)
chrome.storage.onChanged.addListener((changes, area) => {
  console.log('Storage changed in', area, changes);
});

// Error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in background script:', event.reason);
});

// Handle extension suspend/resume (for service worker lifecycle)
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

self.addEventListener('deactivate', (event) => {
  console.log('Service worker deactivated');
});

// Keep service worker alive by setting up periodic wake-up
function keepAlive() {
  setTimeout(keepAlive, 25000); // Wake up every 25 seconds
}
keepAlive();