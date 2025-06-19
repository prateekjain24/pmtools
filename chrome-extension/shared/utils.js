// Utility functions for PM Tools Chrome Extension

import { STORAGE_KEYS, STATISTICAL_DEFAULTS, DEFAULT_USER_PREFERENCES, getCurrentEnvironment } from './constants.js';

// Chrome Storage Utilities
export async function getStorageData(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

export async function setStorageData(key, data) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [key]: data }, () => {
      resolve();
    });
  });
}

export async function removeStorageData(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.remove([key], () => {
      resolve();
    });
  });
}

// Form Utilities
export function saveFormData(formId, data) {
  const formDataKey = `${STORAGE_KEYS.formData}_${formId}`;
  return setStorageData(formDataKey, {
    ...data,
    timestamp: Date.now()
  });
}

export async function loadFormData(formId) {
  const formDataKey = `${STORAGE_KEYS.formData}_${formId}`;
  const data = await getStorageData(formDataKey);
  
  // Return data if it's less than 24 hours old
  if (data && data.timestamp && (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000) {
    return data;
  }
  
  return null;
}

// User Preferences Utilities (New simplified approach)
export async function getUserPreferences() {
  let preferences = await getStorageData(STORAGE_KEYS.userPreferences);
  
  // Migration: If no new preferences, try to migrate from old config
  if (!preferences) {
    preferences = await migrateFromOldConfig();
  }
  
  // Ensure we have complete preferences with defaults
  return {
    statisticalDefaults: {
      ...DEFAULT_USER_PREFERENCES.statisticalDefaults,
      ...(preferences?.statisticalDefaults || {})
    },
    userExperience: {
      ...DEFAULT_USER_PREFERENCES.userExperience,
      ...(preferences?.userExperience || {})
    }
  };
}

export async function saveUserPreferences(preferences) {
  return setStorageData(STORAGE_KEYS.userPreferences, preferences);
}

// Migration function to convert old config to new preferences
async function migrateFromOldConfig() {
  const oldConfig = await getStorageData(STORAGE_KEYS.config);
  if (!oldConfig) return null;
  
  console.log('🔄 Migrating old configuration to new user preferences format');
  
  const newPreferences = {
    statisticalDefaults: {
      statistical_power: oldConfig.statisticalDefaults?.statistical_power || STATISTICAL_DEFAULTS.statistical_power,
      significance_level: oldConfig.statisticalDefaults?.significance_level || STATISTICAL_DEFAULTS.significance_level,
      variants: oldConfig.statisticalDefaults?.variants || STATISTICAL_DEFAULTS.variants,
      mde_type: oldConfig.statisticalDefaults?.mde_type || STATISTICAL_DEFAULTS.mde_type
    },
    userExperience: {
      theme: oldConfig.theme || 'light',
      autoSave: oldConfig.autoSave !== false, // Default to true
      clearOnSuccess: oldConfig.clearOnSuccess || false,
      showTooltips: oldConfig.showTooltips !== false, // Default to true
      exportFormat: oldConfig.exportFormat || 'json'
    }
  };
  
  // Save migrated preferences and remove old config
  await saveUserPreferences(newPreferences);
  console.log('✅ Configuration migrated successfully');
  
  return newPreferences;
}

// Legacy support - deprecated but maintained for backward compatibility
export async function getConfiguration() {
  console.log('⚠️ getConfiguration() is deprecated - use getUserPreferences() instead');
  const preferences = await getUserPreferences();
  const envConfig = getCurrentEnvironment();
  
  // Return old format for backward compatibility
  return {
    apiHostname: envConfig.apiHostname, // Now from environment
    timeout: envConfig.timeout, // Now from environment
    retryAttempts: envConfig.retryAttempts, // Now from environment
    retryDelay: envConfig.retryDelay, // Now from environment
    statisticalDefaults: preferences.statisticalDefaults,
    theme: preferences.userExperience.theme,
    autoSave: preferences.userExperience.autoSave,
    clearOnSuccess: preferences.userExperience.clearOnSuccess,
    showTooltips: preferences.userExperience.showTooltips,
    exportFormat: preferences.userExperience.exportFormat
  };
}

export async function saveConfiguration(config) {
  console.log('⚠️ saveConfiguration() is deprecated - use saveUserPreferences() instead');
  
  // Convert old format to new preferences format
  const preferences = {
    statisticalDefaults: config.statisticalDefaults || STATISTICAL_DEFAULTS,
    userExperience: {
      theme: config.theme || 'light',
      autoSave: config.autoSave !== false,
      clearOnSuccess: config.clearOnSuccess || false,
      showTooltips: config.showTooltips !== false,
      exportFormat: config.exportFormat || 'json'
    }
  };
  
  return saveUserPreferences(preferences);
}

// Validation Utilities
export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    throw new Error(`${fieldName} is required`);
  }
}

