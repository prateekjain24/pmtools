# CLAUDE.md - Chrome Extension Development Guide

This file provides comprehensive guidance for developing, maintaining, and extending the PM Tools Chrome Extension.

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
- **Configuration Interface**: API settings and preferences
- **Environment Presets**: Quick setup for dev/staging/prod
- **Connection Testing**: Verify API accessibility
- **User Preferences**: Theme, defaults, and UX settings

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
// Singleton pattern with configuration
export function getAPIClient() {
  if (!apiClientInstance) {
    apiClientInstance = new APIClient();
  }
  return apiClientInstance;
}

// Configuration updates
client.updateConfig(newConfig);
await client.loadConfig(); // From Chrome storage
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
- [ ] API configuration works with different hostnames
- [ ] Form validation catches all error cases
- [ ] Results display correctly formatted
- [ ] Export functionality works (JSON/CSV)
- [ ] Error states display helpful messages
- [ ] Responsive design works at different sizes

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

## 🛠️ Configuration Management

### Environment Configuration
```javascript
// Environment presets for easy switching
const ENVIRONMENT_PRESETS = {
  local: {
    name: 'Local Development',
    hostname: 'http://localhost:8000'
  },
  staging: {
    name: 'Staging',
    hostname: 'https://staging-api.company.com'
  },
  production: {
    name: 'Production', 
    hostname: 'https://api.company.com'
  }
};
```

### Storage Schema
```javascript
// Chrome storage structure
{
  pmtools_config: {
    apiHostname: "string",
    timeout: number,
    retryAttempts: number,
    retryDelay: number,
    statisticalDefaults: {
      statistical_power: number,
      significance_level: number,
      variants: number,
      mde_type: "relative" | "absolute"
    },
    theme: "light" | "dark" | "auto",
    autoSave: boolean,
    clearOnSuccess: boolean,
    showTooltips: boolean,
    exportFormat: "json" | "csv"
  },
  pmtools_form_data_validate: {
    // Auto-saved form data
    timestamp: number,
    // ... form fields
  },
  pmtools_form_data_analyze: {
    // Auto-saved form data
    timestamp: number,
    // ... form fields
  }
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

### Adding New Settings
1. **Add to constants.js** default values
2. **Add HTML form** in options.html
3. **Add storage handling** in options.js:
   ```javascript
   // In collectFormData()
   newSetting: document.getElementById('newSetting').value,
   
   // In populateForm()
   document.getElementById('newSetting').value = config.newSetting;
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
- Always show loading states for async operations
- Provide clear error messages with actionable advice
- Save user work automatically
- Minimize clicks needed for common operations
- Test with real user workflows

### Maintenance
- Keep dependencies minimal
- Use native Chrome APIs when possible
- Document all configuration options
- Maintain consistent code patterns
- Regular testing with different API versions

---

This documentation serves as the comprehensive guide for understanding, developing, and maintaining the PM Tools Chrome Extension. Follow these patterns and guidelines to ensure consistent, maintainable, and user-friendly code.