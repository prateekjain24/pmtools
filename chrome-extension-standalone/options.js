// Options page functionality for PM Tools Chrome Extension

document.addEventListener('DOMContentLoaded', async function() {
  console.log('PM Tools options page loaded');
  
  // Initialize the options page
  await initializeOptions();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load current settings
  await loadSettings();
});

async function initializeOptions() {
  // Check current API key status
  await updateApiKeyStatus();
}

function setupEventListeners() {
  // API Key Management
  setupApiKeyEvents('gemini');
  setupApiKeyEvents('anthropic');
  
  // Password toggles
  document.getElementById('geminiToggle').addEventListener('click', () => togglePasswordVisibility('geminiKey', 'geminiToggle'));
  document.getElementById('anthropicToggle').addEventListener('click', () => togglePasswordVisibility('anthropicKey', 'anthropicToggle'));
  
  // Settings
  document.getElementById('preferredProvider').addEventListener('change', saveGeneralSettings);
  document.getElementById('enableFallback').addEventListener('change', saveGeneralSettings);
  document.getElementById('autoSaveForm').addEventListener('change', saveGeneralSettings);
  document.getElementById('showTooltips').addEventListener('change', saveGeneralSettings);
  document.getElementById('defaultPower').addEventListener('change', saveGeneralSettings);
  document.getElementById('defaultAlpha').addEventListener('change', saveGeneralSettings);
  
  // Data management
  document.getElementById('exportSettings').addEventListener('click', exportSettings);
  document.getElementById('importSettings').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', importSettings);
  document.getElementById('clearData').addEventListener('click', clearAllData);
}

function setupApiKeyEvents(provider) {
  const saveBtn = document.getElementById(`${provider}Save`);
  const testBtn = document.getElementById(`${provider}Test`);
  const removeBtn = document.getElementById(`${provider}Remove`);
  const input = document.getElementById(`${provider}Key`);
  const modelSelect = document.getElementById(`${provider}Model`);
  const refreshModelsBtn = document.getElementById(`${provider}RefreshModels`);
  
  saveBtn.addEventListener('click', () => saveApiKey(provider));
  testBtn.addEventListener('click', () => testApiKey(provider));
  removeBtn.addEventListener('click', () => removeApiKey(provider));
  
  // Model selection events
  modelSelect.addEventListener('change', () => saveSelectedModel(provider));
  refreshModelsBtn.addEventListener('click', () => refreshModels(provider));
  
  // Enable save button when key is entered
  input.addEventListener('input', () => {
    const hasKey = input.value.trim().length > 0;
    saveBtn.disabled = !hasKey;
  });
}

async function saveApiKey(provider) {
  const input = document.getElementById(`${provider}Key`);
  const saveBtn = document.getElementById(`${provider}Save`);
  const message = document.getElementById(`${provider}Message`);
  
  const apiKey = input.value.trim();
  
  if (!apiKey) {
    showMessage(message, 'Please enter an API key', 'error');
    return;
  }
  
  try {
    setLoading(saveBtn, true);
    
    // Save the key
    await PMTools.llm.saveApiKey(provider, apiKey);
    
    // Update status
    await updateApiKeyStatus();
    
    // Clear input
    input.value = '';
    
    // Load models for this provider
    await loadModels(provider);
    
    showMessage(message, '✅ API key saved successfully!', 'success');
    
  } catch (error) {
    console.error('Error saving API key:', error);
    showMessage(message, `❌ Error saving key: ${error.message}`, 'error');
  } finally {
    setLoading(saveBtn, false);
  }
}