export function validateNumber(value, fieldName, min = null, max = null) {
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (min !== null && num < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }
  if (max !== null && num > max) {
    throw new Error(`${fieldName} must be no more than ${max}`);
  }
  return num;
}

export function validateInteger(value, fieldName, min = null, max = null) {
  const num = parseInt(value);
  if (isNaN(num) || !Number.isInteger(num)) {
    throw new Error(`${fieldName} must be a valid integer`);
  }
  if (min !== null && num < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }
  if (max !== null && num > max) {
    throw new Error(`${fieldName} must be no more than ${max}`);
  }
  return num;
}

export function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// UI Utilities
export function showMessage(element, message, type = 'info', duration = 5000) {
  element.innerHTML = `
    <div class="message message-${type}">
      <span class="message-text">${message}</span>
      <button class="message-close" onclick="this.parentElement.style.display='none'">×</button>
    </div>
  `;
  
  if (duration > 0) {
    setTimeout(() => {
      if (element.querySelector('.message')) {
        element.querySelector('.message').style.display = 'none';
      }
    }, duration);
  }
}

export function clearMessages(element) {
  element.innerHTML = '';
}

export function formatNumber(num, decimals = 2) {
  if (typeof num !== 'number' || isNaN(num)) return 'N/A';
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
}

export function formatPercentage(num, decimals = 1) {
  if (typeof num !== 'number' || isNaN(num)) return 'N/A';
  return `${(num * 100).toFixed(decimals)}%`;
}

