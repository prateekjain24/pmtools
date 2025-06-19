// Constants for PM Tools Chrome Extension

// Environment Auto-Detection
const detectEnvironment = () => {
  // For Chrome extension, we can detect based on various factors
  // In a real deployment, this could be build-time configuration
  
  // Check if we're in development mode (common patterns)
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
  
  // Default to local for development, could be changed to production for release builds
  return 'local';
};

// Environment-specific Configuration (Technical - Not User Configurable)
export const ENVIRONMENT_CONFIG = {
  local: {
    name: 'Local Development',
    apiHostname: 'http://localhost:8000',
    description: 'Local development server'
  },
  staging: {
    name: 'Staging',
    apiHostname: 'https://staging-api.company.com',
    description: 'Staging environment'
  },
  production: {
    name: 'Production',
    apiHostname: 'https://api.company.com',
    description: 'Production environment'
  }
};

// Technical Configuration (Hardcoded - Not User Configurable)
export const TECHNICAL_CONFIG = {
  timeout: 45000, // 45 seconds default
  retryAttempts: 3,
  retryDelay: 1000,
  maxRetryDelay: 5000
};

// Endpoint-specific timeout configurations (Optimized - Not User Configurable)
export const ENDPOINT_TIMEOUTS = {
  '/health': 10000,           // 10 seconds for health checks
  '/validate/setup': 30000,   // 30 seconds for validation
  '/analyze/results': 90000,  // 90 seconds for AI-powered analysis
  '/llm/status': 15000        // 15 seconds for LLM status
};

// Get Current Environment Configuration
export const getCurrentEnvironment = () => {
  const env = detectEnvironment();
  return {
    environment: env,
    ...ENVIRONMENT_CONFIG[env],
    ...TECHNICAL_CONFIG
  };
};

// Legacy Support - for backward compatibility during transition
export const DEFAULT_CONFIG = getCurrentEnvironment();

// User Preferences (Configurable in Settings)
export const STATISTICAL_DEFAULTS = {
  statistical_power: 0.80,
  significance_level: 0.05,
  variants: 2,
  mde_type: 'relative'
};

export const USER_EXPERIENCE_DEFAULTS = {
  theme: 'light',
  autoSave: true,
  clearOnSuccess: false,
  showTooltips: true,
  exportFormat: 'json'
};

// Combined User Preferences Schema
export const DEFAULT_USER_PREFERENCES = {
  statisticalDefaults: STATISTICAL_DEFAULTS,
  userExperience: USER_EXPERIENCE_DEFAULTS
};

export const API_ENDPOINTS = {
  health: '/health',
  validateSetup: '/validate/setup',
  analyzeResults: '/analyze/results',
  llmStatus: '/llm/status'
};

export const STORAGE_KEYS = {
  userPreferences: 'pmtools_user_preferences', // New simplified preferences
  config: 'pmtools_config', // Legacy - for migration
  formData: 'pmtools_form_data',
  recentResults: 'pmtools_recent_results'
};

export const ERROR_MESSAGES = {
  CONNECTION_FAILED: "Can't reach your API server 📡 (Is it taking a coffee break? Check your settings!)",
  VALIDATION_ERROR: "Houston, we have an input problem 🚀 (Double-check those numbers and try again)",
  SERVER_ERROR: 'Server hiccup detected 🤖 (Even the best APIs need a moment sometimes)',
  TIMEOUT_ERROR: 'Request timed out ⏰ (Your connection might be slower than sprint planning)',
  TIMEOUT_ERROR_ANALYZE: 'Your AI is working harder than a PM during release week ☕ (This is normal - maybe grab some coffee?)',
  UNKNOWN_ERROR: 'Something unexpected happened 🎭 (Even we didn\'t see this one coming)',
  HYPOTHESIS_TOO_VAGUE: 'Your hypothesis needs more substance than "make button prettier" 🤔 (Be specific!)',
  CONVERSIONS_EXCEED_USERS: 'Conversions can\'t exceed users ⏰ (Unless you\'ve discovered time travel)',
  SAMPLE_SIZE_TOO_SMALL: 'Sample size smaller than your team\'s attention span 📏 (You need more data!)',
  MDE_TOO_AMBITIOUS: 'That MDE is more optimistic than a PM\'s initial timeline estimate 🎯 (Try something realistic)'
};

export const SUCCESS_MESSAGES = {
  CONFIG_SAVED: '⚙️ Settings saved! You\'re all set to validate like a pro',
  CONNECTION_TEST_SUCCESS: '🎉 API connection successful! Your data pipeline is ready to roll',
  DATA_EXPORTED: '📊 Data exported! Time to make some spreadsheet magic happen',
  VALIDATION_SUCCESS: '🎯 Setup validated! Your experiment is ready to make stakeholders happy',
  ANALYSIS_COMPLETE: '✨ Analysis complete! Time to make some data-driven magic happen',
  FORM_AUTO_SAVED: '💾 Form auto-saved (because losing work is worse than losing users)',
  HYPOTHESIS_LOOKS_GOOD: '👍 Solid hypothesis! Your stats professor would be proud'
};

export const TIP_MESSAGES = {
  SAMPLE_SIZE_MATTERS: '🎯 Pro tip: Bigger sample size = more reliable results (but longer tests)',
  ONE_THING_AT_TIME: '🔬 Test one thing at a time (resist the kitchen sink approach)',
  BASELINE_IMPORTANCE: '📊 Know your baseline - it\'s the foundation of good experiments',
  STATISTICAL_VS_PRACTICAL: '⚠️ Statistical significance ≠ business significance (math can\'t fix bad ideas)',
  MOBILE_CONSIDERATIONS: '📱 Don\'t forget mobile users - they\'re probably half your traffic',
  SEASONAL_EFFECTS: '📅 Consider seasonality - Black Friday results won\'t match Tuesday in March'
};

export const WARNING_MESSAGES = {
  LOW_SAMPLE_SIZE: '🚩 Red flag: Sample size might be too small for reliable results',
  HIGH_MDE: '⚠️ Warning: That\'s a pretty ambitious improvement target',
  VERY_LONG_TEST: '📅 Heads up: This test will run longer than your average product roadmap',
  MULTIPLE_VARIANTS: '🎭 Remember: More variants = more complexity (and more chances for confusion)',
  WEEKEND_EFFECT: '📆 Consider weekday vs weekend behavior differences'
};