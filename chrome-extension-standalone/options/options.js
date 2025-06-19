// PM Tools Standalone Edition - Options Page JavaScript
// BYOK (Bring Your Own Keys) Configuration

import { 
  showMessage, 
  clearMessages,
  initializeTooltips,
  getStorageData,
  setStorageData
} from '../shared/utils.js';

import { 
  DEFAULT_USER_PREFERENCES,
  STORAGE_KEYS,
  LLM_PROVIDERS,
  LLM_CONFIG,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES
} from '../shared/constants.js';

import { 
  GoogleGeminiClient,
  AnthropicClaudeClient,
  saveAPIKeys,
  getAPIKeys
} from '../shared/llm-client.js';

class StandaloneOptionsManager {
  constructor() {
    this.currentPreferences = null;
    this.apiKeys = { googleApiKey: '', anthropicApiKey: '' };
    this.llmClients = new Map();
    this.isDirty = false;
    
    this.init();
  }

  async init() {
    try {
      // Load current preferences and API keys
      await this.loadSettings();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize UI
      this.initializeUI();
      
      // Initialize enhanced tooltips
      initializeTooltips();
      
      // Initialize LLM clients
      this.initializeLLMClients();
      
      // Check API key status
      this.updateAPIKeyStatus();
      
      console.log('🚀 PM Tools Standalone Options initialized');
    } catch (error) {
      console.error('Failed to initialize options:', error);
      showMessage(
        document.getElementById('messages'),
        ERROR_MESSAGES.UNKNOWN_ERROR,
        'error'
      );
    }
  }

  async loadSettings() {
    // Load user preferences
    this.currentPreferences = await getStorageData(STORAGE_KEYS.userPreferences) 
      || DEFAULT_USER_PREFERENCES;
    
    // Load API keys
    this.apiKeys = await getAPIKeys();
    
    this.populateForm();
  }

  populateForm() {
    // Populate API keys
    document.getElementById('googleApiKey').value = this.maskAPIKey(this.apiKeys.googleApiKey);
    document.getElementById('anthropicApiKey').value = this.maskAPIKey(this.apiKeys.anthropicApiKey);
    
    // Populate LLM settings
    const llmSettings = this.currentPreferences.llmSettings || DEFAULT_USER_PREFERENCES.llmSettings;
    document.getElementById('defaultProvider').value = llmSettings.defaultProvider;
    document.getElementById('fallbackEnabled').checked = llmSettings.fallbackEnabled;
    
    // Populate statistical defaults
    const stats = this.currentPreferences.statisticalDefaults || DEFAULT_USER_PREFERENCES.statisticalDefaults;
    document.getElementById('defaultPower').value = stats.statistical_power;
    document.getElementById('defaultSignificance').value = stats.significance_level;
    document.getElementById('defaultVariants').value = stats.variants;
    document.querySelector(`input[name="defaultMdeType"][value="${stats.mde_type}"]`).checked = true;
    
    // Populate user experience settings
    const ux = this.currentPreferences.userExperience || DEFAULT_USER_PREFERENCES.userExperience;
    document.getElementById('theme').value = ux.theme;
    document.getElementById('autoSave').checked = ux.autoSave;
    document.getElementById('clearOnSuccess').checked = ux.clearOnSuccess;
    document.getElementById('showTooltips').checked = ux.showTooltips;
    document.getElementById('animationEnabled').checked = ux.animationEnabled !== false;
    document.getElementById('exportFormat').value = ux.exportFormat;
  }

  maskAPIKey(key) {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '•'.repeat(Math.max(key.length - 8, 4)) + key.substring(key.length - 4);
  }

  setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', () => this.saveSettings());
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.resetToDefaults());
    
    // API key toggle buttons
    document.getElementById('toggleGoogleKey').addEventListener('click', () => this.toggleAPIKeyVisibility('googleApiKey'));
    document.getElementById('toggleAnthropicKey').addEventListener('click', () => this.toggleAPIKeyVisibility('anthropicApiKey'));
    
    // Test connection buttons
    document.getElementById('testGeminiBtn').addEventListener('click', () => this.testConnection('gemini'));
    document.getElementById('testClaudeBtn').addEventListener('click', () => this.testConnection('claude'));
    
    // Form change tracking
    document.addEventListener('input', () => this.markDirty());
    document.addEventListener('change', () => this.markDirty());
    
    // API key input handlers
    document.getElementById('googleApiKey').addEventListener('input', (e) => this.handleAPIKeyInput(e, 'google'));
    document.getElementById('anthropicApiKey').addEventListener('input', (e) => this.handleAPIKeyInput(e, 'anthropic'));
  }

  initializeUI() {
    // Set initial button states
    this.updateSaveButtonState();
    
    // Update provider information
    this.updateProviderInfo();
  }

  initializeLLMClients() {
    if (this.apiKeys.googleApiKey) {
      this.llmClients.set('gemini', new GoogleGeminiClient(this.apiKeys.googleApiKey));
    }
    
    if (this.apiKeys.anthropicApiKey) {
      this.llmClients.set('claude', new AnthropicClaudeClient(this.apiKeys.anthropicApiKey));
    }
  }

  async updateAPIKeyStatus() {
    // Update Gemini status
    await this.updateProviderStatus('gemini', 'geminiStatus');
    
    // Update Claude status
    await this.updateProviderStatus('claude', 'claudeStatus');
  }

  async updateProviderStatus(provider, statusElementId) {
    const statusEl = document.getElementById(statusElementId);
    const indicator = statusEl.querySelector('.status-indicator');
    const text = statusEl.querySelector('.status-text');
    
    const hasKey = provider === 'gemini' ? !!this.apiKeys.googleApiKey : !!this.apiKeys.anthropicApiKey;
    
    if (!hasKey) {
      indicator.className = 'status-indicator';
      text.className = 'status-text';
      text.textContent = 'Not configured';
      return;
    }
    
    const client = this.llmClients.get(provider);
    if (!client) {
      indicator.className = 'status-indicator error';
      text.className = 'status-text error';
      text.textContent = 'Client not initialized';
      return;
    }
    
    try {
      const isAvailable = await client.isAvailable();
      if (isAvailable) {
        indicator.className = 'status-indicator connected';
        text.className = 'status-text connected';
        text.textContent = 'Connected';
        
        // Update API key group styling
        const groupEl = statusEl.closest('.api-key-group');
        if (groupEl) groupEl.classList.add('configured');
      } else {
        indicator.className = 'status-indicator error';
        text.className = 'status-text error';
        text.textContent = 'Connection failed';
      }
    } catch (error) {
      indicator.className = 'status-indicator error';
      text.className = 'status-text error';
      text.textContent = 'Error checking connection';
    }
  }

  toggleAPIKeyVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(inputId === 'googleApiKey' ? 'toggleGoogleKey' : 'toggleAnthropicKey');
    
    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = '🙈';
      button.setAttribute('aria-label', 'Hide API key');
    } else {
      input.type = 'password';
      button.textContent = '👁️';
      button.setAttribute('aria-label', 'Show API key');
    }
  }

  handleAPIKeyInput(event, provider) {
    const value = event.target.value;
    const isUnmasked = !value.includes('•');
    
    if (isUnmasked) {
      // Store the real API key value
      if (provider === 'google') {
        this.apiKeys.googleApiKey = value;
      } else {
        this.apiKeys.anthropicApiKey = value;
      }
      
      // Reinitialize LLM client
      this.initializeLLMClients();
      
      // Update status
      const statusId = provider === 'google' ? 'geminiStatus' : 'claudeStatus';
      this.updateProviderStatus(provider === 'google' ? 'gemini' : 'claude', statusId);
    }
    
    this.markDirty();
  }

  async testConnection(provider) {
    const button = document.getElementById(provider === 'gemini' ? 'testGeminiBtn' : 'testClaudeBtn');
    const statusId = provider === 'gemini' ? 'geminiStatus' : 'claudeStatus';
    const statusEl = document.getElementById(statusId);
    const indicator = statusEl.querySelector('.status-indicator');
    const text = statusEl.querySelector('.status-text');
    
    // Set testing state
    button.classList.add('testing');
    button.disabled = true;
    indicator.className = 'status-indicator testing';
    text.className = 'status-text testing';
    text.textContent = 'Testing connection...';
    
    try {
      const client = this.llmClients.get(provider);
      if (!client) {
        throw new Error('API key not configured');
      }
      
      // Test with a simple request
      const result = await client.generateText('Test connection - respond with "OK"');
      
      if (result) {
        indicator.className = 'status-indicator connected';
        text.className = 'status-text connected';
        text.textContent = 'Connection successful!';
        
        showMessage(
          document.getElementById('messages'),
          SUCCESS_MESSAGES.CONNECTION_TEST_SUCCESS,
          'success',
          3000
        );
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      indicator.className = 'status-indicator error';
      text.className = 'status-text error';
      text.textContent = `Connection failed: ${error.message}`;
      
      showMessage(
        document.getElementById('messages'),
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} connection failed: ${error.message}`,
        'error',
        5000
      );
    } finally {
      button.classList.remove('testing');
      button.disabled = false;
    }
  }

  markDirty() {
    this.isDirty = true;
    this.updateSaveButtonState();
  }

  updateSaveButtonState() {
    const saveBtn = document.getElementById('saveBtn');
    if (this.isDirty) {
      saveBtn.classList.add('btn-primary');
      saveBtn.classList.remove('btn-secondary');
    } else {
      saveBtn.classList.add('btn-secondary');
      saveBtn.classList.remove('btn-primary');
    }
  }

  collectFormData() {
    return {
      statisticalDefaults: {
        statistical_power: parseFloat(document.getElementById('defaultPower').value),
        significance_level: parseFloat(document.getElementById('defaultSignificance').value),
        variants: parseInt(document.getElementById('defaultVariants').value),
        mde_type: document.querySelector('input[name="defaultMdeType"]:checked').value
      },
      userExperience: {
        theme: document.getElementById('theme').value,
        autoSave: document.getElementById('autoSave').checked,
        clearOnSuccess: document.getElementById('clearOnSuccess').checked,
        showTooltips: document.getElementById('showTooltips').checked,
        animationEnabled: document.getElementById('animationEnabled').checked,
        exportFormat: document.getElementById('exportFormat').value
      },
      llmSettings: {
        defaultProvider: document.getElementById('defaultProvider').value,
        fallbackEnabled: document.getElementById('fallbackEnabled').checked
      }
    };
  }

  async saveSettings() {
    const saveBtn = document.getElementById('saveBtn');
    const btnText = saveBtn.querySelector('.btn-text');
    const btnSpinner = saveBtn.querySelector('.btn-spinner');
    
    // Show loading state
    saveBtn.disabled = true;
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
    
    try {
      clearMessages(document.getElementById('messages'));
      
      // Collect form data
      const formData = this.collectFormData();
      
      // Save user preferences
      await setStorageData(STORAGE_KEYS.userPreferences, formData);
      this.currentPreferences = formData;
      
      // Save API keys
      await saveAPIKeys(this.apiKeys.googleApiKey, this.apiKeys.anthropicApiKey);
      
      // Update LLM clients
      this.initializeLLMClients();
      
      // Reset dirty state
      this.isDirty = false;
      this.updateSaveButtonState();
      
      showMessage(
        document.getElementById('messages'),
        SUCCESS_MESSAGES.SETTINGS_SAVED,
        'success'
      );
      
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showMessage(
        document.getElementById('messages'),
        ERROR_MESSAGES.STORAGE_ERROR,
        'error'
      );
    } finally {
      // Reset loading state
      saveBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  }

  async resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This will not affect your API keys.')) {
      return;
    }
    
    try {
      // Reset to default preferences (keeping API keys)
      this.currentPreferences = { ...DEFAULT_USER_PREFERENCES };
      this.populateForm();
      this.markDirty();
      
      showMessage(
        document.getElementById('messages'),
        'Settings reset to defaults (API keys preserved)',
        'info'
      );
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showMessage(
        document.getElementById('messages'),
        ERROR_MESSAGES.UNKNOWN_ERROR,
        'error'
      );
    }
  }

  updateProviderInfo() {
    // This could be used to display provider-specific information
    // For now, the info is static in the HTML
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new StandaloneOptionsManager();
});