// Export Utilities
export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(data, filename) {
  // Convert object to CSV format
  let csv = '';
  
  if (Array.isArray(data)) {
    // Array of objects
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      csv = headers.join(',') + '\n';
      csv += data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      ).join('\n');
    }
  } else {
    // Single object - convert to key-value pairs
    csv = 'Key,Value\n';
    csv += Object.entries(data).map(([key, value]) => 
      `"${key}","${typeof value === 'object' ? JSON.stringify(value) : value}"`
    ).join('\n');
  }
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Date Utilities
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Debounce utility for search/input
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Convert markdown-style text to HTML for proper rendering
export function formatTextToHTML(text) {
  if (!text) return '';
  
  try {
    // Debug logging for markdown rendering issues
    console.log('📝 formatTextToHTML input:', text.substring(0, 200) + '...');
    
    let html = text;
    
    // Step 1: Process headers first (before any other formatting)
    html = html
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Step 2: Enhanced AI follow-up questions detection
    // Look for patterns like "**Category:** content **Next Category:** content"
    const aiQuestionPattern = /\*\*([^*]+)\*\*:\s*([^*]*?)(?=\*\*[^*]+\*\*:|$)/g;
    const questionMatches = [...text.matchAll(aiQuestionPattern)];
    
    console.log('🔍 AI question matches found:', questionMatches.length);
    
    if (questionMatches.length > 1) {
      // This looks like AI-generated follow-up questions
      console.log('🤖 Detected AI follow-up questions pattern');
      
      let questionsHtml = '<div class="ai-questions"><h4>🤔 Questions to Consider:</h4><ul>';
      questionMatches.forEach(match => {
        const category = match[1].trim();
        const content = match[2].trim();
        questionsHtml += `<li><strong>${escapeHtml(category)}:</strong> ${escapeHtml(content)}</li>`;
      });
      questionsHtml += '</ul></div>';
      
      return questionsHtml;
    }
    
    // Step 3: Split into blocks by double newlines to handle paragraphs
    const blocks = html.split(/\n\s*\n/);
    const processedBlocks = blocks.map(block => {
      block = block.trim();
      if (!block) return '';
      
      // If it's already a header, return as-is
      if (block.startsWith('<h1>') || block.startsWith('<h2>') || block.startsWith('<h3>')) {
        return block;
      }
      
      // Handle single **bold:** pattern for recommendations or key points
      if (block.includes('**') && block.includes(':')) {
        const singlePattern = /\*\*([^*]+)\*\*:\s*(.+)/;
        const match = block.match(singlePattern);
        if (match) {
          const label = match[1].trim();
          const content = match[2].trim();
          return `<div class="key-point"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(content)}</div>`;
        }
      }
      
      // Process bold and italic text for this block
      block = block
        .replace(/\*\*([^*\n]+(?:\*(?!\*)[^*\n]*)*)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
      
      // Handle traditional lists (numbered or bulleted)
      if (block.includes('\n') && /^[-•\d+\.]/.test(block)) {
        let listHtml = block
          .replace(/^(\d+\.)\s+(.+)$/gm, '<li>$2</li>')
          .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
          .replace(/\n/g, '');
        
        // Wrap in ul or ol tags if we have list items
        if (listHtml.includes('<li>')) {
          const isNumbered = /^\d+\./.test(block);
          const tag = isNumbered ? 'ol' : 'ul';
          listHtml = `<${tag}>${listHtml}</${tag}>`;
        }
        return listHtml;
      }
      
      // Regular paragraph - convert single newlines to <br>
      const paragraphContent = block.replace(/\n/g, '<br>');
      return `<p>${paragraphContent}</p>`;
    });
    
    // Step 4: Join all blocks and clean up
    let html_result = processedBlocks.filter(block => block).join('\n');
    
    // Step 5: Clean up any remaining issues
    html_result = html_result
      .replace(/<p><\/p>/g, '')
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/\n+/g, '\n')
      .trim();
    
    console.log('✅ formatTextToHTML output preview:', html_result.substring(0, 200) + '...');
    
    return html_result;
    
  } catch (error) {
    console.error('❌ formatTextToHTML error:', error);
    // Fallback to escaped plain text with a friendly message
    return `<div class="formatting-fallback">
      <p><em>🤖 Our text formatting had a hiccup, but here's your content:</em></p>
      <div style="white-space: pre-wrap; font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 4px;">
        ${escapeHtml(text)}
      </div>
    </div>`;
  }
}

// Escape HTML to prevent XSS while preserving intentional formatting
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Enhanced Clickable Tooltip System
export class TooltipManager {
  constructor() {
    this.activeTooltip = null;
    this.hideTimeout = null;
    this.init();
  }

  init() {
    // Add global event listeners
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    window.addEventListener('scroll', this.handleScroll.bind(this));

    // Initialize all tooltip triggers
    this.initializeTooltips();
  }

  initializeTooltips() {
    const triggers = document.querySelectorAll('.tooltip-trigger');
    triggers.forEach(trigger => {
      trigger.addEventListener('click', this.handleTriggerClick.bind(this));
      trigger.addEventListener('keydown', this.handleTriggerKeyDown.bind(this));
    });
  }

  handleTriggerClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const trigger = event.currentTarget;
    const tooltipText = trigger.dataset.tooltip;
    
    if (!tooltipText) return;

    // Close existing tooltip if clicking same trigger
    if (this.activeTooltip && this.activeTooltip.trigger === trigger) {
      this.hideTooltip();
      return;
    }

    // Close any existing tooltip first
    this.hideTooltip();