async function testApiKey(provider) {
  const input = document.getElementById(`${provider}Key`);
  const testBtn = document.getElementById(`${provider}Test`);
  const message = document.getElementById(`${provider}Message`);
  
  let apiKey = input.value.trim();
  
  // If no key in input, try to get saved key
  if (!apiKey) {
    apiKey = await PMTools.llm.getApiKey(provider);
    if (!apiKey) {
      showMessage(message, 'No API key to test. Please enter a key first.', 'warning');
      return;
    }
  }
  
  try {
    setLoading(testBtn, true);
    showMessage(message, '🧪 Testing connection...', 'info');
    
    const isValid = await PMTools.llm.testApiKey(provider, apiKey);
    
    if (isValid) {
      showMessage(message, '✅ Connection successful! API key is working.', 'success');
    } else {
      showMessage(message, '❌ Connection failed. Please check your API key.', 'error');
    }
    
  } catch (error) {
    console.error('Error testing API key:', error);
    showMessage(message, `❌ Test failed: ${error.message}`, 'error');
  } finally {
    setLoading(testBtn, false);
  }
}

async function removeApiKey(provider) {
  const removeBtn = document.getElementById(`${provider}Remove`);
  const message = document.getElementById(`${provider}Message`);
  
  if (!confirm(`Are you sure you want to remove your ${provider} API key?`)) {
    return;
  }
  
  try {
    setLoading(removeBtn, true);
    
    // Remove the key
    const storageKey = provider === 'gemini' 
      ? PMTools.STORAGE_KEYS.API_KEY_GEMINI 
      : PMTools.STORAGE_KEYS.API_KEY_ANTHROPIC;
    
    await PMTools.utils.removeStorage(storageKey);
    
    // Update status
    await updateApiKeyStatus();
    
    showMessage(message, '✅ API key removed successfully!', 'success');
    
  } catch (error) {
    console.error('Error removing API key:', error);
    showMessage(message, `❌ Error removing key: ${error.message}`, 'error');
  } finally {
    setLoading(removeBtn, false);
  }
}

async function updateApiKeyStatus() {
  const status = await PMTools.llm.getApiKeyStatus();
  
  // Update Gemini status
  updateProviderStatus('gemini', status.hasGemini);
  
  // Update Anthropic status
  updateProviderStatus('anthropic', status.hasAnthropic);
  
  // Load models if API keys are configured
  if (status.hasGemini) {
    await loadModels('gemini');
  }
  if (status.hasAnthropic) {
    await loadModels('anthropic');
  }
}

function updateProviderStatus(provider, hasKey) {
  const indicator = document.getElementById(`${provider}Indicator`);
  const statusText = document.getElementById(`${provider}StatusText`);
  const removeBtn = document.getElementById(`${provider}Remove`);
  const saveBtn = document.getElementById(`${provider}Save`);
  const modelGroup = document.getElementById(`${provider}ModelGroup`);
  
  if (hasKey) {
    indicator.textContent = '✅';
    statusText.textContent = 'Configured';
    statusText.style.color = 'var(--success-color)';
    removeBtn.style.display = 'inline-flex';
    saveBtn.disabled = true;
    modelGroup.style.display = 'block';
  } else {
    indicator.textContent = '❌';
    statusText.textContent = 'Not configured';
    statusText.style.color = 'var(--text-muted)';
    removeBtn.style.display = 'none';
    saveBtn.disabled = false;
    modelGroup.style.display = 'none';
  }
}

function togglePasswordVisibility(inputId, toggleId) {
  const input = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);
  
  if (input.type === 'password') {
    input.type = 'text';
    toggle.textContent = '🙈';
    toggle.title = 'Hide';
  } else {
    input.type = 'password';
    toggle.textContent = '👁️';
    toggle.title = 'Show';
  }
}

async function loadSettings() {
  const preferences = await PMTools.utils.getStorage(PMTools.STORAGE_KEYS.PREFERENCES) || {};
  
  // AI Preferences
  if (preferences.preferredProvider) {
    document.getElementById('preferredProvider').value = preferences.preferredProvider;
  }
  
  if (preferences.enableFallback !== undefined) {
    document.getElementById('enableFallback').checked = preferences.enableFallback;
  }
  
  // General Settings
  if (preferences.autoSaveForm !== undefined) {
    document.getElementById('autoSaveForm').checked = preferences.autoSaveForm;
  }
  
  if (preferences.showTooltips !== undefined) {
    document.getElementById('showTooltips').checked = preferences.showTooltips;
  }
  
  if (preferences.defaultPower) {
    document.getElementById('defaultPower').value = preferences.defaultPower;
  }
  
  if (preferences.defaultAlpha) {
    document.getElementById('defaultAlpha').value = preferences.defaultAlpha;
  }
}

