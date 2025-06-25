// Global namespace for PM Tools
window.PMTools = window.PMTools || {};

// Constants
PMTools.STORAGE_KEYS = {
  API_KEY_GEMINI: 'pm_tools_gemini_key',
  API_KEY_ANTHROPIC: 'pm_tools_anthropic_key',
  SELECTED_MODEL_GEMINI: 'pm_tools_selected_model_gemini',
  SELECTED_MODEL_ANTHROPIC: 'pm_tools_selected_model_anthropic',
  MODEL_CACHE_GEMINI: 'pm_tools_model_cache_gemini',
  MODEL_CACHE_ANTHROPIC: 'pm_tools_model_cache_anthropic',
  PREFERENCES: 'pm_tools_preferences',
  EXPERIMENTS: 'pm_tools_experiments',
  ONBOARDING_COMPLETED: 'pm_tools_onboarding_completed'
};

PMTools.DEFAULTS = {
  STATISTICAL_POWER: 0.8,
  SIGNIFICANCE_LEVEL: 0.05,
  NUM_VARIANTS: 2,
  MDE_VALUES: [0.05, 0.075, 0.1, 0.125, 0.15], // 5%, 7.5%, 10%, 12.5%, 15%
  MODEL_CACHE_TTL: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
};

PMTools.LLM_PROVIDERS = {
  GEMINI: 'gemini',
  ANTHROPIC: 'anthropic'
};

