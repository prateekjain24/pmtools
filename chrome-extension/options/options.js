// PM Tools Chrome Extension Options Page JavaScript

import { 
  getUserPreferences, 
  saveUserPreferences, 
  showMessage, 
  clearMessages,
  initializeTooltips
} from '../shared/utils.js';
import { getCurrentEnvironment, DEFAULT_USER_PREFERENCES, STATISTICAL_DEFAULTS } from '../shared/constants.js';

class OptionsManager {
  constructor() {
    this.currentPreferences = null;
    this.environmentConfig = null;
    this.isDirty = false;
    
    this.init();
  }

  async init() {
    // Load environment configuration
    this.environmentConfig = getCurrentEnvironment();
    
    // Load current user preferences
    await this.loadUserPreferences();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize UI
    this.initializeUI();
    
    // Initialize enhanced tooltips
    initializeTooltips();
    
    // Display environment info
    this.displayEnvironmentInfo();
    
    // Check API connection
    this.checkAPIConnection();
  }

  async loadUserPreferences() {
    try {
      this.currentPreferences = await getUserPreferences();
      this.populateForm();
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      showMessage(
        document.getElementById('messages'),
        'Failed to load preferences. Using defaults.',
        'warning'
      );
      this.currentPreferences = DEFAULT_USER_PREFERENCES;
      this.populateForm();
    }
  }

  displayEnvironmentInfo() {
    document.getElementById('currentEnvironment').textContent = 
      this.environmentConfig.name || this.environmentConfig.environment;
    document.getElementById('currentApiServer').textContent = 
      this.environmentConfig.apiHostname;
  }

  async checkAPIConnection() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    // Set checking state
    statusIndicator.className = 'status-indicator testing';
    statusText.textContent = 'Checking connection...';
    
    try {
      // Send test request to background script
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'testConnection', hostname: this.environmentConfig.apiHostname },
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
        statusText.textContent = 'Connected';
      } else {
        statusIndicator.className = 'status-indicator error';
        statusText.textContent = 'Connection failed';
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      statusIndicator.className = 'status-indicator error';
      statusText.textContent = 'Unable to test';
    }
  }

  setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', (e) => {
      e.preventDefault();
      this.saveUserPreferences();
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', (e) => {
      e.preventDefault();
      this.resetToDefaults();
    });

    // Form change tracking
    this.setupFormChangeTracking();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          this.saveUserPreferences();
        }
      }
    });
  }

  setupFormChangeTracking() {
    const forms = ['statisticalForm', 'experienceForm'];
    
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
    // No special UI initialization needed for simplified settings
    // Everything is handled by form population
  }

  populateForm() {
    if (!this.currentPreferences) return;

    // Statistical Defaults
    const stats = this.currentPreferences.statisticalDefaults || STATISTICAL_DEFAULTS;
    document.getElementById('defaultPower').value = stats.statistical_power || STATISTICAL_DEFAULTS.statistical_power;
    document.getElementById('defaultSignificance').value = stats.significance_level || STATISTICAL_DEFAULTS.significance_level;
    document.getElementById('defaultVariants').value = stats.variants || STATISTICAL_DEFAULTS.variants;
    
    const mdeTypeRadio = document.querySelector(`input[name="defaultMdeType"][value="${stats.mde_type || STATISTICAL_DEFAULTS.mde_type}"]`);
    if (mdeTypeRadio) {
      mdeTypeRadio.checked = true;
    }

    // User Experience
    const ux = this.currentPreferences.userExperience || DEFAULT_USER_PREFERENCES.userExperience;
    document.getElementById('theme').value = ux.theme || 'light';
    document.getElementById('autoSave').checked = ux.autoSave !== false;
    document.getElementById('clearOnSuccess').checked = ux.clearOnSuccess || false;
    document.getElementById('showTooltips').checked = ux.showTooltips !== false;
    document.getElementById('exportFormat').value = ux.exportFormat || 'json';

    // Mark as clean
    this.markAsClean();
  }

  // Environment-related methods removed since they're now automatic

  async saveUserPreferences() {
    const messagesEl = document.getElementById('messages');
    const saveBtn = document.getElementById('saveBtn');
    const btnText = saveBtn.querySelector('.btn-text');
    const btnSpinner = saveBtn.querySelector('.btn-spinner');
    
    clearMessages(messagesEl);

    try {
      // Show loading state
      saveBtn.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');

      // Collect form data
      const newPreferences = this.collectFormData();
      
      // Save preferences
      await saveUserPreferences(newPreferences);
      this.currentPreferences = newPreferences;
      
      // Update button state
      this.markAsClean();
      
      showMessage(messagesEl, '⚙️ Preferences saved! Your PM workflow is now customized to perfection', 'success');
      
      // Notify other components that preferences changed
      chrome.runtime.sendMessage({ action: 'preferencesChanged', preferences: newPreferences });
      
    } catch (error) {
      console.error('Failed to save preferences:', error);
      showMessage(messagesEl, `Failed to save preferences: ${error.message}`, 'error');
    } finally {
      // Reset loading state
      saveBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  }

  collectFormData() {
    return {
      // Statistical Defaults
      statisticalDefaults: {
        statistical_power: parseFloat(document.getElementById('defaultPower').value),
        significance_level: parseFloat(document.getElementById('defaultSignificance').value),
        variants: parseInt(document.getElementById('defaultVariants').value),
        mde_type: document.querySelector('input[name="defaultMdeType"]:checked').value
      },
      
      // User Experience
      userExperience: {
        theme: document.getElementById('theme').value,
        autoSave: document.getElementById('autoSave').checked,
        clearOnSuccess: document.getElementById('clearOnSuccess').checked,
        showTooltips: document.getElementById('showTooltips').checked,
        exportFormat: document.getElementById('exportFormat').value
      }
    };
  }

  async resetToDefaults() {
    const messagesEl = document.getElementById('messages');
    
    if (!confirm('Are you sure you want to reset all preferences to their default values? This cannot be undone.')) {
      return;
    }

    try {
      this.currentPreferences = DEFAULT_USER_PREFERENCES;
      this.populateForm();
      this.markAsDirty();
      
      showMessage(messagesEl, '🔄 Preferences reset to defaults. Don\'t forget to save your changes!', 'info');
      
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      showMessage(messagesEl, `Failed to reset preferences: ${error.message}`, 'error');
    }
  }

  // testConnection method removed - connection testing is now automatic
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