async function saveGeneralSettings() {
  const preferences = await PMTools.utils.getStorage(PMTools.STORAGE_KEYS.PREFERENCES) || {};
  
  // Update preferences
  preferences.preferredProvider = document.getElementById('preferredProvider').value;
  preferences.enableFallback = document.getElementById('enableFallback').checked;
  preferences.autoSaveForm = document.getElementById('autoSaveForm').checked;
  preferences.showTooltips = document.getElementById('showTooltips').checked;
  preferences.defaultPower = parseInt(document.getElementById('defaultPower').value);
  preferences.defaultAlpha = parseFloat(document.getElementById('defaultAlpha').value);
  
  // Save to storage
  await PMTools.utils.setStorage(PMTools.STORAGE_KEYS.PREFERENCES, preferences);
  
  console.log('General settings saved');
}

async function exportSettings() {
  try {
    const data = {
      preferences: await PMTools.utils.getStorage(PMTools.STORAGE_KEYS.PREFERENCES),
      experiments: await PMTools.utils.getStorage(PMTools.STORAGE_KEYS.EXPERIMENTS),
      onboardingCompleted: await PMTools.utils.getStorage(PMTools.STORAGE_KEYS.ONBOARDING_COMPLETED),
      version: '1.0.0',
      exportDate: new Date().toISOString()
    };
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `pm-tools-settings-${timestamp}.json`;
    
    PMTools.utils.exportToJSON(data, filename);
    
    // Show success message
    const message = document.createElement('div');
    message.className = 'message success';
    message.textContent = '✅ Settings exported successfully!';
    document.querySelector('#exportSettings').parentNode.appendChild(message);
    
    setTimeout(() => message.remove(), 3000);
    
  } catch (error) {
    console.error('Error exporting settings:', error);
    alert('Failed to export settings: ' + error.message);
  }
}

async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validate data structure
    if (!data.version || !data.exportDate) {
      throw new Error('Invalid settings file format');
    }
    
    // Import preferences
    if (data.preferences) {
      await PMTools.utils.setStorage(PMTools.STORAGE_KEYS.PREFERENCES, data.preferences);
    }
    
    // Import experiments
    if (data.experiments) {
      await PMTools.utils.setStorage(PMTools.STORAGE_KEYS.EXPERIMENTS, data.experiments);
    }
    
    // Import onboarding status
    if (data.onboardingCompleted !== undefined) {
      await PMTools.utils.setStorage(PMTools.STORAGE_KEYS.ONBOARDING_COMPLETED, data.onboardingCompleted);
    }
    
    // Reload settings
    await loadSettings();
    await updateApiKeyStatus();
    
    // Show success message
    const message = document.createElement('div');
    message.className = 'message success';
    message.textContent = '✅ Settings imported successfully!';
    document.querySelector('#importSettings').parentNode.appendChild(message);
    
    setTimeout(() => message.remove(), 3000);
    
  } catch (error) {
    console.error('Error importing settings:', error);
    alert('Failed to import settings: ' + error.message);
  } finally {
    event.target.value = ''; // Clear file input
  }
}

