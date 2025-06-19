# CLAUDE.md - Chrome Extension Development Guide

This file provides comprehensive guidance for developing, maintaining, and extending the PM Tools Chrome Extension.

## 🚀 Current Status (Updated: June 19, 2025)

### ✅ **Recently Completed Major Updates**

#### **🎯 Hidden Results UX Fix (June 19, 2025)**
- **Auto-scroll to Results**: Results now automatically scroll into view after API responses
- **Enhanced User Messaging**: Clear guidance where results will appear ("Results will appear below when ready!")
- **Visual Results Entrance**: Subtle animation with blue border highlight draws attention to new content
- **Navigation Aids**: Added scroll-to-top buttons (🔝) in results sections for easy form access
- **Accessibility**: Full support for reduced-motion preferences

#### **⚙️ Settings Simplification (June 19, 2025)**
- **Removed Technical Configuration**: Eliminated API hostname, timeout, retry settings from UI
- **Environment Auto-Detection**: Automatic detection of local/staging/production environments
- **User Preferences Focus**: Settings now only show workflow preferences (statistical defaults, theme, UX options)
- **Zero Configuration Setup**: Works out-of-the-box with no technical setup required
- **Seamless Migration**: Automatic migration from old config to new preference structure

#### **💬 PM-Friendly Help Texts & Clickable Tooltips (June 18, 2025)**
- **Enhanced Help Content**: PM-friendly language with humor throughout the extension
- **Clickable Tooltip System**: Advanced TooltipManager with smart positioning and mobile optimization
- **Accessibility Features**: Full ARIA support and keyboard navigation for tooltips
- **Professional Copy**: Realistic scenarios and helpful guidance for Product Managers

### ⚠️ **Known Issues**
- **Follow-up Questions Markdown**: AI-generated questions still display as run-on text instead of formatted list items
  - Pattern: `**Category:** content **Next Category:** content`
  - Need: Debug actual AI text format and improve pattern detection
  - Status: Partial fix attempted, requires further investigation

### 🎯 **Next Development Priorities**
1. Fix follow-up questions markdown rendering with proper debugging
2. Test with various AI response formats
3. Add theme switching functionality (light/dark mode implementation)
4. Enhance mobile responsiveness for smaller screens

## 🏗️ Extension Architecture

### Directory Structure
```
chrome-extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── popup/                  # Main popup interface (600x800px)
│   ├── popup.html         # Popup structure with tabbed navigation
│   ├── popup.css          # Styling with CSS custom properties
│   └── popup.js           # Popup logic and API integration
├── options/               # Settings/configuration page
│   ├── options.html       # Full-page settings interface
│   ├── options.css        # Settings page styling
│   └── options.js         # Configuration management
├── background/            # Background service worker
│   └── service-worker.js  # Background tasks and message handling
├── shared/                # Reusable modules
│   ├── api-client.js      # API communication layer
│   ├── utils.js           # Utility functions and helpers
│   └── constants.js       # Configuration constants
├── assets/               # Static assets
│   └── icons/            # Extension icons (16x16, 48x48, 128x128)
└── README.md             # User installation and usage guide
```

### Core Components

#### 1. Manifest V3 Configuration
- **Service Worker**: Background script for API calls and storage
- **Permissions**: `storage`, `activeTab`, and host permissions
- **Content Security Policy**: Secure script execution
- **Action**: Popup interface with icon states

#### 2. Popup Interface (popup/)
- **Tabbed Navigation**: Validate Setup vs Analyze Results
- **Form Management**: Complex forms with validation
- **Results Display**: Formatted output with export options
- **API Status**: Real-time connection indicator

#### 3. Options Page (options/)
- **User Preferences Interface**: Workflow preferences and statistical defaults (simplified from technical config)
- **Environment Status Display**: Shows auto-detected environment and API connection status
- **Statistical Defaults**: Power, significance, MDE type, variants configuration
- **User Experience Settings**: Theme, auto-save, tooltips, export format preferences

#### 4. Background Service Worker
- **API Communication**: Centralized request handling
- **Configuration Management**: Settings persistence
- **Message Passing**: Inter-component communication
- **Health Monitoring**: Periodic API status checks

## 🔧 Development Patterns

### Module System
```javascript
// Use ES6 modules throughout
import { getAPIClient } from '../shared/api-client.js';
import { showMessage, validateRequired } from '../shared/utils.js';
import { DEFAULT_CONFIG, API_ENDPOINTS } from '../shared/constants.js';

// Export patterns
export class APIClient { /* ... */ }
export function utilityFunction() { /* ... */ }
export const CONSTANTS = { /* ... */ };
```

