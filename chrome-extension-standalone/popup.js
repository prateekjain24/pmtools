// Main popup functionality for PM Tools Chrome Extension

document.addEventListener('DOMContentLoaded', async function() {
  console.log('PM Tools popup loaded');
  
  // Initialize the application
  await initializeApp();
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize tooltips
  initializeTooltips();
  
  // Check for first-time user
  await checkFirstTimeUser();
});

async function initializeApp() {
  // Load saved preferences
  const preferences = await PMTools.utils.getStorage(PMTools.STORAGE_KEYS.PREFERENCES) || {};
  
  // Apply saved form values if available
  if (preferences.validateForm) {
    applyFormValues('validate', preferences.validateForm);
  }
  if (preferences.analyzeForm) {
    applyFormValues('analyze', preferences.analyzeForm);
  }
  
  // Set up MDE type change handler
  updateMDELabels();
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  
  // Form submissions
  document.getElementById('validateForm').addEventListener('submit', handleValidateSubmit);
  document.getElementById('analyzeForm').addEventListener('submit', handleAnalyzeSubmit);
  
  // MDE type change
  document.querySelectorAll('input[name="mdeType"]').forEach(radio => {
    radio.addEventListener('change', updateMDELabels);
  });
  
  // Advanced options toggle
  document.getElementById('advancedToggle').addEventListener('click', toggleAdvancedOptions);
  
  // Results actions
  document.getElementById('exportCsvBtn').addEventListener('click', () => exportResults('csv'));
  document.getElementById('exportJsonBtn').addEventListener('click', () => exportResults('json'));
  document.getElementById('newCalculationBtn').addEventListener('click', startNewCalculation);
  document.getElementById('scrollTopBtn').addEventListener('click', scrollToTop);
  
  // Auto-save form data
  setupAutoSave();
}

function setupAutoSave() {
  const debouncedSave = PMTools.utils.debounce(saveFormData, 1000);
  
  // Save validate form data
  document.getElementById('validateForm').addEventListener('input', debouncedSave);
  document.getElementById('analyzeForm').addEventListener('input', debouncedSave);
}

async function saveFormData() {
  const preferences = await PMTools.utils.getStorage(PMTools.STORAGE_KEYS.PREFERENCES) || {};
  
  // Save validate form
  const validateForm = document.getElementById('validateForm');
  const validateData = new FormData(validateForm);
  preferences.validateForm = Object.fromEntries(validateData.entries());
  
  // Save analyze form
  const analyzeForm = document.getElementById('analyzeForm');
  const analyzeData = new FormData(analyzeForm);
  preferences.analyzeForm = Object.fromEntries(analyzeData.entries());
  
  await PMTools.utils.setStorage(PMTools.STORAGE_KEYS.PREFERENCES, preferences);
}

