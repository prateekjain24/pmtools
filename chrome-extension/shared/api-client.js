// API Client for PM Tools Chrome Extension
// Based on streamlit_app/components/api_client.py

import { DEFAULT_CONFIG, API_ENDPOINTS, ERROR_MESSAGES } from './constants.js';
import { getStorageData } from './utils.js';

export class APIClient {
  constructor() {
    this.baseUrl = DEFAULT_CONFIG.apiHostname;
    this.timeout = DEFAULT_CONFIG.timeout;
    this.retryAttempts = DEFAULT_CONFIG.retryAttempts;
    this.retryDelay = DEFAULT_CONFIG.retryDelay;
    
    // Load configuration from storage
    this.loadConfig();
  }

  async loadConfig() {
    try {
      const config = await getStorageData('pmtools_config');
      if (config) {
        this.baseUrl = config.apiHostname || DEFAULT_CONFIG.apiHostname;
        this.timeout = config.timeout || DEFAULT_CONFIG.timeout;
        this.retryAttempts = config.retryAttempts || DEFAULT_CONFIG.retryAttempts;
        this.retryDelay = config.retryDelay || DEFAULT_CONFIG.retryDelay;
      }
    } catch (error) {
      console.error('Failed to load API configuration:', error);
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      ...options
    };

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return await this.handleResponse(response);
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new APIError(ERROR_MESSAGES.TIMEOUT_ERROR);
      }
      
      throw new APIError(error.message || ERROR_MESSAGES.CONNECTION_FAILED);
    }
  }

  async handleResponse(response) {
    if (!response.ok) {
      let errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
      
      try {
        const errorData = await response.json();
        
        switch (response.status) {
          case 400:
            errorMessage = `Request Error: ${errorData.detail || 'Bad request'}`;
            break;
          case 422:
            errorMessage = `Validation Error: ${errorData.detail || 'Validation error'}`;
            break;
          case 500:
            errorMessage = ERROR_MESSAGES.SERVER_ERROR;
            break;
          default:
            errorMessage = `HTTP ${response.status}: ${errorData.detail || response.statusText}`;
        }
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new APIError(errorMessage);
    }

    try {
      return await response.json();
    } catch (parseError) {
      throw new APIError('Invalid response format from server');
    }
  }

  async withRetry(requestFn) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry validation errors or client errors
        if (error instanceof APIError && error.message.includes('Validation Error')) {
          throw error;
        }
        
        if (attempt < this.retryAttempts) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  async checkHealth() {
    try {
      await this.makeRequest(API_ENDPOINTS.health);
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkLLMStatus() {
    try {
      const response = await this.makeRequest(API_ENDPOINTS.llmStatus);
      return response;
    } catch (error) {
      return { status: 'unavailable', error: error.message };
    }
  }

  async validateSetup(setupData) {
    return await this.withRetry(async () => {
      return await this.makeRequest(API_ENDPOINTS.validateSetup, {
        method: 'POST',
        body: JSON.stringify(setupData)
      });
    });
  }

  async analyzeResults(resultsData) {
    return await this.withRetry(async () => {
      return await this.makeRequest(API_ENDPOINTS.analyzeResults, {
        method: 'POST',
        body: JSON.stringify(resultsData)
      });
    });
  }

  // Update configuration
  updateConfig(newConfig) {
    if (newConfig.apiHostname) this.baseUrl = newConfig.apiHostname;
    if (newConfig.timeout) this.timeout = newConfig.timeout;
    if (newConfig.retryAttempts) this.retryAttempts = newConfig.retryAttempts;
    if (newConfig.retryDelay) this.retryDelay = newConfig.retryDelay;
  }

  // Get current configuration
  getConfig() {
    return {
      apiHostname: this.baseUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay
    };
  }
}

export class APIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'APIError';
  }
}

// Singleton instance
let apiClientInstance = null;

export function getAPIClient() {
  if (!apiClientInstance) {
    apiClientInstance = new APIClient();
  }
  return apiClientInstance;
}

export function resetAPIClient() {
  apiClientInstance = null;
}