### API Client Architecture
```javascript
// Singleton pattern with environment auto-detection
export function getAPIClient() {
  if (!apiClientInstance) {
    apiClientInstance = new APIClient();
  }
  return apiClientInstance;
}

// Environment-based configuration (NEW - June 2025)
const envConfig = getCurrentEnvironment();
// No user configuration needed - automatic detection!
```

### Chrome Storage Pattern
```javascript
// Async storage operations
export async function getStorageData(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

// Automatic cleanup and validation
const data = await loadFormData('validate');
if (data && isDataValid(data)) {
  populateForm(data);
}
```

### Form Handling Pattern
```javascript
// Validation before submission
try {
  const formData = this.getFormData();
  this.validateForm(formData);
  
  // Show loading state
  this.setLoadingState(true);
  
  // API call with error handling
  const response = await this.apiClient.validateSetup(formData);
  
  // Display results
  this.displayResults(response);
  
} catch (error) {
  this.handleError(error);
} finally {
  this.setLoadingState(false);
}
```

### Error Handling Strategy
```javascript
// Hierarchical error handling
try {
  return await this.apiCall();
} catch (error) {
  if (error instanceof APIError) {
    // API-specific error handling
    showMessage(messagesEl, error.message, 'error');
  } else {
    // Generic error fallback
    showMessage(messagesEl, 'Unexpected error occurred', 'error');
  }
}
```

## 🎨 UI/UX Design System

### CSS Custom Properties
```css
:root {
  --primary-color: #667eea;
  --primary-dark: #764ba2;
  --secondary-color: #f8f9fa;
  --accent-color: #28a745;
  --error-color: #dc3545;
  --warning-color: #ffc107;
  /* ... complete color system */
}
```

### Component Patterns

#### 1. Message System
```javascript
// Consistent messaging across components
showMessage(element, message, type, duration);
// Types: 'info', 'success', 'error', 'warning'
```

#### 2. Form Validation
```html
<!-- Required field pattern -->
<label for="field" class="form-label">
  Field Name <span class="required">*</span>
  <span class="tooltip" title="Helpful explanation">ℹ️</span>
</label>
```

#### 3. Loading States
```javascript
// Consistent loading pattern
submitBtn.disabled = true;
btnText.classList.add('hidden');
btnSpinner.classList.remove('hidden');
```

#### 4. Responsive Design
```css
/* Mobile-first approach */
@media (max-width: 650px) {
  body { width: 400px; }
  .variant-fields { grid-template-columns: 1fr; }
}
```

### Interaction Patterns

#### 1. Tab Navigation
- Clean switching with active states
- Preserves form data between tabs
- Keyboard navigation support

#### 2. Collapsible Sections
- Smooth animations with max-height transitions
- Arrow indicators for state
- Preserved state across sessions

#### 3. Dynamic Forms
- Add/remove variants functionality
- Real-time validation feedback
- Auto-save with debouncing

## 🚀 Build & Development

### Development Workflow
```bash
# 1. Load extension in Chrome
# Navigate to chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" → select chrome-extension/

# 2. Development cycle
# Edit files → Save → Reload extension → Test

# 3. Background script debugging
# chrome://extensions/ → Extension details → Inspect views
```

### Testing Strategies

#### 1. Manual Testing Checklist
- [ ] Extension loads without errors
- [ ] Environment auto-detection works correctly
- [ ] Auto-scroll to results functions properly
- [ ] Clickable tooltips work with keyboard navigation
- [ ] Form validation catches all error cases
- [ ] Results display correctly formatted with animations
- [ ] Export functionality works (JSON/CSV)
- [ ] Error states display helpful messages
- [ ] Responsive design works at different sizes
- [ ] Settings migration from old config works seamlessly

#### 2. API Integration Testing
```javascript
// Test with different API states
// 1. API server running - normal operation
// 2. API server down - connection errors
// 3. Invalid responses - parsing errors
// 4. Slow responses - timeout handling
```

#### 3. Storage Testing
```javascript
// Test storage scenarios
// 1. Fresh install - default values
// 2. Config updates - persistence
// 3. Form auto-save - data recovery
// 4. Storage limits - graceful degradation
```

### Performance Optimization

#### 1. Lazy Loading
```javascript
// Load heavy components only when needed
const chartLibrary = await import('./chart-library.js');
```

#### 2. Debounced Operations
```javascript
// Auto-save with debouncing
const debouncedSave = debounce(saveFormData, 2000);
form.addEventListener('input', debouncedSave);
```

