// Utility functions for PM Tools Chrome Extension

import { STORAGE_KEYS, STATISTICAL_DEFAULTS } from './constants.js';

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

// Configuration Utilities
export async function getConfiguration() {
  const config = await getStorageData(STORAGE_KEYS.config);
  return {
    apiHostname: config?.apiHostname || 'http://localhost:8000',
    timeout: config?.timeout || 30000,
    retryAttempts: config?.retryAttempts || 3,
    retryDelay: config?.retryDelay || 1000,
    statisticalDefaults: config?.statisticalDefaults || STATISTICAL_DEFAULTS,
    theme: config?.theme || 'light'
  };
}

export async function saveConfiguration(config) {
  return setStorageData(STORAGE_KEYS.config, config);
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
    let html = text;
    
    // Step 1: Process headers first (before any other formatting)
    html = html
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Step 2: Process bold and italic text
    html = html
      .replace(/\*\*([^*\n]+(?:\*(?!\*)[^*\n]*)*)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    
    // Step 3: Split into blocks by double newlines to handle paragraphs
    const blocks = html.split(/\n\s*\n/);
    const processedBlocks = blocks.map(block => {
      block = block.trim();
      if (!block) return '';
      
      // If it's already a header, return as-is
      if (block.startsWith('<h1>') || block.startsWith('<h2>') || block.startsWith('<h3>')) {
        return block;
      }
      
      // Handle lists
      if (block.includes('\n') && /^[-•]|\d+\./.test(block)) {
        let listHtml = block
          .replace(/^(\d+\.)\s+(.+)$/gm, '<li>$2</li>')
          .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
          .replace(/\n/g, '\n');
        
        // Wrap in ul tags if we have list items
        if (listHtml.includes('<li>')) {
          listHtml = '<ul>' + listHtml.replace(/\n/g, '') + '</ul>';
        }
        return listHtml;
      }
      
      // Regular paragraph - convert single newlines to <br>
      const paragraphContent = block.replace(/\n/g, '<br>');
      return `<p>${paragraphContent}</p>`;
    });
    
    // Step 4: Join all blocks and clean up
    html = processedBlocks.filter(block => block).join('\n');
    
    // Step 5: Clean up any remaining issues
    html = html
      .replace(/<p><\/p>/g, '')
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/\n+/g, '\n')
      .trim();
    
    return html;
    
  } catch (error) {
    console.error('formatTextToHTML error:', error);
    // Fallback to escaped plain text
    return escapeHtml(text);
  }
}

// Escape HTML to prevent XSS while preserving intentional formatting
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}