async function clearAllData() {
  const confirmText = 'DELETE';
  const userInput = prompt(
    `⚠️ This will permanently delete ALL your PM Tools data including:\n\n` +
    `• API keys\n` +
    `• Saved preferences\n` +
    `• Form data\n` +
    `• Experiment history\n\n` +
    `This action CANNOT be undone!\n\n` +
    `Type "${confirmText}" to confirm:`
  );
  
  if (userInput !== confirmText) {
    return;
  }
  
  try {
    // Clear all storage keys
    await Promise.all([
      PMTools.utils.removeStorage(PMTools.STORAGE_KEYS.API_KEY_GEMINI),
      PMTools.utils.removeStorage(PMTools.STORAGE_KEYS.API_KEY_ANTHROPIC),
      PMTools.utils.removeStorage(PMTools.STORAGE_KEYS.SELECTED_MODEL_GEMINI),
      PMTools.utils.removeStorage(PMTools.STORAGE_KEYS.SELECTED_MODEL_ANTHROPIC),
      PMTools.utils.removeStorage(PMTools.STORAGE_KEYS.MODEL_CACHE_GEMINI),
      PMTools.utils.removeStorage(PMTools.STORAGE_KEYS.MODEL_CACHE_ANTHROPIC),
      PMTools.utils.removeStorage(PMTools.STORAGE_KEYS.PREFERENCES),
      PMTools.utils.removeStorage(PMTools.STORAGE_KEYS.EXPERIMENTS),
      PMTools.utils.removeStorage(PMTools.STORAGE_KEYS.ONBOARDING_COMPLETED)
    ]);
    
    // Reset UI
    await loadSettings();
    await updateApiKeyStatus();
    
    // Clear input fields
    document.getElementById('geminiKey').value = '';
    document.getElementById('anthropicKey').value = '';
    
    // Show success message
    const message = document.createElement('div');
    message.className = 'message success';
    message.textContent = '✅ All data cleared successfully!';
    document.querySelector('#clearData').parentNode.appendChild(message);
    
    setTimeout(() => message.remove(), 3000);
    
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('Failed to clear data: ' + error.message);
  }
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
  element.style.display = 'block';
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }
}

function setLoading(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.innerHTML = '<span class="spinner"></span> Loading...';
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

async function loadModels(provider) {
  const modelSelect = document.getElementById(`${provider}Model`);
  const refreshBtn = document.getElementById(`${provider}RefreshModels`);
  
  try {
    modelSelect.disabled = true;
    refreshBtn.disabled = true;
    modelSelect.innerHTML = '<option value="">Loading models...</option>';
    
    // Get available models
    const models = await PMTools.llm.getAvailableModels(provider);
    
    if (!models || models.length === 0) {
      modelSelect.innerHTML = '<option value="">No models available</option>';
      return;
    }
    
    // Get currently selected model
    const selectedModel = await PMTools.llm.getSelectedModel(provider);
    
    // Populate dropdown
    modelSelect.innerHTML = models.map(model => `
      <option value="${model.id}" ${model.id === selectedModel ? 'selected' : ''}>
        ${model.displayName} ${model.description ? `- ${model.description}` : ''}
      </option>
    `).join('');
    
    modelSelect.disabled = false;
    
  } catch (error) {
    console.error(`Error loading ${provider} models:`, error);
    modelSelect.innerHTML = '<option value="">Error loading models</option>';
  } finally {
    refreshBtn.disabled = false;
  }
}

async function refreshModels(provider) {
  const message = document.getElementById(`${provider}Message`);
  
  try {
    // Clear model cache
    const cacheKey = provider === 'gemini' 
      ? PMTools.STORAGE_KEYS.MODEL_CACHE_GEMINI 
      : PMTools.STORAGE_KEYS.MODEL_CACHE_ANTHROPIC;
    
    await PMTools.utils.removeStorage(cacheKey);
    
    // Reload models
    await loadModels(provider);
    
    showMessage(message, '✅ Models refreshed successfully!', 'success');
    
  } catch (error) {
    console.error(`Error refreshing ${provider} models:`, error);
    showMessage(message, `❌ Error refreshing models: ${error.message}`, 'error');
  }
}

async function saveSelectedModel(provider) {
  const modelSelect = document.getElementById(`${provider}Model`);
  const message = document.getElementById(`${provider}Message`);
  
  const selectedModel = modelSelect.value;
  if (!selectedModel) return;
  
  try {
    await PMTools.llm.saveSelectedModel(provider, selectedModel);
    showMessage(message, `✅ Model updated to ${modelSelect.options[modelSelect.selectedIndex].text}`, 'success');
  } catch (error) {
    console.error(`Error saving ${provider} model:`, error);
    showMessage(message, `❌ Error saving model: ${error.message}`, 'error');
  }
}

console.log('PM Tools options script loaded');