#### 3. Memory Management
```javascript
// Clean up event listeners
class ComponentManager {
  destroy() {
    this.cleanup.forEach(fn => fn());
  }
}
```

## 🔍 API Integration Details

### PM Tools API Compatibility

#### Required Endpoints
```javascript
const API_ENDPOINTS = {
  health: '/health',              // GET - Health check
  validateSetup: '/validate/setup',   // POST - Experiment validation
  analyzeResults: '/analyze/results', // POST - Results analysis
  llmStatus: '/llm/status'        // GET - LLM provider status
};
```

#### Request/Response Patterns
```javascript
// Validate Setup Request
{
  hypothesis: "string",
  metric: {
    name: "string",
    baseline_conversion_rate: number
  },
  parameters: {
    minimum_detectable_effect_relative?: number,
    minimum_detectable_effect_absolute?: number,
    statistical_power: number,
    significance_level: number,
    variants: number
  },
  traffic: {
    estimated_daily_users: number
  }
}

// Analyze Results Request
{
  context: {
    hypothesis: "string",
    primary_metric_name: "string",
    pm_notes?: "string"
  },
  results_data: {
    variants: [
      {
        name: "string",
        users: number,
        conversions: number
      }
    ]
  }
}
```

### Error Handling Strategies

#### 1. Network Errors
```javascript
// Connection timeouts and retries
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), this.timeout);

try {
  const response = await fetch(url, { signal: controller.signal });
} catch (error) {
  if (error.name === 'AbortError') {
    throw new APIError('Request timed out');
  }
  throw new APIError('Connection failed');
}
```

#### 2. API Response Errors
```javascript
// HTTP status code handling
switch (response.status) {
  case 400: return 'Bad request - check input data';
  case 422: return 'Validation error - fix form inputs';
  case 500: return 'Server error - try again later';
  default: return `HTTP ${response.status}: ${response.statusText}`;
}
```

#### 3. Fallback Mechanisms
```javascript
// LLM service unavailable fallback
try {
  const llmResponse = await llm.generateText(prompt);
  return parseLLMResponse(llmResponse);
} catch (error) {
  return {
    assessment: "LLM assessment unavailable",
    suggestions: "Please review manually"
  };
}
```

## 🛠️ Configuration Management (Updated June 2025)

### Environment Auto-Detection
```javascript
// NEW: Automatic environment detection
const detectEnvironment = () => {
  // Smart detection based on browser context
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    const manifest = chrome.runtime.getManifest();
    if (manifest.version_name && manifest.version_name.includes('dev')) {
      return 'local';
    }
  }
  
  // Check for localhost or common dev patterns
  if (typeof location !== 'undefined') {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'local';
    }
    if (location.hostname.includes('staging') || location.hostname.includes('dev')) {
      return 'staging';
    }
  }
  
  return 'local'; // Default for development
};

// Environment-specific configuration (not user-configurable)
export const ENVIRONMENT_CONFIG = {
  local: {
    name: 'Local Development',
    apiHostname: 'http://localhost:8000'
  },
  staging: {
    name: 'Staging',
    apiHostname: 'https://staging-api.company.com'
  },
  production: {
    name: 'Production',
    apiHostname: 'https://api.company.com'
  }
};
```

### Technical Configuration (Hardcoded)
```javascript
// Technical settings - optimized defaults, not user-configurable
export const TECHNICAL_CONFIG = {
  timeout: 45000,
  retryAttempts: 3,
  retryDelay: 1000,
  maxRetryDelay: 5000
};

// Endpoint-specific timeouts (optimized)
export const ENDPOINT_TIMEOUTS = {
  '/health': 10000,           // 10 seconds for health checks
  '/validate/setup': 30000,   // 30 seconds for validation
  '/analyze/results': 90000,  // 90 seconds for AI-powered analysis
  '/llm/status': 15000        // 15 seconds for LLM status
};
```

### User Preferences Storage (NEW)
```javascript
// Simplified user preferences structure
{
  pmtools_user_preferences: {
    statisticalDefaults: {
      statistical_power: number,
      significance_level: number,
      variants: number,
      mde_type: "relative" | "absolute"
    },
    userExperience: {
      theme: "light" | "dark" | "auto",
      autoSave: boolean,
      clearOnSuccess: boolean,
      showTooltips: boolean,
      exportFormat: "json" | "csv"
    }
  },
  pmtools_form_data_validate: {
    // Auto-saved form data (unchanged)
    timestamp: number,
    // ... form fields
  },
  pmtools_form_data_analyze: {
    // Auto-saved form data (unchanged)
    timestamp: number,
    // ... form fields
  }
}
```

