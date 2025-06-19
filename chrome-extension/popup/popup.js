// PM Tools Chrome Extension Popup JavaScript

import { getAPIClient, APIError } from '../shared/api-client.js';
import { 
  showMessage, 
  clearMessages, 
  formatNumber, 
  formatPercentage, 
  downloadJSON, 
  downloadCSV,
  saveFormData,
  loadFormData,
  getConfiguration,
  validateRequired,
  validateNumber,
  validateInteger,
  formatTextToHTML,
  initializeTooltips,
  refreshTooltips
} from '../shared/utils.js';

class PopupManager {
  constructor() {
    this.apiClient = getAPIClient();
    this.currentTab = 'validate';
    this.currentResults = null;
    this.variantCount = 2;
    
    this.init();
  }

  async init() {
    // Load configuration
    await this.loadConfiguration();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize UI
    this.initializeUI();
    
    // Initialize enhanced tooltips
    initializeTooltips();
    
    // Check API connection
    this.checkAPIConnection();
    
    // Load saved form data
    this.loadSavedFormData();
  }

  async loadConfiguration() {
    try {
      const config = await getConfiguration();
      this.apiClient.updateConfig(config);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Header actions
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('refreshBtn').addEventListener('click', (e) => {
      e.preventDefault();
      this.checkAPIConnection();
    });

    // MDE type toggle
    document.querySelectorAll('input[name="mdeType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.toggleMDEType(e.target.value);
      });
    });

    // Advanced options toggle
    document.getElementById('advancedToggle').addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleAdvancedOptions();
    });

    // Form submissions
    document.getElementById('validateForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleValidateSubmit();
    });

    document.getElementById('analyzeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAnalyzeSubmit();
    });

    // Form resets
    document.getElementById('validateReset').addEventListener('click', (e) => {
      e.preventDefault();
      this.resetValidateForm();
    });

    document.getElementById('analyzeReset').addEventListener('click', (e) => {
      e.preventDefault();
      this.resetAnalyzeForm();
    });

    // Variant management
    document.getElementById('addVariant').addEventListener('click', (e) => {
      e.preventDefault();
      this.addVariant();
    });

    document.getElementById('removeVariant').addEventListener('click', (e) => {
      e.preventDefault();
      this.removeVariant();
    });

    // Export buttons
    document.getElementById('exportValidateJson').addEventListener('click', () => {
      this.exportResults('validate', 'json');
    });

    document.getElementById('exportValidateCsv').addEventListener('click', () => {
      this.exportResults('validate', 'csv');
    });

    document.getElementById('exportAnalyzeJson').addEventListener('click', () => {
      this.exportResults('analyze', 'json');
    });

    document.getElementById('exportAnalyzeCsv').addEventListener('click', () => {
      this.exportResults('analyze', 'csv');
    });

    // Auto-save form data
    this.setupAutoSave();
    
    // Scroll to top buttons
    document.querySelectorAll('.scroll-to-top').forEach(button => {
      button.addEventListener('click', () => {
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  initializeUI() {
    // Set default values
    this.setDefaultValues();
    
    // Initialize collapsible sections
    this.initCollapsible();
    
    // Set initial tab
    this.switchTab(this.currentTab);
  }

  setDefaultValues() {
    // Set statistical defaults
    document.getElementById('power').value = '0.80';
    document.getElementById('significance').value = '0.05';
    document.getElementById('variants').value = '2';
    
    // Set MDE type
    document.querySelector('input[name="mdeType"][value="relative"]').checked = true;
    this.toggleMDEType('relative');
  }

  initCollapsible() {
    const toggle = document.getElementById('advancedToggle');
    const content = document.getElementById('advancedOptions');
    const arrow = toggle.querySelector('.collapsible-arrow');
    
    toggle.classList.remove('open');
    content.classList.remove('open');
    arrow.classList.remove('open');
    content.style.maxHeight = '0';
  }

  async checkAPIConnection() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    // Set checking state
    statusDot.className = 'status-dot';
    statusText.textContent = 'Checking...';
    
    try {
      const isHealthy = await this.apiClient.checkHealth();
      
      if (isHealthy) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected';
      } else {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'Disconnected';
      }
    } catch (error) {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Error';
      console.error('API connection check failed:', error);
    }
  }

  switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabName}Panel`);
    });
    
    this.currentTab = tabName;
    
    // Clear messages when switching tabs
    clearMessages(document.getElementById('messages'));
  }

  toggleMDEType(type) {
    const relativeGroup = document.getElementById('relativeMdeGroup');
    const absoluteGroup = document.getElementById('absoluteMdeGroup');
    
    if (type === 'relative') {
      relativeGroup.classList.remove('hidden');
      absoluteGroup.classList.add('hidden');
      document.getElementById('relativeMde').required = true;
      document.getElementById('absoluteMde').required = false;
    } else {
      relativeGroup.classList.add('hidden');
      absoluteGroup.classList.remove('hidden');
      document.getElementById('relativeMde').required = false;
      document.getElementById('absoluteMde').required = true;
    }
  }

  toggleAdvancedOptions() {
    const toggle = document.getElementById('advancedToggle');
    const content = document.getElementById('advancedOptions');
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

  async handleValidateSubmit() {
    const messagesEl = document.getElementById('messages');
    const submitBtn = document.getElementById('validateSubmit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    clearMessages(messagesEl);
    
    try {
      // Validate form
      const formData = this.getValidateFormData();
      this.validateValidateForm(formData);
      
      // Show loading state
      submitBtn.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');
      
      // Save form data
      await saveFormData('validate', formData);
      
      // Make API call
      const response = await this.apiClient.validateSetup(this.buildValidateRequest(formData));
      
      // Display results
      this.displayValidateResults(response);
      this.currentResults = { type: 'validate', data: response };
      
      showMessage(messagesEl, '🎯 Setup validated! Check your results below - ready to impress stakeholders! 📋', 'success');
      
      // Auto-scroll to results with a slight delay for better UX
      setTimeout(() => {
        this.scrollToResults('validate');
      }, 300);
      
    } catch (error) {
      console.error('Validation failed:', error);
      if (error instanceof APIError) {
        showMessage(messagesEl, error.message, 'error');
      } else {
        showMessage(messagesEl, `Validation failed: ${error.message}`, 'error');
      }
    } finally {
      // Reset loading state
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  }

  async handleAnalyzeSubmit() {
    const messagesEl = document.getElementById('messages');
    const submitBtn = document.getElementById('analyzeSubmit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    clearMessages(messagesEl);
    
    try {
      // Validate form
      const formData = this.getAnalyzeFormData();
      this.validateAnalyzeForm(formData);
      
      // Show loading state with special message for analyze
      submitBtn.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');
      
      // Show informative message for analyze endpoint
      showMessage(messagesEl, '🧠 AI is analyzing your experiment... Results will appear below when ready! (30-90 seconds - perfect coffee break time ☕)', 'info', 0);
      
      // Save form data
      await saveFormData('analyze', formData);
      
      // Make API call
      const response = await this.apiClient.analyzeResults(this.buildAnalyzeRequest(formData));
      
      // Display results
      this.displayAnalyzeResults(response);
      this.currentResults = { type: 'analyze', data: response };
      
      clearMessages(messagesEl);
      showMessage(messagesEl, '✨ Analysis complete! Check your results below - the insights are ready! 📊', 'success');
      
      // Auto-scroll to results with a slight delay for better UX
      setTimeout(() => {
        this.scrollToResults('analyze');
      }, 500);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      clearMessages(messagesEl);
      if (error instanceof APIError) {
        showMessage(messagesEl, error.message, 'error');
      } else {
        showMessage(messagesEl, `Analysis failed: ${error.message}`, 'error');
      }
    } finally {
      // Reset loading state
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  }

  getValidateFormData() {
    const form = document.getElementById('validateForm');
    const formData = new FormData(form);
    
    return {
      hypothesis: formData.get('hypothesis'),
      metricName: formData.get('metricName'),
      baselineRate: formData.get('baselineRate'),
      mdeType: formData.get('mdeType'),
      relativeMde: formData.get('relativeMde'),
      absoluteMde: formData.get('absoluteMde'),
      dailyUsers: formData.get('dailyUsers'),
      variants: formData.get('variants'),
      power: formData.get('power'),
      significance: formData.get('significance')
    };
  }

  getAnalyzeFormData() {
    const form = document.getElementById('analyzeForm');
    const formData = new FormData(form);
    
    const variants = [];
    for (let i = 0; i < this.variantCount; i++) {
      variants.push({
        name: formData.get(`variant_${i}_name`),
        users: formData.get(`variant_${i}_users`),
        conversions: formData.get(`variant_${i}_conversions`)
      });
    }
    
    return {
      hypothesis: formData.get('analyzeHypothesis'),
      primaryMetric: formData.get('primaryMetric'),
      pmNotes: formData.get('pmNotes'),
      variants: variants
    };
  }

  validateValidateForm(data) {
    validateRequired(data.hypothesis, 'Hypothesis');
    validateRequired(data.metricName, 'Primary Metric');
    
    const baselineRate = validateNumber(data.baselineRate, 'Baseline Conversion Rate', 0, 1);
    const dailyUsers = validateInteger(data.dailyUsers, 'Daily Users', 1);
    
    if (data.mdeType === 'relative') {
      validateRequired(data.relativeMde, 'Relative MDE');
      validateNumber(data.relativeMde, 'Relative MDE', 0.1);
    } else {
      validateRequired(data.absoluteMde, 'Absolute MDE');
      validateNumber(data.absoluteMde, 'Absolute MDE', 0.001);
    }
  }

  validateAnalyzeForm(data) {
    validateRequired(data.hypothesis, 'Hypothesis');
    validateRequired(data.primaryMetric, 'Primary Metric');
    
    data.variants.forEach((variant, index) => {
      validateRequired(variant.name, `Variant ${index + 1} Name`);
      validateInteger(variant.users, `Variant ${index + 1} Users`, 1);
      validateInteger(variant.conversions, `Variant ${index + 1} Conversions`, 0);
      
      if (parseInt(variant.conversions) > parseInt(variant.users)) {
        throw new Error(`Variant ${index + 1}: Conversions cannot exceed Users`);
      }
    });
  }

  buildValidateRequest(data) {
    const request = {
      hypothesis: data.hypothesis,
      metric: {
        name: data.metricName,
        baseline_conversion_rate: parseFloat(data.baselineRate)
      },
      parameters: {
        variants: parseInt(data.variants),
        statistical_power: parseFloat(data.power),
        significance_level: parseFloat(data.significance)
      },
      traffic: {
        estimated_daily_users: parseInt(data.dailyUsers)
      }
    };
    
    if (data.mdeType === 'relative') {
      request.parameters.minimum_detectable_effect_relative = parseFloat(data.relativeMde) / 100;
    } else {
      request.parameters.minimum_detectable_effect_absolute = parseFloat(data.absoluteMde);
    }
    
    return request;
  }

  buildAnalyzeRequest(data) {
    return {
      context: {
        hypothesis: data.hypothesis,
        primary_metric_name: data.primaryMetric,
        pm_notes: data.pmNotes || null
      },
      results_data: {
        variants: data.variants.map(v => ({
          name: v.name,
          users: parseInt(v.users),
          conversions: parseInt(v.conversions)
        }))
      }
    };
  }

  displayValidateResults(response) {
    const resultsEl = document.getElementById('validateResults');
    const contentEl = document.getElementById('validateResultsContent');
    
    let html = '';
    
    // Inputs Summary
    html += '<div class="section">';
    html += '<h4>📋 Input Summary</h4>';
    html += '<div class="metrics-grid">';
    html += `<div class="metric-card">
      <div class="metric-value">${formatPercentage(response.inputs_summary.baseline_conversion_rate)}</div>
      <div class="metric-label">Baseline Rate</div>
    </div>`;
    html += `<div class="metric-card">
      <div class="metric-value">${response.inputs_summary.mde_type === 'relative' ? formatPercentage(response.inputs_summary.minimum_detectable_effect) : formatNumber(response.inputs_summary.minimum_detectable_effect, 3)}</div>
      <div class="metric-label">MDE (${response.inputs_summary.mde_type})</div>
    </div>`;
    html += `<div class="metric-card">
      <div class="metric-value">${formatNumber(response.inputs_summary.estimated_daily_users, 0)}</div>
      <div class="metric-label">Daily Users</div>
    </div>`;
    html += `<div class="metric-card">
      <div class="metric-value">${response.inputs_summary.variants}</div>
      <div class="metric-label">Variants</div>
    </div>`;
    html += '</div>';
    html += '</div>';
    
    // Recommended Plan
    html += '<div class="section">';
    html += '<h4>📊 Recommended Plan</h4>';
    html += '<div class="metrics-grid">';
    html += `<div class="metric-card">
      <div class="metric-value">${formatNumber(response.feasibility_analysis.recommended_plan.sample_size_per_variant, 0)}</div>
      <div class="metric-label">Sample Size per Variant</div>
    </div>`;
    html += `<div class="metric-card">
      <div class="metric-value">${formatNumber(response.feasibility_analysis.recommended_plan.total_sample_size, 0)}</div>
      <div class="metric-label">Total Sample Size</div>
    </div>`;
    html += `<div class="metric-card">
      <div class="metric-value">${formatNumber(response.feasibility_analysis.recommended_plan.estimated_duration_days, 1)}</div>
      <div class="metric-label">Estimated Duration (Days)</div>
    </div>`;
    html += '</div>';
    html += '</div>';
    
    // Trade-off Matrix
    if (response.feasibility_analysis.tradeoff_matrix && response.feasibility_analysis.tradeoff_matrix.length > 0) {
      html += '<div class="section">';
      html += '<h4>⚖️ Trade-off Matrix</h4>';
      html += '<table class="tradeoff-table">';
      html += '<thead><tr><th>MDE</th><th>Sample Size</th><th>Duration (Days)</th></tr></thead>';
      html += '<tbody>';
      response.feasibility_analysis.tradeoff_matrix.forEach(row => {
        html += `<tr>
          <td>${response.inputs_summary.mde_type === 'relative' ? formatPercentage(row.mde) : formatNumber(row.mde, 3)}</td>
          <td>${formatNumber(row.sample_size_per_variant, 0)}</td>
          <td>${formatNumber(row.estimated_duration_days, 1)}</td>
        </tr>`;
      });
      html += '</tbody>';
      html += '</table>';
      html += '</div>';
    }
    
    // Hypothesis Assessment
    if (response.hypothesis_assessment) {
      html += '<div class="section">';
      html += '<h4>🤖 AI Hypothesis Assessment</h4>';
      html += '<div class="assessment-card">';
      html += '<div class="assessment-score">';
      
      const score = response.hypothesis_assessment.score;
      let scoreClass = 'poor';
      if (score >= 9) scoreClass = 'excellent';
      else if (score >= 7) scoreClass = 'good';
      else if (score >= 5) scoreClass = 'medium';
      else if (score >= 3) scoreClass = 'poor';
      else scoreClass = 'very-poor';
      
      const scorePercentage = (score / 10) * 100;
      
      html += `<div class="score-circle ${scoreClass}" style="--score-percentage: ${scorePercentage}"><span>${score}/10</span></div>`;
      html += '<div class="assessment-content">';
      html += `<div class="assessment-title">Hypothesis Quality Assessment</div>`;
      html += `<div class="assessment-text">${formatTextToHTML(response.hypothesis_assessment.assessment)}</div>`;
      if (response.hypothesis_assessment.suggestions) {
        html += `<div class="assessment-suggestions"><strong>Suggestions:</strong> ${formatTextToHTML(response.hypothesis_assessment.suggestions)}</div>`;
      }
      html += '</div>';
      html += '</div>';
      
      html += '</div>';
      html += '</div>';
    }
    
    contentEl.innerHTML = html;
    resultsEl.classList.remove('hidden');
    
    // Refresh tooltips for any new content
    refreshTooltips();
  }

  displayAnalyzeResults(response) {
    const resultsEl = document.getElementById('analyzeResults');
    const contentEl = document.getElementById('analyzeResultsContent');
    
    if (!resultsEl || !contentEl) {
      throw new Error('Required DOM elements not found');
    }
    
    let html = '';
    
    // Statistical Summary
    html += '<div class="section">';
    html += '<h4>📊 Statistical Summary</h4>';
    html += '<div class="metrics-grid">';
    html += `<div class="metric-card">
      <div class="metric-value">${formatPercentage(response.statistical_summary.control_conversion_rate)}</div>
      <div class="metric-label">Control Rate</div>
    </div>`;
    html += `<div class="metric-card">
      <div class="metric-value">${formatPercentage(response.statistical_summary.treatment_conversion_rate)}</div>
      <div class="metric-label">Treatment Rate</div>
    </div>`;
    html += `<div class="metric-card">
      <div class="metric-value">${formatPercentage(response.statistical_summary.relative_lift)}</div>
      <div class="metric-label">Relative Lift</div>
    </div>`;
    html += `<div class="metric-card">
      <div class="metric-value">${formatNumber(response.statistical_summary.p_value, 4)}</div>
      <div class="metric-label">P-Value</div>
    </div>`;
    html += `<div class="metric-card">
      <div class="metric-value">${response.statistical_summary.is_statistically_significant ? 'Yes! 🎉' : 'Not yet 😐'}</div>
      <div class="metric-label">${response.statistical_summary.is_statistically_significant ? 'Statistically Significant' : 'Keep Testing'}</div>
    </div>`;
    html += `<div class="metric-card">
      <div class="metric-value">${formatNumber(response.statistical_summary.confidence_interval_lower, 4)} - ${formatNumber(response.statistical_summary.confidence_interval_upper, 4)}</div>
      <div class="metric-label">95% CI</div>
    </div>`;
    html += '</div>';
    html += '</div>';
    
    // PM-Friendly Interpretation
    html += '<div class="section">';
    html += '<h4>💡 What This Means for You</h4>';
    html += '<div class="pm-interpretation">';
    
    const pValue = response.statistical_summary.p_value;
    const isSignificant = response.statistical_summary.is_statistically_significant;
    const lift = response.statistical_summary.relative_lift * 100;
    
    if (isSignificant && lift > 0) {
      html += `<p class="interpretation-good">🎉 <strong>Good news!</strong> Your experiment shows a statistically significant improvement of ${formatPercentage(response.statistical_summary.relative_lift)}. This means the difference is likely real, not just random chance.</p>`;
      html += `<p class="interpretation-tip">💼 <strong>PM Tip:</strong> You can confidently present this to stakeholders. The p-value of ${formatNumber(pValue, 4)} means there's less than a ${formatPercentage(pValue)} chance this is a fluke.</p>`;
    } else if (isSignificant && lift < 0) {
      html += `<p class="interpretation-warning">⚠️ <strong>Heads up!</strong> Your experiment shows a statistically significant <em>decrease</em> of ${formatPercentage(Math.abs(response.statistical_summary.relative_lift))}. Time to investigate what went wrong.</p>`;
      html += `<p class="interpretation-tip">🔍 <strong>PM Tip:</strong> This is valuable learning! Consider what factors might have caused the negative impact before your next iteration.</p>`;
    } else {
      html += `<p class="interpretation-neutral">🤔 <strong>Inconclusive results.</strong> The ${formatPercentage(Math.abs(response.statistical_summary.relative_lift))} ${lift > 0 ? 'improvement' : 'decrease'} could just be random variation (p-value: ${formatNumber(pValue, 4)}).</p>`;
      html += `<p class="interpretation-tip">⏰ <strong>PM Tip:</strong> You might need to run the test longer or increase your sample size. Statistical significance ≠ business significance though!</p>`;
    }
    
    html += '</div>';
    html += '</div>';
    
    // AI Interpretation
    if (response.generative_analysis && response.generative_analysis.interpretation_narrative) {
      html += '<div class="section">';
      html += '<h4>🧠 AI Interpretation</h4>';
      html += `<div class="interpretation-text">${formatTextToHTML(response.generative_analysis.interpretation_narrative)}</div>`;
      html += '</div>';
    }
    
    // Recommendations
    if (response.generative_analysis && response.generative_analysis.recommended_next_steps && response.generative_analysis.recommended_next_steps.length > 0) {
      html += '<div class="section">';
      html += '<h4>🎯 Recommended Next Steps</h4>';
      html += '<div class="recommendations">';
      
      response.generative_analysis.recommended_next_steps.forEach(rec => {
        html += `<div class="recommendation-item">
          <div class="recommendation-header">
            <div class="recommendation-action">${formatTextToHTML(rec.action)}</div>
            <div class="confidence-badge ${rec.confidence.toLowerCase()}">${rec.confidence}</div>
          </div>
          <div class="recommendation-rationale">${formatTextToHTML(rec.rationale)}</div>
        </div>`;
      });
      
      html += '</div>';
      html += '</div>';
    }
    
    // Follow-up Questions
    if (response.generative_analysis && response.generative_analysis.generated_questions && response.generative_analysis.generated_questions.length > 0) {
      html += '<div class="section">';
      html += '<h4>❓ Follow-up Questions</h4>';
      html += '<ul>';
      response.generative_analysis.generated_questions.forEach(question => {
        html += `<li>${question}</li>`;
      });
      html += '</ul>';
      html += '</div>';
    }
    
    // Segment Analysis
    if (response.segment_analysis && response.segment_analysis.length > 0) {
      html += '<div class="section">';
      html += '<h4>🔍 Segment Analysis</h4>';
      response.segment_analysis.forEach(segment => {
        html += `<div class="segment-item">
          <h5>${segment.segment_name}</h5>
          <div class="segment-metrics">
            <span>Control: ${formatPercentage(segment.metrics.control_conversion_rate)}</span>
            <span>Treatment: ${formatPercentage(segment.metrics.treatment_conversion_rate)}</span>
            <span>Lift: ${formatPercentage(segment.metrics.relative_lift)}</span>
            <span>Significant: ${segment.metrics.is_statistically_significant ? 'Yes' : 'No'}</span>
          </div>
        </div>`;
      });
      html += '</div>';
    }
    
    contentEl.innerHTML = html;
    resultsEl.classList.remove('hidden');
    
    // Refresh tooltips for any new content
    refreshTooltips();
  }

  addVariant() {
    if (this.variantCount >= 5) return;
    
    this.variantCount++;
    const container = document.getElementById('variantsContainer');
    const variantLabels = ['A', 'B', 'C', 'D', 'E'];
    
    const variantHtml = `
      <div class="variant-group" data-variant="${this.variantCount - 1}">
        <div class="variant-header">
          <h4>Variant ${this.variantCount}</h4>
          <span class="variant-label">${variantLabels[this.variantCount - 1]}</span>
        </div>
        <div class="variant-fields">
          <div class="form-group">
            <label class="form-label">Variant Name</label>
            <input 
              type="text" 
              name="variant_${this.variantCount - 1}_name" 
              class="form-input" 
              value="Variant ${this.variantCount}"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label">Users <span class="required">*</span></label>
            <input 
              type="number" 
              name="variant_${this.variantCount - 1}_users" 
              class="form-input" 
              placeholder="1000"
              min="1"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label">Conversions <span class="required">*</span></label>
            <input 
              type="number" 
              name="variant_${this.variantCount - 1}_conversions" 
              class="form-input" 
              placeholder="50"
              min="0"
              required
            />
          </div>
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', variantHtml);
    
    // Refresh tooltips for new elements
    refreshTooltips();
    
    // Update remove button state
    const removeBtn = document.getElementById('removeVariant');
    removeBtn.disabled = this.variantCount <= 2;
  }

  removeVariant() {
    if (this.variantCount <= 2) return;
    
    const container = document.getElementById('variantsContainer');
    const lastVariant = container.querySelector(`[data-variant="${this.variantCount - 1}"]`);
    
    if (lastVariant) {
      lastVariant.remove();
      this.variantCount--;
    }
    
    // Update remove button state
    const removeBtn = document.getElementById('removeVariant');
    removeBtn.disabled = this.variantCount <= 2;
  }

  resetValidateForm() {
    document.getElementById('validateForm').reset();
    document.getElementById('validateResults').classList.add('hidden');
    this.setDefaultValues();
    clearMessages(document.getElementById('messages'));
  }

  resetAnalyzeForm() {
    document.getElementById('analyzeForm').reset();
    document.getElementById('analyzeResults').classList.add('hidden');
    
    // Reset to 2 variants
    const container = document.getElementById('variantsContainer');
    const variants = container.querySelectorAll('.variant-group');
    
    variants.forEach((variant, index) => {
      if (index >= 2) {
        variant.remove();
      }
    });
    
    this.variantCount = 2;
    document.getElementById('removeVariant').disabled = true;
    
    clearMessages(document.getElementById('messages'));
  }

  exportResults(type, format) {
    if (!this.currentResults || this.currentResults.type !== type) {
      showMessage(document.getElementById('messages'), 'No results to export', 'warning');
      return;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `pmtools-${type}-${timestamp}.${format}`;
    
    if (format === 'json') {
      downloadJSON(this.currentResults.data, filename);
    } else if (format === 'csv') {
      downloadCSV(this.currentResults.data, filename);
    }
    
    showMessage(document.getElementById('messages'), `📊 Results exported as ${filename} - time to make some spreadsheet magic!`, 'success');
  }

  setupAutoSave() {
    const validateForm = document.getElementById('validateForm');
    const analyzeForm = document.getElementById('analyzeForm');
    
    const saveValidateData = () => {
      try {
        const data = this.getValidateFormData();
        saveFormData('validate', data);
      } catch (error) {
        // Ignore errors during auto-save
      }
    };
    
    const saveAnalyzeData = () => {
      try {
        const data = this.getAnalyzeFormData();
        saveFormData('analyze', data);
      } catch (error) {
        // Ignore errors during auto-save
      }
    };
    
    // Debounced save functions
    const debouncedValidateSave = this.debounce(saveValidateData, 2000);
    const debouncedAnalyzeSave = this.debounce(saveAnalyzeData, 2000);
    
    validateForm.addEventListener('input', debouncedValidateSave);
    analyzeForm.addEventListener('input', debouncedAnalyzeSave);
  }

  async loadSavedFormData() {
    try {
      // Load validate form data
      const validateData = await loadFormData('validate');
      if (validateData) {
        this.populateValidateForm(validateData);
      }
      
      // Load analyze form data
      const analyzeData = await loadFormData('analyze');
      if (analyzeData) {
        this.populateAnalyzeForm(analyzeData);
      }
    } catch (error) {
      console.error('Failed to load saved form data:', error);
    }
  }

  populateValidateForm(data) {
    const form = document.getElementById('validateForm');
    
    if (data.hypothesis) form.querySelector('#hypothesis').value = data.hypothesis;
    if (data.metricName) form.querySelector('#metricName').value = data.metricName;
    if (data.baselineRate) form.querySelector('#baselineRate').value = data.baselineRate;
    if (data.relativeMde) form.querySelector('#relativeMde').value = data.relativeMde;
    if (data.absoluteMde) form.querySelector('#absoluteMde').value = data.absoluteMde;
    if (data.dailyUsers) form.querySelector('#dailyUsers').value = data.dailyUsers;
    if (data.variants) form.querySelector('#variants').value = data.variants;
    if (data.power) form.querySelector('#power').value = data.power;
    if (data.significance) form.querySelector('#significance').value = data.significance;
    
    if (data.mdeType) {
      form.querySelector(`input[name="mdeType"][value="${data.mdeType}"]`).checked = true;
      this.toggleMDEType(data.mdeType);
    }
  }

  populateAnalyzeForm(data) {
    const form = document.getElementById('analyzeForm');
    
    if (data.hypothesis) form.querySelector('#analyzeHypothesis').value = data.hypothesis;
    if (data.primaryMetric) form.querySelector('#primaryMetric').value = data.primaryMetric;
    if (data.pmNotes) form.querySelector('#pmNotes').value = data.pmNotes;
    
    if (data.variants && data.variants.length > 0) {
      // Adjust variant count if needed
      while (this.variantCount < data.variants.length) {
        this.addVariant();
      }
      
      // Populate variant data
      data.variants.forEach((variant, index) => {
        if (variant.name) form.querySelector(`input[name="variant_${index}_name"]`).value = variant.name;
        if (variant.users) form.querySelector(`input[name="variant_${index}_users"]`).value = variant.users;
        if (variant.conversions) form.querySelector(`input[name="variant_${index}_conversions"]`).value = variant.conversions;
      });
    }
  }

  scrollToResults(type) {
    const resultsEl = document.getElementById(`${type}Results`);
    if (resultsEl && !resultsEl.classList.contains('hidden')) {
      // Add entrance animation class
      resultsEl.classList.add('results-entrance');
      
      // Smooth scroll to results header
      resultsEl.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
      
      // Remove animation class after animation completes
      setTimeout(() => {
        resultsEl.classList.remove('results-entrance');
      }, 1000);
    }
  }

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
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});