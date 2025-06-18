// PM Tools Chrome Extension Options Page JavaScript

import { 
  getConfiguration, 
  saveConfiguration, 
  showMessage, 
  clearMessages,
  validateURL
} from '../shared/utils.js';
import { DEFAULT_CONFIG, ENVIRONMENT_PRESETS, STATISTICAL_DEFAULTS } from '../shared/constants.js';

class OptionsManager {
  constructor() {
    this.currentConfig = null;
    this.isDirty = false;
    
    this.init();
  }

  async init() {
    // Load current configuration
    await this.loadConfiguration();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize UI
    this.initializeUI();
  }

  async loadConfiguration() {
    try {
      this.currentConfig = await getConfiguration();
      this.populateForm();
    } catch (error) {
      console.error('Failed to load configuration:', error);
      showMessage(
        document.getElementById('messages'),
        'Failed to load configuration. Using defaults.',
        'warning'
      );
      this.currentConfig = this.getDefaultConfiguration();
      this.populateForm();
    }
  }

  getDefaultConfiguration() {
    return {
      apiHostname: DEFAULT_CONFIG.apiHostname,
      timeout: DEFAULT_CONFIG.timeout,
      retryAttempts: DEFAULT_CONFIG.retryAttempts,
      retryDelay: DEFAULT_CONFIG.retryDelay,
      statisticalDefaults: STATISTICAL_DEFAULTS,
      theme: 'light',
      autoSave: true,
      clearOnSuccess: false,
      showTooltips: true,
      exportFormat: 'json'
    };
  }

  setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', (e) => {
      e.preventDefault();
      this.saveConfiguration();
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', (e) => {
      e.preventDefault();
      this.resetToDefaults();
    });

    // Test connection button
    document.getElementById('testConnectionBtn').addEventListener('click', (e) => {
      e.preventDefault();
      this.testConnection();
    });

    // Environment preset buttons
    document.querySelectorAll('.btn-preset').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectPreset(button.dataset.preset);
      });
    });

    // Advanced options toggle
    document.getElementById('advancedToggle').addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleAdvancedOptions();
    });

    // Form change tracking
    this.setupFormChangeTracking();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          this.saveConfiguration();
        }
      }
    });
  }

  setupFormChangeTracking() {
    const forms = ['configForm', 'statisticalForm', 'experienceForm'];
    
    forms.forEach(formId => {
      const form = document.getElementById(formId);
      if (form) {
        form.addEventListener('input', () => {
          this.markAsDirty();
        });
        form.addEventListener('change', () => {
          this.markAsDirty();
        });
      }
    });
  }

  markAsDirty() {
    if (!this.isDirty) {
      this.isDirty = true;
      this.updateSaveButton();
    }
  }

  markAsClean() {
    this.isDirty = false;
    this.updateSaveButton();
  }

  updateSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    const btnText = saveBtn.querySelector('.btn-text');
    
    if (this.isDirty) {
      btnText.textContent = 'Save Changes';
      saveBtn.classList.add('btn-primary');
      saveBtn.classList.remove('btn-secondary');
    } else {
      btnText.textContent = 'Saved';
      saveBtn.classList.remove('btn-primary');
      saveBtn.classList.add('btn-secondary');
    }
  }

  initializeUI() {
    // Initialize collapsible sections
    this.initCollapsible();
    
    // Set up form validation
    this.setupFormValidation();
  }

  initCollapsible() {
    const toggle = document.getElementById('advancedToggle');
    const content = document.getElementById('advancedContent');
    const arrow = toggle.querySelector('.collapsible-arrow');
    
    // Start collapsed
    content.classList.remove('open');
    arrow.classList.remove('open');
    content.style.maxHeight = '0';
  }

  toggleAdvancedOptions() {
    const toggle = document.getElementById('advancedToggle');
    const content = document.getElementById('advancedContent');
    const arrow = toggle.querySelector('.collapsible-arrow');
    
    const isOpen = content.classList.contains('open');
    
    if (isOpen) {
      content.classList.remove('open');
      arrow.classList.remove('open');
      content.style.maxHeight = '0';
    } else {
      content.classList.add('open');
      arrow.classList.add('open');
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  }

  setupFormValidation() {
    const apiHostnameInput = document.getElementById('apiHostname');
    
    apiHostnameInput.addEventListener('blur', () => {
      this.validateApiHostname();
    });

    apiHostnameInput.addEventListener('input', () => {
      // Clear previous validation state
      apiHostnameInput.setCustomValidity('');
    });
  }

  validateApiHostname() {
    const input = document.getElementById('apiHostname');
    const value = input.value.trim();
    
    if (!value) {
      input.setCustomValidity('API hostname is required');
      return false;
    }
    
    if (!validateURL(value)) {
      input.setCustomValidity('Please enter a valid URL (including http:// or https://)');
      return false;
    }
    
    input.setCustomValidity('');
    return true;
  }

  populateForm() {
    if (!this.currentConfig) return;

    // API Configuration
    document.getElementById('apiHostname').value = this.currentConfig.apiHostname || '';
    document.getElementById('timeout').value = this.currentConfig.timeout || DEFAULT_CONFIG.timeout;
    document.getElementById('retryAttempts').value = this.currentConfig.retryAttempts || DEFAULT_CONFIG.retryAttempts;
    document.getElementById('retryDelay').value = this.currentConfig.retryDelay || DEFAULT_CONFIG.retryDelay;

    // Statistical Defaults
    const stats = this.currentConfig.statisticalDefaults || STATISTICAL_DEFAULTS;
    document.getElementById('defaultPower').value = stats.statistical_power || STATISTICAL_DEFAULTS.statistical_power;
    document.getElementById('defaultSignificance').value = stats.significance_level || STATISTICAL_DEFAULTS.significance_level;
    document.getElementById('defaultVariants').value = stats.variants || STATISTICAL_DEFAULTS.variants;
    
    const mdeTypeRadio = document.querySelector(`input[name="defaultMdeType"][value="${stats.mde_type || STATISTICAL_DEFAULTS.mde_type}"]`);
    if (mdeTypeRadio) {
      mdeTypeRadio.checked = true;
    }

    // User Experience
    document.getElementById('theme').value = this.currentConfig.theme || 'light';
    document.getElementById('autoSave').checked = this.currentConfig.autoSave !== false;
    document.getElementById('clearOnSuccess').checked = this.currentConfig.clearOnSuccess || false;
    document.getElementById('showTooltips').checked = this.currentConfig.showTooltips !== false;
    document.getElementById('exportFormat').value = this.currentConfig.exportFormat || 'json';

    // Update preset buttons
    this.updatePresetButtons();
    
    // Mark as clean
    this.markAsClean();
  }

  updatePresetButtons() {
    const currentHostname = document.getElementById('apiHostname').value;
    
    document.querySelectorAll('.btn-preset').forEach(button => {
      const preset = ENVIRONMENT_PRESETS[button.dataset.preset];
      button.classList.toggle('active', preset && preset.hostname === currentHostname);
    });
  }

  selectPreset(presetName) {
    const preset = ENVIRONMENT_PRESETS[presetName];
    if (!preset) return;

    document.getElementById('apiHostname').value = preset.hostname;
    this.updatePresetButtons();
    this.markAsDirty();
    
    showMessage(
      document.getElementById('messages'),
      `Selected ${preset.name} environment: ${preset.hostname}`,
      'info',
      3000
    );
  }

  async saveConfiguration() {
    const messagesEl = document.getElementById('messages');
    const saveBtn = document.getElementById('saveBtn');
    const btnText = saveBtn.querySelector('.btn-text');
    const btnSpinner = saveBtn.querySelector('.btn-spinner');
    
    clearMessages(messagesEl);

    // Validate form
    if (!this.validateForm()) {
      showMessage(messagesEl, 'Please fix the validation errors before saving.', 'error');
      return;
    }

    try {
      // Show loading state
      saveBtn.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');

      // Collect form data
      const newConfig = this.collectFormData();
      
      // Save configuration
      await saveConfiguration(newConfig);
      this.currentConfig = newConfig;
      
      // Update button state
      this.markAsClean();
      
      showMessage(messagesEl, 'Configuration saved successfully!', 'success');
      
      // Notify other components that config changed
      chrome.runtime.sendMessage({ action: 'configChanged', config: newConfig });
      
    } catch (error) {
      console.error('Failed to save configuration:', error);
      showMessage(messagesEl, `Failed to save configuration: ${error.message}`, 'error');
    } finally {
      // Reset loading state
      saveBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  }

  validateForm() {
    let isValid = true;

    // Validate API hostname
    if (!this.validateApiHostname()) {
      isValid = false;
    }

    // Validate timeout
    const timeout = parseInt(document.getElementById('timeout').value);
    if (isNaN(timeout) || timeout < 5000 || timeout > 120000) {
      document.getElementById('timeout').setCustomValidity('Timeout must be between 5000 and 120000 milliseconds');
      isValid = false;
    } else {
      document.getElementById('timeout').setCustomValidity('');
    }

    // Validate retry delay
    const retryDelay = parseInt(document.getElementById('retryDelay').value);
    if (isNaN(retryDelay) || retryDelay < 500 || retryDelay > 5000) {
      document.getElementById('retryDelay').setCustomValidity('Retry delay must be between 500 and 5000 milliseconds');
      isValid = false;
    } else {
      document.getElementById('retryDelay').setCustomValidity('');
    }

    return isValid;
  }

  collectFormData() {
    return {
      // API Configuration
      apiHostname: document.getElementById('apiHostname').value.trim(),
      timeout: parseInt(document.getElementById('timeout').value),
      retryAttempts: parseInt(document.getElementById('retryAttempts').value),
      retryDelay: parseInt(document.getElementById('retryDelay').value),
      
      // Statistical Defaults
      statisticalDefaults: {
        statistical_power: parseFloat(document.getElementById('defaultPower').value),
        significance_level: parseFloat(document.getElementById('defaultSignificance').value),
        variants: parseInt(document.getElementById('defaultVariants').value),
        mde_type: document.querySelector('input[name="defaultMdeType"]:checked').value
      },
      
      // User Experience
      theme: document.getElementById('theme').value,
      autoSave: document.getElementById('autoSave').checked,
      clearOnSuccess: document.getElementById('clearOnSuccess').checked,
      showTooltips: document.getElementById('showTooltips').checked,
      exportFormat: document.getElementById('exportFormat').value
    };
  }

  async resetToDefaults() {
    const messagesEl = document.getElementById('messages');
    
    if (!confirm('Are you sure you want to reset all settings to their default values? This cannot be undone.')) {
      return;
    }

    try {
      this.currentConfig = this.getDefaultConfiguration();
      this.populateForm();
      this.markAsDirty();
      
      showMessage(messagesEl, 'Settings reset to defaults. Remember to save your changes.', 'info');
      
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      showMessage(messagesEl, `Failed to reset configuration: ${error.message}`, 'error');
    }
  }

  async testConnection() {
    const messagesEl = document.getElementById('messages');
    const testBtn = document.getElementById('testConnectionBtn');
    const btnText = testBtn.querySelector('.btn-text');
    const btnSpinner = testBtn.querySelector('.btn-spinner');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    clearMessages(messagesEl);

    // Validate hostname first
    if (!this.validateApiHostname()) {
      showMessage(messagesEl, 'Please enter a valid API hostname before testing.', 'error');
      return;
    }

    const hostname = document.getElementById('apiHostname').value.trim();

    try {
      // Show testing state
      testBtn.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');
      statusIndicator.className = 'status-indicator testing';
      statusText.textContent = 'Testing connection...';

      // Send test request to background script
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'testConnection', hostname: hostname },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response.success && response.result.connected) {
        statusIndicator.className = 'status-indicator success';
        statusText.textContent = 'Connection successful';
        showMessage(messagesEl, 'API connection test successful!', 'success');
      } else {
        statusIndicator.className = 'status-indicator error';
        statusText.textContent = 'Connection failed';
        const errorMsg = response.result?.message || response.error || 'Unknown error';
        showMessage(messagesEl, `Connection test failed: ${errorMsg}`, 'error');
      }

    } catch (error) {
      console.error('Connection test failed:', error);
      statusIndicator.className = 'status-indicator error';
      statusText.textContent = 'Test failed';
      showMessage(messagesEl, `Connection test failed: ${error.message}`, 'error');
    } finally {
      // Reset button state
      testBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  }
}

// Handle page navigation warning
window.addEventListener('beforeunload', (e) => {
  const optionsManager = window.optionsManager;
  if (optionsManager && optionsManager.isDirty) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return e.returnValue;
  }
});

// Initialize the options manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.optionsManager = new OptionsManager();
});