### Migration Support
```javascript
// Automatic migration from old config to new preferences
async function migrateFromOldConfig() {
  const oldConfig = await getStorageData(STORAGE_KEYS.config);
  if (!oldConfig) return null;
  
  const newPreferences = {
    statisticalDefaults: oldConfig.statisticalDefaults || STATISTICAL_DEFAULTS,
    userExperience: {
      theme: oldConfig.theme || 'light',
      autoSave: oldConfig.autoSave !== false,
      clearOnSuccess: oldConfig.clearOnSuccess || false,
      showTooltips: oldConfig.showTooltips !== false,
      exportFormat: oldConfig.exportFormat || 'json'
    }
  };
  
  await saveUserPreferences(newPreferences);
  return newPreferences;
}
```

## 🚨 Troubleshooting Guide

### Common Development Issues

#### 1. Extension Not Loading
```bash
# Check manifest.json syntax
# Verify all file paths exist
# Check browser console for errors
# Ensure Manifest V3 compliance
```

#### 2. API Connection Issues
```javascript
// Debug API connectivity
console.log('Testing connection to:', hostname);
const health = await apiClient.checkHealth();
console.log('Health check result:', health);

// Common fixes:
// 1. Check API server is running
// 2. Verify hostname format (include protocol)
// 3. Check CORS settings on API server
// 4. Test from browser network tab
```

#### 3. Form Validation Problems
```javascript
// Debug validation logic
try {
  validateForm(formData);
  console.log('Validation passed');
} catch (error) {
  console.error('Validation failed:', error.message);
  // Show specific field errors
}
```

#### 4. Storage Issues
```javascript
// Debug storage operations
chrome.storage.sync.get(null, (all) => {
  console.log('All stored data:', all);
});

// Clear storage for testing
chrome.storage.sync.clear();
```

#### 5. Markdown Rendering Issues (AI Content)
```javascript
// Debug formatTextToHTML function
// Add these logs to shared/utils.js formatTextToHTML function
console.log('Input text:', text);
console.log('Question matches:', text.match(/\*\*[^*]+\*\*:/g));

// Check if AI question pattern is detected
const questionMatches = text.match(/\*\*[^*]+\*\*:/g);
if (questionMatches && questionMatches.length > 1) {
  console.log('AI pattern detected, questions:', questionMatches);
} else {
  console.log('AI pattern NOT detected');
}

// Common issues:
// 1. AI text format doesn't match expected pattern
// 2. Hidden characters or different spacing
// 3. Regex patterns need adjustment
// 4. Block processing order interfering

// To debug in Chrome extension:
// 1. Right-click extension icon → "Inspect popup"
// 2. Go to Console tab
// 3. Submit analyze form and watch logs
```

#### 6. Chrome Extension Console Access
```bash
# Method 1: Right-click extension icon
Right-click PM Tools extension icon → "Inspect popup"

# Method 2: Extensions page
chrome://extensions/ → PM Tools → "Inspect views: popup"

# Method 3: Background script (if needed)
chrome://extensions/ → PM Tools → "Inspect views: service worker"
```

### Performance Debugging
```javascript
// Monitor API call times
const startTime = performance.now();
const response = await apiClient.validateSetup(data);
const endTime = performance.now();
console.log(`API call took ${endTime - startTime} milliseconds`);

// Monitor memory usage
console.log('Memory usage:', window.performance.memory);
```

### Browser Compatibility
- **Chrome**: Version 88+ (Manifest V3 support)
- **Edge**: Version 88+ (Chromium-based)
- **Firefox**: Manifest V2 version would be needed
- **Safari**: Not supported (different extension system)

## 📊 Adding New Features

### Adding a New API Endpoint
1. **Add to constants.js**:
   ```javascript
   export const API_ENDPOINTS = {
     // ... existing endpoints
     newEndpoint: '/new/endpoint'
   };
   ```

2. **Add to API client**:
   ```javascript
   async callNewEndpoint(data) {
     return await this.withRetry(async () => {
       return await this.makeRequest(API_ENDPOINTS.newEndpoint, {
         method: 'POST',
         body: JSON.stringify(data)
       });
     });
   }
   ```

3. **Add UI components** in popup or options page

4. **Update manifest permissions** if needed

### Adding New Form Fields
1. **Add HTML structure** in popup.html
2. **Add CSS styling** in popup.css
3. **Add JavaScript handling** in popup.js:
   ```javascript
   // In getFormData()
   newField: formData.get('newField'),
   
   // In validateForm()
   validateRequired(data.newField, 'New Field');
   
   // In buildRequest()
   new_field: data.newField
   ```