    // Show new tooltip
    this.showTooltip(trigger, tooltipText);
  }

  handleTriggerKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleTriggerClick(event);
    }
  }

  showTooltip(trigger, text) {
    // Create tooltip element
    const tooltip = this.createTooltipElement(text);
    document.body.appendChild(tooltip);

    // Position tooltip
    this.positionTooltip(trigger, tooltip);

    // Store reference
    this.activeTooltip = { trigger, element: tooltip };

    // Add event listeners for tooltip
    tooltip.addEventListener('mouseenter', this.handleTooltipMouseEnter.bind(this));
    tooltip.addEventListener('mouseleave', this.handleTooltipMouseLeave.bind(this));

    // Show with animation
    requestAnimationFrame(() => {
      tooltip.classList.add('tooltip-visible');
    });

    // Add ARIA attributes
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-describedby', tooltip.id);
  }

  createTooltipElement(text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-bubble';
    tooltip.id = `tooltip-${Date.now()}`;
    tooltip.setAttribute('role', 'tooltip');
    
    // Create content with arrow
    tooltip.innerHTML = `
      <div class="tooltip-arrow"></div>
      <div class="tooltip-content">${escapeHtml(text)}</div>
    `;

    return tooltip;
  }

  positionTooltip(trigger, tooltip) {
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;

    // Calculate available space in each direction
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    let position = 'bottom'; // default
    let top, left;

    // Determine best position based on available space
    if (spaceBelow >= tooltipRect.height + padding) {
      position = 'bottom';
      top = triggerRect.bottom + padding;
    } else if (spaceAbove >= tooltipRect.height + padding) {
      position = 'top';
      top = triggerRect.top - tooltipRect.height - padding;
    } else if (spaceRight >= tooltipRect.width + padding) {
      position = 'right';
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
    } else if (spaceLeft >= tooltipRect.width + padding) {
      position = 'left';
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
    } else {
      // Fallback to bottom with viewport constraints
      position = 'bottom';
      top = Math.min(triggerRect.bottom + padding, viewportHeight - tooltipRect.height - padding);
    }

    // Calculate horizontal position
    if (position === 'top' || position === 'bottom') {
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      // Keep tooltip within viewport horizontally
      left = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding));
    } else if (position === 'right') {
      left = triggerRect.right + padding;
    } else if (position === 'left') {
      left = triggerRect.left - tooltipRect.width - padding;
    }

    // Keep tooltip within viewport vertically
    top = Math.max(padding, Math.min(top, viewportHeight - tooltipRect.height - padding));

    // Apply position
    tooltip.style.position = 'fixed';
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.setAttribute('data-position', position);
  }

  handleTooltipMouseEnter() {
    // Clear any pending hide timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  handleTooltipMouseLeave() {
    // Hide tooltip after short delay
    this.hideTimeout = setTimeout(() => {
      this.hideTooltip();
    }, 200);
  }

  handleDocumentClick(event) {
    // Close tooltip if clicking outside
    if (this.activeTooltip && 
        !this.activeTooltip.element.contains(event.target) &&
        !this.activeTooltip.trigger.contains(event.target)) {
      this.hideTooltip();
    }
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' && this.activeTooltip) {
      this.hideTooltip();
      this.activeTooltip.trigger.focus(); // Return focus to trigger
    }
  }

  handleWindowResize() {
    if (this.activeTooltip) {
      // Reposition tooltip on resize
      this.positionTooltip(this.activeTooltip.trigger, this.activeTooltip.element);
    }
  }

  handleScroll() {
    // Hide tooltip on scroll for better UX
    if (this.activeTooltip) {
      this.hideTooltip();
    }
  }

  hideTooltip() {
    if (!this.activeTooltip) return;

    const { trigger, element } = this.activeTooltip;

    // Remove ARIA attributes
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-describedby');

    // Hide with animation
    element.classList.add('tooltip-hiding');
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 200); // Match CSS transition duration

    // Clear references
    this.activeTooltip = null;
    
    // Clear any pending timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  // Reinitialize tooltips (useful when DOM changes)
  refresh() {
    this.initializeTooltips();
  }

  // Clean up
  destroy() {
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('resize', this.handleWindowResize.bind(this));
    window.removeEventListener('scroll', this.handleScroll.bind(this));
    this.hideTooltip();
  }
}

// Global tooltip manager instance
let tooltipManager = null;

export function initializeTooltips() {
  if (!tooltipManager) {
    tooltipManager = new TooltipManager();
  }
  return tooltipManager;
}

export function refreshTooltips() {
  if (tooltipManager) {
    tooltipManager.refresh();
  }
}