function applyFormValues(formType, values) {
  const form = document.getElementById(`${formType}Form`);
  
  Object.entries(values).forEach(([key, value]) => {
    const element = form.querySelector(`[name="${key}"], #${key}`);
    if (element) {
      if (element.type === 'radio') {
        const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
        if (radio) radio.checked = true;
      } else {
        element.value = value;
      }
    }
  });
  
  if (formType === 'validate') {
    updateMDELabels();
  }
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}Section`);
  });
  
  // Hide results when switching tabs
  hideResults();
}

function updateMDELabels() {
  const isRelative = document.querySelector('input[name="mdeType"]:checked').value === 'relative';
  
  document.getElementById('mdeLabel').textContent = isRelative 
    ? 'Expected Improvement' 
    : 'Absolute Improvement';
  
  document.getElementById('mdeSuffix').textContent = isRelative ? '%' : 'pp';
  
  const mdeInput = document.getElementById('mdeValue');
  if (isRelative) {
    mdeInput.placeholder = '10';
    mdeInput.step = '0.1';
    mdeInput.max = '1000';
  } else {
    mdeInput.placeholder = '1.0';
    mdeInput.step = '0.01';
    mdeInput.max = '100';
  }
}

function toggleAdvancedOptions() {
  const options = document.getElementById('advancedOptions');
  const toggle = document.getElementById('advancedToggle');
  
  options.classList.toggle('show');
  
  const isShown = options.classList.contains('show');
  toggle.textContent = isShown ? '⚙️ Hide Advanced' : '⚙️ Advanced Settings';
}

async function handleValidateSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const button = document.getElementById('validateBtn');
  const message = document.getElementById('validateMessage');
  
  try {
    PMTools.utils.setLoading(button, true);
    message.style.display = 'none';
    
    // Get form data
    const formData = new FormData(form);
    
    // Get values from form elements directly for better decimal handling
    const baselineRate = document.getElementById('baselineRate').value;
    const mdeValue = document.getElementById('mdeValue').value;
    const dailyUsers = document.getElementById('dailyUsers').value;
    const statisticalPower = document.getElementById('statisticalPower').value;
    const significanceLevel = document.getElementById('significanceLevel').value;
    const numVariants = document.getElementById('numVariants').value;
    
    const params = {
      hypothesis: formData.get('hypothesis'),
      metricName: formData.get('metricName'),
      baselineConversionRate: PMTools.utils.sanitizeNumber(baselineRate) / 100,
      minimumDetectableEffect: PMTools.utils.sanitizeNumber(mdeValue) / (formData.get('mdeType') === 'relative' ? 100 : 1),
      estimatedDailyUsers: Math.round(PMTools.utils.sanitizeNumber(dailyUsers)),
      statisticalPower: PMTools.utils.sanitizeNumber(statisticalPower, 80) / 100,
      significanceLevel: PMTools.utils.sanitizeNumber(significanceLevel, 5) / 100,
      numVariants: Math.round(PMTools.utils.sanitizeNumber(numVariants, 2)),
      isRelativeMDE: formData.get('mdeType') === 'relative'
    };
    
    // Validate inputs
    const validation = PMTools.statistics.validateExperimentSetup(params);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // Calculate sample size
    const sampleSize = PMTools.statistics.calculateSampleSize(
      params.baselineConversionRate,
      params.minimumDetectableEffect,
      params.statisticalPower,
      params.significanceLevel,
      params.isRelativeMDE
    );
    
    // Calculate duration
    const duration = PMTools.statistics.calculateTestDuration(
      sampleSize,
      params.estimatedDailyUsers,
      params.numVariants
    );
    
    // Generate trade-off matrix
    const tradeoffMatrix = PMTools.statistics.generateTradeoffMatrix(
      params.baselineConversionRate,
      params.estimatedDailyUsers,
      PMTools.DEFAULTS.MDE_VALUES,
      params.statisticalPower,
      params.significanceLevel,
      true, // Always relative for matrix
      params.numVariants
    );
    
    // Get AI analysis if available
    let aiAnalysis = null;
    try {
      const apiKeyStatus = await PMTools.llm.getApiKeyStatus();
      if (apiKeyStatus.hasAny) {
        const provider = apiKeyStatus.hasGemini ? PMTools.LLM_PROVIDERS.GEMINI : PMTools.LLM_PROVIDERS.ANTHROPIC;
        aiAnalysis = await PMTools.llm.analyzeHypothesis(params.hypothesis, provider);
      }
    } catch (error) {
      console.warn('AI analysis failed:', error);
    }
    
    // Display results
    displayValidateResults({
      params,
      sampleSize,
      duration,
      tradeoffMatrix,
      aiAnalysis
    });
    
    PMTools.utils.showMessage(message, '✅ Experiment validation complete!', 'success');
    
  } catch (error) {
    console.error('Validation error:', error);
    PMTools.utils.showMessage(message, `❌ ${error.message}`, 'error');
  } finally {
    PMTools.utils.setLoading(button, false);
  }
}

async function handleAnalyzeSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const button = document.getElementById('analyzeBtn');
  const message = document.getElementById('analyzeMessage');
  
  try {
    PMTools.utils.setLoading(button, true);
    message.style.display = 'none';
    
    // Get form data
    const formData = new FormData(form);
    const data = {
      context: formData.get('experimentContext') || '',
      variants: [
        {
          name: 'Control',
          users: parseInt(formData.get('controlUsers')),
          conversions: parseInt(formData.get('controlConversions'))
        },
        {
          name: 'Treatment',
          users: parseInt(formData.get('treatmentUsers')),
          conversions: parseInt(formData.get('treatmentConversions'))
        }
      ]
    };
    
    // Validate inputs
    const validation = PMTools.statistics.validateResultsData(data);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // Calculate metrics
    const results = PMTools.statistics.calculateConversionMetrics(
      data.variants[0].users,
      data.variants[0].conversions,
      data.variants[1].users,
      data.variants[1].conversions
    );
    
    // Add variant data to results
    results.controlUsers = data.variants[0].users;
    results.treatmentUsers = data.variants[1].users;
    results.controlConversions = data.variants[0].conversions;
    results.treatmentConversions = data.variants[1].conversions;
    
    // Get AI interpretation if available
    let aiInterpretation = null;
    try {
      const apiKeyStatus = await PMTools.llm.getApiKeyStatus();
      if (apiKeyStatus.hasAny) {
        const provider = apiKeyStatus.hasGemini ? PMTools.LLM_PROVIDERS.GEMINI : PMTools.LLM_PROVIDERS.ANTHROPIC;
        aiInterpretation = await PMTools.llm.interpretResults(results, data.context, provider);
      }
    } catch (error) {
      console.warn('AI interpretation failed:', error);
    }
    
    // Display results
    displayAnalyzeResults({
      context: data.context,
      results,
      aiInterpretation
    });
    
    PMTools.utils.showMessage(message, '✅ Results analysis complete!', 'success');
    
  } catch (error) {
    console.error('Analysis error:', error);
    PMTools.utils.showMessage(message, `❌ ${error.message}`, 'error');
  } finally {
    PMTools.utils.setLoading(button, false);
  }
}

function displayValidateResults(data) {
  const { params, sampleSize, duration, tradeoffMatrix, aiAnalysis } = data;
  
  let html = `
    <div class="result-card">
      <h3>📊 Sample Size & Duration</h3>
      <div class="metric-grid">
        <div class="metric">
          <span class="metric-value">${PMTools.utils.formatNumber(sampleSize)}</span>
          <div class="metric-label">Users per variant</div>
        </div>
        <div class="metric">
          <span class="metric-value">${PMTools.utils.formatNumber(sampleSize * params.numVariants)}</span>
          <div class="metric-label">Total users needed</div>
        </div>
        <div class="metric">
          <span class="metric-value">${PMTools.utils.formatDuration(duration)}</span>
          <div class="metric-label">Estimated duration</div>
        </div>
        <div class="metric">
          <span class="metric-value">${PMTools.utils.formatPercentage(params.minimumDetectableEffect)}</span>
          <div class="metric-label">${params.isRelativeMDE ? 'Relative' : 'Absolute'} MDE</div>
        </div>
      </div>
    </div>
  `;
  
  // Trade-off matrix
  html += `
    <div class="result-card">
      <h3>⚖️ Trade-off Analysis</h3>
      <p>Different MDE scenarios and their requirements:</p>
      <table class="tradeoff-table">
        <thead>
          <tr>
            <th>MDE</th>
            <th>Sample Size</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  tradeoffMatrix.forEach(row => {
    html += `
      <tr>
        <td>${PMTools.utils.formatPercentage(row.mde)}</td>
        <td>${PMTools.utils.formatNumber(row.sampleSizePerVariant)}</td>
        <td>${PMTools.utils.formatDuration(row.estimatedDurationDays)}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  // AI Analysis if available
  if (aiAnalysis && aiAnalysis.success) {
    html += generateAIAnalysisHTML(aiAnalysis);
  } else if (aiAnalysis && aiAnalysis.usingFallback) {
    html += generateAIAnalysisHTML(aiAnalysis, true);
  }
  
  showResults('Experiment Validation Results', html);
  
  // Store results for export
  window.currentResults = {
    type: 'validate',
    data: { params, sampleSize, duration, tradeoffMatrix, aiAnalysis }
  };
}

function displayAnalyzeResults(data) {
  const { context, results, aiInterpretation } = data;
  
  let html = `
    <div class="result-card">
      <h3>📈 Statistical Results</h3>
      <div class="metric-grid">
        <div class="metric">
          <span class="metric-value">${PMTools.utils.formatPercentage(results.controlConversionRate)}</span>
          <div class="metric-label">Control rate</div>
        </div>
        <div class="metric">
          <span class="metric-value">${PMTools.utils.formatPercentage(results.treatmentConversionRate)}</span>
          <div class="metric-label">Treatment rate</div>
        </div>
        <div class="metric">
          <span class="metric-value">${PMTools.utils.formatPercentage(results.relativeLift)}</span>
          <div class="metric-label">Relative lift</div>
        </div>
        <div class="metric">
          <span class="metric-value">${results.pValue.toFixed(4)}</span>
          <div class="metric-label">P-value</div>
        </div>
      </div>
      
      <div style="margin-top: 16px;">
        <span class="significance-indicator ${results.isSignificant ? 'significant' : 'not-significant'}">
          ${results.isSignificant ? '✅ Statistically Significant' : '❌ Not Statistically Significant'}
        </span>
      </div>
      
      <div style="margin-top: 12px; font-size: 13px; color: var(--text-secondary);">
        <strong>Confidence Interval:</strong> 
        ${PMTools.utils.formatPercentage(results.confidenceInterval.lower)} to 
        ${PMTools.utils.formatPercentage(results.confidenceInterval.upper)}
      </div>
    </div>
  `;
  
  // AI Interpretation if available
  if (aiInterpretation && aiInterpretation.success) {
    html += generateAIInterpretationHTML(aiInterpretation);
  } else if (aiInterpretation && aiInterpretation.usingFallback) {
    html += generateAIInterpretationHTML(aiInterpretation, true);
  }
  
  showResults('Experiment Results Analysis', html);
  
  // Store results for export
  window.currentResults = {
    type: 'analyze',
    data: { context, results, aiInterpretation }
  };
}

function generateAIAnalysisHTML(analysis, isFallback = false) {
  // Check if using structured output (already HTML formatted)
  const isStructured = analysis.usingStructuredOutput;
  
  return `
    <div class="ai-insight ${isFallback ? 'ai-fallback' : ''}">
      <h3>🤖 AI Hypothesis Analysis ${isFallback ? '(Offline Mode)' : ''}</h3>
      
      <div class="insight-section">
        <div class="insight-label">Clarity Score:</div>
        <div class="insight-content">${isStructured ? analysis.analysis.clarityScore : `${analysis.analysis.clarityScore}/10`}</div>
      </div>
      
      <div class="insight-section">
        <div class="insight-label">Strengths:</div>
        <div class="insight-content">${isStructured ? analysis.analysis.strengths : PMTools.utils.formatLLMResponse(analysis.analysis.strengths)}</div>
      </div>
      
      <div class="insight-section">
        <div class="insight-label">Areas for Improvement:</div>
        <div class="insight-content">${isStructured ? analysis.analysis.improvements : PMTools.utils.formatLLMResponse(analysis.analysis.improvements)}</div>
      </div>
      
      <div class="insight-section">
        <div class="insight-label">Improved Version:</div>
        <div class="insight-content">${isStructured ? analysis.analysis.improvedVersion : PMTools.utils.formatLLMResponse(analysis.analysis.improvedVersion)}</div>
      </div>
      
      <div class="insight-section">
        <div class="insight-label">Success Metrics:</div>
        <div class="insight-content">${isStructured ? analysis.analysis.successMetrics : PMTools.utils.formatLLMResponse(analysis.analysis.successMetrics)}</div>
      </div>
      
      ${analysis.analysis.businessConsiderations ? `
      <div class="insight-section">
        <div class="insight-label">Business Considerations:</div>
        <div class="insight-content">${isStructured ? analysis.analysis.businessConsiderations : PMTools.utils.formatLLMResponse(analysis.analysis.businessConsiderations)}</div>
      </div>
      ` : ''}
    </div>
  `;
}

function generateAIInterpretationHTML(interpretation, isFallback = false) {
  // Check if using structured output (already HTML formatted)
  const isStructured = interpretation.usingStructuredOutput;
  
  return `
    <div class="ai-insight ${isFallback ? 'ai-fallback' : ''}">
      <h3>🤖 AI Results Interpretation ${isFallback ? '(Offline Mode)' : ''}</h3>
      
      <div class="insight-section">
        <div class="insight-label">Key Takeaway:</div>
        <div class="insight-content">${isStructured ? interpretation.interpretation.keyTakeaway : PMTools.utils.formatLLMResponse(interpretation.interpretation.keyTakeaway)}</div>
      </div>
      
      <div class="insight-section">
        <div class="insight-label">Ship Decision:</div>
        <div class="insight-content">${isStructured ? interpretation.interpretation.recommendation : PMTools.utils.formatLLMResponse(interpretation.interpretation.recommendation)}</div>
      </div>
      
      ${interpretation.interpretation.practicalSignificance ? `
      <div class="insight-section">
        <div class="insight-label">Practical Significance:</div>
        <div class="insight-content">${isStructured ? interpretation.interpretation.practicalSignificance : PMTools.utils.formatLLMResponse(interpretation.interpretation.practicalSignificance)}</div>
      </div>
      ` : ''}
      
      ${interpretation.interpretation.riskAssessment ? `
      <div class="insight-section">
        <div class="insight-label">Risk Assessment:</div>
        <div class="insight-content">${isStructured ? interpretation.interpretation.riskAssessment : PMTools.utils.formatLLMResponse(interpretation.interpretation.riskAssessment)}</div>
      </div>
      ` : ''}
      
      <div class="insight-section">
        <div class="insight-label">Next Steps:</div>
        <div class="insight-content">${isStructured ? interpretation.interpretation.nextSteps : PMTools.utils.formatLLMResponse(interpretation.interpretation.nextSteps)}</div>
      </div>
      
      <div class="insight-section">
        <div class="insight-label">Strategic Questions:</div>
        <div class="insight-content">${isStructured ? interpretation.interpretation.followUpQuestions : PMTools.utils.formatLLMResponse(interpretation.interpretation.followUpQuestions)}</div>
      </div>
    </div>
  `;
}

function showResults(title, content) {
  document.getElementById('resultsTitle').textContent = title;
  document.getElementById('resultsContent').innerHTML = content;
  document.getElementById('resultsSection').style.display = 'block';
  
  // Show a brief notification that results are ready
  showResultsNotification();
  
  // Optionally collapse the form to make more room for results
  collapseActiveForm();
  
  // Auto-scroll to results with delay for rendering
  setTimeout(() => {
    PMTools.utils.scrollToResults();
  }, 100);
}

function showResultsNotification() {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'results-notification';
  notification.innerHTML = '📊 Results ready below ↓';
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--primary-color);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 124, 186, 0.3);
    z-index: 1000;
    animation: slideInFade 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Remove notification after a short delay
  setTimeout(() => {
    notification.style.animation = 'slideOutFade 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 1500);
}

function collapseActiveForm() {
  // Get the active tab content
  const activeTabContent = document.querySelector('.tab-content.active');
  if (activeTabContent) {
    // Add a collapse class to the form
    activeTabContent.classList.add('collapsed');
    
    // Add a toggle button to expand/collapse
    const existingToggle = document.getElementById('formToggle');
    if (!existingToggle) {
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'formToggle';
      toggleBtn.className = 'form-toggle-btn';
      toggleBtn.innerHTML = '▼ Show Form';
      toggleBtn.style.cssText = `
        width: 100%;
        padding: 8px;
        background: var(--background-light);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 12px;
        font-size: 13px;
        color: var(--text-secondary);
        display: none;
      `;
      
      // Insert toggle button before the form
      activeTabContent.insertBefore(toggleBtn, activeTabContent.firstChild);
      
      toggleBtn.addEventListener('click', () => {
        activeTabContent.classList.toggle('collapsed');
        toggleBtn.innerHTML = activeTabContent.classList.contains('collapsed') 
          ? '▼ Show Form' 
          : '▲ Hide Form';
      });
    }
  }
}

function hideResults() {
  document.getElementById('resultsSection').style.display = 'none';
  window.currentResults = null;
}

function exportResults(format) {
  if (!window.currentResults) {
    alert('No results to export');
    return;
  }
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `pm-tools-${window.currentResults.type}-${timestamp}`;
  
  if (format === 'csv') {
    const csvData = convertResultsToCSV(window.currentResults);
    PMTools.utils.exportToCSV(csvData, `${filename}.csv`);
  } else if (format === 'json') {
    PMTools.utils.exportToJSON(window.currentResults, `${filename}.json`);
  }
}

function convertResultsToCSV(results) {
  if (results.type === 'validate') {
    const { params, sampleSize, duration, tradeoffMatrix } = results.data;
    
    // Main results
    const mainData = [{
      metric: params.metricName,
      baseline_rate: params.baselineConversionRate,
      mde: params.minimumDetectableEffect,
      mde_type: params.isRelativeMDE ? 'relative' : 'absolute',
      sample_size_per_variant: sampleSize,
      total_sample_size: sampleSize * params.numVariants,
      estimated_duration_days: duration,
      statistical_power: params.statisticalPower,
      significance_level: params.significanceLevel
    }];
    
    return mainData;
  } else {
    const { results } = results.data;
    
    return [{
      control_users: results.controlUsers,
      control_conversions: results.controlConversions,
      control_rate: results.controlConversionRate,
      treatment_users: results.treatmentUsers,
      treatment_conversions: results.treatmentConversions,
      treatment_rate: results.treatmentConversionRate,
      absolute_lift: results.absoluteLift,
      relative_lift: results.relativeLift,
      p_value: results.pValue,
      is_significant: results.isSignificant,
      confidence_interval_lower: results.confidenceInterval.lower,
      confidence_interval_upper: results.confidenceInterval.upper
    }];
  }
}

function startNewCalculation() {
  hideResults();
  
  // Restore the form if it was collapsed
  const activeTabContent = document.querySelector('.tab-content.active');
  if (activeTabContent) {
    activeTabContent.classList.remove('collapsed');
    const toggleBtn = document.getElementById('formToggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = '▲ Hide Form';
    }
  }
  
  document.querySelector('.tab-content.active form').reset();
  updateMDELabels();
  
  // Scroll to top
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

function scrollToTop() {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Tooltip functionality
function initializeTooltips() {
  const tooltips = document.querySelectorAll('.tooltip');
  const tooltipPopup = document.getElementById('tooltip');
  
  tooltips.forEach(tooltip => {
    tooltip.addEventListener('mouseenter', (e) => showTooltip(e, tooltipPopup));
    tooltip.addEventListener('mouseleave', () => hideTooltip(tooltipPopup));
    tooltip.addEventListener('click', (e) => toggleTooltip(e, tooltipPopup));
  });
  
  // Hide tooltip when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tooltip')) {
      hideTooltip(tooltipPopup);
    }
  });
}

function showTooltip(event, tooltipPopup) {
  const tooltip = event.target;
  const text = tooltip.dataset.tooltip;
  
  if (!text) return;
  
  tooltipPopup.querySelector('.tooltip-content').textContent = text;
  tooltipPopup.style.display = 'block';
  
  // Position tooltip
  const rect = tooltip.getBoundingClientRect();
  const popupRect = tooltipPopup.getBoundingClientRect();
  
  let left = rect.left + rect.width / 2 - popupRect.width / 2;
  let top = rect.top - popupRect.height - 8;
  
  // Adjust if tooltip would go off screen
  if (left < 5) left = 5;
  if (left + popupRect.width > window.innerWidth - 5) {
    left = window.innerWidth - popupRect.width - 5;
  }
  if (top < 5) {
    top = rect.bottom + 8;
  }
  
  tooltipPopup.style.left = left + 'px';
  tooltipPopup.style.top = top + 'px';
}

function hideTooltip(tooltipPopup) {
  tooltipPopup.style.display = 'none';
}

function toggleTooltip(event, tooltipPopup) {
  event.preventDefault();
  event.stopPropagation();
  
  if (tooltipPopup.style.display === 'block') {
    hideTooltip(tooltipPopup);
  } else {
    showTooltip(event, tooltipPopup);
  }
}

async function checkFirstTimeUser() {
  const isCompleted = await PMTools.utils.getStorage(PMTools.STORAGE_KEYS.ONBOARDING_COMPLETED);
  
  if (!isCompleted) {
    // Show welcome message
    setTimeout(() => {
      const message = document.getElementById('validateMessage');
      PMTools.utils.showMessage(
        message, 
        '👋 Welcome to PM Tools! Fill out the form above to validate your first A/B test.', 
        'info'
      );
    }, 500);
    
    // Mark onboarding as completed
    await PMTools.utils.setStorage(PMTools.STORAGE_KEYS.ONBOARDING_COMPLETED, true);
  }
}

console.log('PM Tools popup script loaded');