// Utility functions
PMTools.utils = {
  formatNumber(num) {
    if (num == null || isNaN(num)) return '0';
    return Math.round(num).toLocaleString();
  },
  
  formatPercentage(num, decimals = 1) {
    if (num == null || isNaN(num)) return '0.0%';
    return (num * 100).toFixed(decimals) + '%';
  },
  
  formatDuration(days) {
    if (days == null || isNaN(days)) return '0 days';
    
    if (days < 1) {
      const hours = Math.round(days * 24);
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    
    const roundedDays = Math.round(days * 10) / 10;
    return roundedDays === 1 ? '1 day' : `${roundedDays} days`;
  },
  
  // Chrome storage helpers
  async getStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  },
  
  async setStorage(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({[key]: value}, resolve);
    });
  },
  
  async removeStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, resolve);
    });
  },
  
  // Input validation
  validatePositiveNumber(value, fieldName) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      throw new Error(`${fieldName} must be a positive number`);
    }
    return num;
  },
  
  validatePercentage(value, fieldName) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 1) {
      throw new Error(`${fieldName} must be between 0% and 100%`);
    }
    return num;
  },
  
  validateInteger(value, fieldName, min = 1) {
    const num = parseInt(value);
    if (isNaN(num) || num < min) {
      throw new Error(`${fieldName} must be an integer >= ${min}`);
    }
    return num;
  },
  
  // Input sanitization
  sanitizeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  // Format LLM response from markdown-like syntax to HTML
  formatLLMResponse(text) {
    if (!text || typeof text !== 'string') return '';
    
    // First, escape HTML to prevent XSS
    let formatted = this.sanitizeHTML(text);
    
    // PRE-PROCESSING: Fix common LLM response patterns
    
    // 1. Fix incomplete bold markers at the end of lines (e.g., "3/10**")
    formatted = formatted.replace(/([^\*\s]+)\*\*(\s|$)/gm, '**$1**$2');
    
    // 2. Fix headers with trailing bold markers (e.g., "Strengths:**")
    formatted = formatted.replace(/^([^:\n]+):\*\*\s*$/gm, '**$1:**');
    
    // 3. Fix orphaned bold markers on their own line after headers
    formatted = formatted.replace(/^([^:\n]+):\s*\n\*\*\s*$/gm, '**$1:**\n');
    
    // 4. Convert horizontal rules (---) to HTML
    formatted = formatted.replace(/^---+\s*$/gm, '<hr>');
    
    // 5. Fix multi-line bold sections where content starts on the next line
    // Pattern: "Header:**\n\nContent" -> "Header:\n\n**Content**"
    formatted = formatted.replace(/^([^:\n]+):\*\*\s*\n\n([^*\n]+)$/gm, '$1:\n\n**$2**');
    
    // STANDARD MARKDOWN PROCESSING
    
    // Convert headers (###, ####, etc.) - must be done before other replacements
    formatted = formatted.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
      const level = hashes.length;
      return `<h${level}>${content}</h${level}>`;
    });
    
    // Convert bold text - improved to handle edge cases
    // First, handle complete bold patterns
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Then handle italic (single asterisks) - using negative lookbehind/ahead
    formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    
    // Convert `code` to <code>
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Process lists - collect consecutive list items and wrap them
    const lines = formatted.split('\n');
    const processedLines = [];
    let inOrderedList = false;
    let inUnorderedList = false;
    let listItems = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip horizontal rules
      if (line.trim() === '<hr>') {
        // Close any open lists first
        if (inOrderedList) {
          processedLines.push('<ol>' + listItems.join('') + '</ol>');
          listItems = [];
          inOrderedList = false;
        } else if (inUnorderedList) {
          processedLines.push('<ul>' + listItems.join('') + '</ul>');
          listItems = [];
          inUnorderedList = false;
        }
        processedLines.push(line);
        continue;
      }
      
      // Check for numbered list item
      const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (orderedMatch) {
        if (inUnorderedList) {
          processedLines.push('<ul>' + listItems.join('') + '</ul>');
          listItems = [];
          inUnorderedList = false;
        }
        inOrderedList = true;
        listItems.push(`<li>${orderedMatch[2]}</li>`);
        continue;
      }
      
      // Check for bullet list item (-, *, or •)
      const unorderedMatch = line.match(/^[-*•]\s+(.+)$/);
      if (unorderedMatch) {
        if (inOrderedList) {
          processedLines.push('<ol>' + listItems.join('') + '</ol>');
          listItems = [];
          inOrderedList = false;
        }
        inUnorderedList = true;
        listItems.push(`<li>${unorderedMatch[1]}</li>`);
        continue;
      }
      
      // Not a list item - close any open lists
      if (inOrderedList) {
        processedLines.push('<ol>' + listItems.join('') + '</ol>');
        listItems = [];
        inOrderedList = false;
      } else if (inUnorderedList) {
        processedLines.push('<ul>' + listItems.join('') + '</ul>');
        listItems = [];
        inUnorderedList = false;
      }
      
      processedLines.push(line);
    }
    
    // Close any remaining open lists
    if (inOrderedList) {
      processedLines.push('<ol>' + listItems.join('') + '</ol>');
    } else if (inUnorderedList) {
      processedLines.push('<ul>' + listItems.join('') + '</ul>');
    }
    
    formatted = processedLines.join('\n');
    
    // Convert line breaks to paragraphs - but not inside lists or headers
    const blocks = formatted.split(/\n\n+/);
    formatted = blocks.map(block => {
      // Don't wrap if it's already a block element
      if (block.match(/^<(?:h[1-6]|ul|ol|p|hr)\b/)) {
        return block;
      }
      // Replace single line breaks with <br> within paragraphs
      return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    
    return formatted;
  },
  
  sanitizeNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return isNaN(num) || !isFinite(num) ? defaultValue : num;
  },
  
  // UI helpers
  showMessage(element, message, type = 'info') {
    // Sanitize message to prevent XSS
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        element.style.display = 'none';
      }, 3000);
    }
  },
  
  setLoading(button, isLoading) {
    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Calculating...';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  },
  
  // Scroll helpers
  scrollToResults() {
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
      resultsSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      
      // Add highlight effect
      resultsSection.style.border = '2px solid #007cba';
      setTimeout(() => {
        resultsSection.style.border = '';
      }, 2000);
    }
  },
  
  // Export helpers
  exportToCSV(data, filename) {
    const csv = this.convertToCSV(data);
    this.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
  },
  
  exportToJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, filename, 'application/json;charset=utf-8;');
  },
  
  convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    ).join('\n');
    
    return headers + '\n' + rows;
  },
  
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  },
  
  // Debounce function for input handling
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Copy to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  }
};

// Initialize namespace sub-objects
PMTools.statistics = PMTools.statistics || {};
PMTools.ui = PMTools.ui || {};
PMTools.llm = PMTools.llm || {};
PMTools.storage = PMTools.storage || {};

console.log('PM Tools shared utilities loaded');