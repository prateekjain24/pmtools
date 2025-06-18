// Constants for PM Tools Chrome Extension

export const DEFAULT_CONFIG = {
  apiHostname: 'http://localhost:8000',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

export const ENVIRONMENT_PRESETS = {
  local: {
    name: 'Local Development',
    hostname: 'http://localhost:8000',
    description: 'Local development server'
  },
  staging: {
    name: 'Staging',
    hostname: 'https://staging-api.company.com',
    description: 'Staging environment'
  },
  production: {
    name: 'Production',
    hostname: 'https://api.company.com',
    description: 'Production environment'
  }
};

export const STATISTICAL_DEFAULTS = {
  statistical_power: 0.80,
  significance_level: 0.05,
  variants: 2,
  mde_type: 'relative'
};

export const API_ENDPOINTS = {
  health: '/health',
  validateSetup: '/validate/setup',
  analyzeResults: '/analyze/results',
  llmStatus: '/llm/status'
};

export const STORAGE_KEYS = {
  config: 'pmtools_config',
  formData: 'pmtools_form_data',
  recentResults: 'pmtools_recent_results'
};

export const ERROR_MESSAGES = {
  CONNECTION_FAILED: 'Unable to connect to the API server. Please check your configuration.',
  VALIDATION_ERROR: 'Please check your input values and try again.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again or check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
};

export const SUCCESS_MESSAGES = {
  CONFIG_SAVED: 'Configuration saved successfully!',
  CONNECTION_TEST_SUCCESS: 'API connection test successful!',
  DATA_EXPORTED: 'Data exported successfully!'
};