### Adding New User Preferences (Updated June 2025)
1. **Add to constants.js** default values in `DEFAULT_USER_PREFERENCES`:
   ```javascript
   export const DEFAULT_USER_PREFERENCES = {
     statisticalDefaults: { /* ... */ },
     userExperience: {
       // ... existing preferences
       newPreference: defaultValue
     }
   };
   ```

2. **Add HTML form** in options.html
3. **Add preference handling** in options.js:
   ```javascript
   // In collectFormData()
   userExperience: {
     // ... existing preferences
     newPreference: document.getElementById('newPreference').value
   }
   
   // In populateForm()
   const ux = this.currentPreferences.userExperience;
   document.getElementById('newPreference').value = ux.newPreference;
   ```

## 🔒 Security Considerations

### Content Security Policy
```json
// manifest.json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

### Secure API Communication
```javascript
// Always validate URLs
if (!validateURL(hostname)) {
  throw new Error('Invalid hostname format');
}

// Sanitize user inputs
const sanitized = DOMPurify.sanitize(userInput);

// Use HTTPS in production
if (isProduction && !hostname.startsWith('https://')) {
  console.warn('Using HTTP in production is not recommended');
}
```

### Data Privacy
- No personal data collection
- All data stays between browser and user's API
- Chrome storage is encrypted
- No external service dependencies

## 📈 Version Management

### Updating Extension Version
1. **Update manifest.json** version number
2. **Document changes** in commit message
3. **Test thoroughly** before release
4. **Package for distribution** if publishing

### API Compatibility
- Maintain backward compatibility when possible
- Version check against API endpoints
- Graceful degradation for missing features
- Clear error messages for incompatible versions

## 🎯 Best Practices

### Code Style
```javascript
// Use descriptive variable names
const validateFormButton = document.getElementById('validateSubmit');

// Consistent error handling
try {
  await operation();
} catch (error) {
  this.handleError(error);
}

// Document complex functions
/**
 * Validates experiment setup form data
 * @param {Object} data - Form data object
 * @throws {Error} Validation error with specific message
 */
validateForm(data) { /* ... */ }
```

### User Experience
- Always show loading states for async operations with progress indicators
- Auto-scroll to results after API responses to prevent "hidden results" confusion
- Provide clear error messages with actionable advice and PM-friendly language
- Use clickable tooltips with smart positioning instead of hover-only tooltips
- Save user work automatically with debounced form auto-save
- Minimize clicks needed for common operations
- Add visual entrance animations to draw attention to new content
- Test with real user workflows and PM scenarios

### Maintenance
- Keep dependencies minimal and use native Chrome APIs when possible
- Environment detection handles configuration automatically (no manual setup needed)
- Document user preferences but avoid exposing technical configuration options
- Maintain consistent code patterns and PM-friendly messaging throughout
- Regular testing with different API versions and environment configurations
- Ensure smooth migration paths for settings structure changes

---

## 📋 Summary of Major Architecture Changes (June 2025)

### 🎯 **UX-First Design Philosophy**
PM Tools has evolved from a technical developer tool to a **professional PM product**:

- **Zero Configuration Setup**: Works immediately without technical setup
- **User Experience Focus**: Every interaction designed for Product Manager workflows  
- **Professional Polish**: Auto-scroll, animations, smart tooltips, PM-friendly copy
- **Accessibility First**: Full keyboard navigation, reduced-motion support, ARIA compliance

### 🏗️ **Technical Architecture Improvements**
- **Environment Auto-Detection**: Smart detection eliminates manual API configuration
- **Simplified Settings**: User preferences only (statistical defaults + UX options)
- **Advanced Tooltip System**: Clickable, mobile-optimized, accessible tooltip management
- **Seamless Migration**: Automatic upgrade from old config to new preference structure
- **Enhanced Error Handling**: PM-friendly error messages with actionable guidance

### 🎨 **Modern UX Patterns**
- **Results Auto-Scroll**: Eliminates "hidden results" confusion
- **Visual Feedback**: Subtle animations and entrance effects
- **Smart Navigation**: Scroll-to-top buttons and logical information hierarchy
- **Progress Communication**: Clear messaging about what's happening and where results will appear

This documentation serves as the comprehensive guide for understanding, developing, and maintaining the PM Tools Chrome Extension. The architecture now reflects a **consumer-grade product experience** while maintaining the technical robustness needed for statistical analysis.