// PM Tools Standalone Edition - Popup JavaScript
// Self-sufficient A/B testing with local calculations and direct LLM integration

import { 
  showMessage, 
  clearMessages, 
  formatNumber, 
  formatPercentage, 
  downloadJSON, 
  downloadCSV,
  saveFormData,
  loadFormData,
  validateRequired,
  validateNumber,
  validateInteger,
  formatTextToHTML,
  initializeTooltips,
  refreshTooltips,
  getStorageData,
  setStorageData
} from '../shared/utils.js';

import {
  calculateSampleSize,
  calculateTestDuration,
  generateTradeoffMatrix,
  calculateConversionMetrics,
  analyzeSegments,
  validateStatisticalInputs,
  getDefaultMDEValues
} from '../shared/statistics.js';

import {
  getLLMManager,
  getAPIKeys,
  LLM_PROMPTS,
  parseHypothesisAssessment,
  parseRecommendations,
  parseFollowupQuestions
} from '../shared/llm-client.js';

import {
  STORAGE_KEYS,
  DEFAULT_USER_PREFERENCES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  WARNING_MESSAGES,
  TIP_MESSAGES,
  FORM_VALIDATION
} from '../shared/constants.js';

class StandalonePopupManager {
  constructor() {
    this.currentTab = 'validate';
    this.currentResults = null;
    this.variantCount = 2;
    this.userPreferences = null;
    this.llmManager = null;
    
    this.init();
  }

  async init() {
    try {
      // Load user preferences
      await this.loadUserPreferences();
      
      // Initialize LLM manager
      await this.initializeLLMManager();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize UI
      this.initializeUI();
      
      // Initialize enhanced tooltips
      initializeTooltips();
      
      // Check AI status
      this.checkAIStatus();
      
      // Load saved form data
      this.loadSavedFormData();
      
      console.log('🚀 PM Tools Standalone Popup initialized');
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      showMessage(
        document.getElementById('messages'),
        ERROR_MESSAGES.UNKNOWN_ERROR,
        'error'
      );
    }
  }

  async loadUserPreferences() {
    this.userPreferences = await getStorageData(STORAGE_KEYS.userPreferences) 
      || DEFAULT_USER_PREFERENCES;
  }

  async initializeLLMManager() {
    try {
      this.llmManager = await getLLMManager();
    } catch (error) {
      console.warn('LLM Manager initialization failed:', error);
    }
  }

  async checkAIStatus() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    try {
      const apiKeys = await getAPIKeys();
      const hasKeys = apiKeys.googleApiKey || apiKeys.anthropicApiKey;
      
      if (hasKeys) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'AI Ready';
        statusText.className = 'status-text connected';
      } else {
        statusDot.className = 'status-dot warning';
        statusText.textContent = 'No API Keys';
        statusText.className = 'status-text warning';
        
        showMessage(
          document.getElementById('messages'),
          ERROR_MESSAGES.NO_API_KEYS,
          'warning',
          10000
        );
      }
    } catch (error) {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Status Error';
      statusText.className = 'status-text error';
    }
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Form submissions - prevent default form submission
    document.getElementById('validateSubmit').addEventListener('click', (e) => {
      e.preventDefault();
      this.validateSetup();
    });
    document.getElementById('analyzeSubmit').addEventListener('click', (e) => {
      e.preventDefault();
      this.analyzeResults();
    });

    // Export buttons
    document.getElementById('exportValidateJson').addEventListener('click', () => this.exportResults('validate', 'json'));
    document.getElementById('exportValidateCsv').addEventListener('click', () => this.exportResults('validate', 'csv'));
    document.getElementById('exportAnalyzeJson').addEventListener('click', () => this.exportResults('analyze', 'json'));
    document.getElementById('exportAnalyzeCsv').addEventListener('click', () => this.exportResults('analyze', 'csv'));

    // Variant management
    document.getElementById('addVariant').addEventListener('click', () => this.addVariant());

    // MDE type switching
    document.querySelectorAll('input[name="mdeType"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.toggleMDEGroups(e.target.value));
    });

    // Settings and refresh buttons
    document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
    document.getElementById('refreshBtn').addEventListener('click', () => this.refreshConnection());

    // Real-time validation
    this.setupRealTimeValidation();

    // Auto-save functionality
    if (this.userPreferences?.userExperience?.autoSave !== false) {
      document.addEventListener('input', this.debounce(() => this.autoSaveFormData(), 2000));
    }

    // Clear forms on success (if enabled)
    if (this.userPreferences?.userExperience?.clearOnSuccess) {
      // This will be handled in result display methods
    }
  }

  initializeUI() {
    // Set initial tab
    this.switchTab('validate');
    
    // Set statistical defaults from user preferences
    this.populateStatisticalDefaults();
    
    // Initialize variant fields
    this.updateVariantFields();
    
    // Set export format preference
    this.updateExportButtons();
    
    // Initialize MDE groups visibility
    const initialMdeType = document.querySelector('input[name="mdeType"]:checked')?.value || 'relative';
    this.toggleMDEGroups(initialMdeType);
  }

  populateStatisticalDefaults() {
    const stats = this.userPreferences?.statisticalDefaults || DEFAULT_USER_PREFERENCES.statisticalDefaults;
    
    // Set power
    const powerSelect = document.getElementById('power');
    if (powerSelect) {
      powerSelect.value = stats.statistical_power;
    }
    
    // Set significance
    const sigSelect = document.getElementById('significance');
    if (sigSelect) {
      sigSelect.value = stats.significance_level;
    }
    
    // Set variants
    if (stats.variants !== this.variantCount) {
      this.variantCount = stats.variants;
      this.updateVariantFields();
    }
    
    // Set MDE type
    const mdeRadios = document.querySelectorAll('input[name="mdeType"]');
    mdeRadios.forEach(radio => {
      radio.checked = radio.value === stats.mde_type;
    });
  }

  updateExportButtons() {
    const format = this.userPreferences?.userExperience?.exportFormat || 'json';
    
    // Update button visibility or styling based on preference
    document.querySelectorAll('.export-btn').forEach(btn => {
      if (btn.textContent.toLowerCase().includes(format)) {
        btn.style.order = '1'; // Preferred format first
      }
    });
  }

  toggleMDEGroups(mdeType) {
    const relativeMdeGroup = document.getElementById('relativeMdeGroup');
    const absoluteMdeGroup = document.getElementById('absoluteMdeGroup');
    
    if (mdeType === 'relative') {
      relativeMdeGroup.classList.remove('hidden');
      absoluteMdeGroup.classList.add('hidden');
    } else {
      relativeMdeGroup.classList.add('hidden');
      absoluteMdeGroup.classList.remove('hidden');
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
      if (button.dataset.tab === tabName) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-panel').forEach(panel => {
      if (panel.id === `${tabName}Panel`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
    
    // Clear messages when switching tabs
    clearMessages(document.getElementById('messages'));
    
    // Load saved data for the new tab
    this.loadSavedFormData();
  }

  async validateSetup() {
    const submitBtn = document.getElementById('validateSubmit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    try {
      clearMessages(document.getElementById('messages'));
      
      // Show loading state
      this.setLoadingState(submitBtn, btnText, btnSpinner, true);
      
      // Get and validate form data
      const formData = this.getValidateFormData();
      this.validateForm(formData, 'validate');
      
      // Perform local statistical calculations
      const statisticalResults = this.performStatisticalCalculations(formData);
      
      // Get AI assessment if available
      let aiAssessment = null;
      if (this.llmManager) {
        try {
          const prompt = LLM_PROMPTS.hypothesisAssessment(formData.hypothesis);
          const llmResponse = await this.llmManager.generateText(prompt);
          aiAssessment = parseHypothesisAssessment(llmResponse.text);
          aiAssessment.provider = llmResponse.provider;
          aiAssessment.fallback_used = llmResponse.fallback_used;
        } catch (error) {
          console.warn('AI assessment failed:', error);
          aiAssessment = this.getFallbackHypothesisAssessment();
        }
      } else {
        aiAssessment = this.getFallbackHypothesisAssessment();
      }
      
      // Combine results
      const results = {
        ...statisticalResults,
        hypothesis_assessment: aiAssessment,
        input_data: formData,
        timestamp: new Date().toISOString()
      };
      
      // Display results
      this.displayValidateResults(results);
      
      // Auto-scroll to results
      setTimeout(() => {
        this.scrollToResults('validate');
      }, 500);
      
      // Save results
      this.currentResults = { validate: results };
      
      // Show success message
      showMessage(
        document.getElementById('messages'),
        SUCCESS_MESSAGES.VALIDATION_SUCCESS,
        'success'
      );
      
    } catch (error) {
      console.error('Validation failed:', error);
      
      if (error.message && error.message.includes('API key')) {
        showMessage(
          document.getElementById('messages'),
          ERROR_MESSAGES.NO_API_KEYS,
          'error'
        );
      } else {
        showMessage(
          document.getElementById('messages'),
          error.message || ERROR_MESSAGES.CALCULATION_ERROR,
          'error'
        );
      }
    } finally {
      this.setLoadingState(submitBtn, btnText, btnSpinner, false);
    }
  }

  async analyzeResults() {
    const submitBtn = document.getElementById('analyzeSubmit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    
    try {
      clearMessages(document.getElementById('messages'));
      
      // Show loading state
      this.setLoadingState(submitBtn, btnText, btnSpinner, true);
      
      // Get and validate form data
      const formData = this.getAnalyzeFormData();
      this.validateForm(formData, 'analyze');
      
      // Perform local statistical analysis
      const statisticalResults = this.performStatisticalAnalysis(formData);
      
      // Get AI insights if available
      let aiInsights = null;
      if (this.llmManager) {
        try {
          aiInsights = await this.getAIInsights(formData, statisticalResults);
        } catch (error) {
          console.warn('AI insights failed:', error);
          aiInsights = this.getFallbackAIInsights();
        }
      } else {
        aiInsights = this.getFallbackAIInsights();
      }
      
      // Combine results
      const results = {
        ...statisticalResults,
        ai_insights: aiInsights,
        input_data: formData,
        timestamp: new Date().toISOString()
      };
      
      // Display results
      this.displayAnalyzeResults(results);
      
      // Auto-scroll to results
      setTimeout(() => {
        this.scrollToResults('analyze');
      }, 500);
      
      // Save results
      this.currentResults = { ...this.currentResults, analyze: results };
      
      // Show success message
      showMessage(
        document.getElementById('messages'),
        SUCCESS_MESSAGES.ANALYSIS_COMPLETE,
        'success'
      );
      
    } catch (error) {
      console.error('Analysis failed:', error);
      
      if (error.message && error.message.includes('API key')) {
        showMessage(
          document.getElementById('messages'),
          ERROR_MESSAGES.NO_API_KEYS,
          'error'
        );
      } else {
        showMessage(
          document.getElementById('messages'),
          error.message || ERROR_MESSAGES.CALCULATION_ERROR,
          'error'
        );
      }
    } finally {
      this.setLoadingState(submitBtn, btnText, btnSpinner, false);
    }
  }

  performStatisticalCalculations(formData) {
    // Calculate sample size
    const sampleSize = calculateSampleSize(
      formData.baseline_conversion_rate,
      formData.minimum_detectable_effect,
      formData.statistical_power,
      formData.significance_level,
      formData.mde_type === 'relative'
    );
    
    // Calculate test duration
    const duration = calculateTestDuration(
      sampleSize,
      formData.estimated_daily_users,
      formData.variants
    );
    
    // Generate trade-off matrix
    const mdeValues = getDefaultMDEValues(formData.mde_type === 'relative');
    const tradeoffMatrix = generateTradeoffMatrix(
      formData.baseline_conversion_rate,
      formData.estimated_daily_users,
      mdeValues,
      formData.statistical_power,
      formData.significance_level,
      formData.mde_type === 'relative',
      formData.variants
    );
    
    return {
      sample_size_per_variant: sampleSize,
      estimated_duration_days: Math.round(duration * 10) / 10,
      total_sample_size: sampleSize * formData.variants,
      trade_off_matrix: tradeoffMatrix,
      statistical_power: formData.statistical_power,
      significance_level: formData.significance_level,
      mde_type: formData.mde_type,
      minimum_detectable_effect: formData.minimum_detectable_effect
    };
  }

  performStatisticalAnalysis(formData) {
    // Get variants data
    const variants = formData.variants;
    
    // Calculate overall metrics (assuming first two variants are control/treatment)
    const controlVariant = variants[0];
    const treatmentVariant = variants[1];
    
    const overallMetrics = calculateConversionMetrics(
      controlVariant.users,
      controlVariant.conversions,
      treatmentVariant.users,
      treatmentVariant.conversions
    );
    
    // Analyze segments if provided
    let segmentAnalysis = [];
    if (formData.segments && formData.segments.length > 0) {
      segmentAnalysis = analyzeSegments(formData.segments);
    }
    
    return {
      overall_results: overallMetrics,
      segment_analysis: segmentAnalysis,
      variant_summary: variants.map(v => ({
        name: v.name,
        users: v.users,
        conversions: v.conversions,
        conversion_rate: v.users > 0 ? (v.conversions / v.users) : 0
      }))
    };
  }

  async getAIInsights(formData, statisticalResults) {
    const insights = {};
    
    // Get interpretation
    const interpretationPrompt = LLM_PROMPTS.resultsInterpretation(
      formData.hypothesis,
      formData.primary_metric_name,
      statisticalResults.overall_results,
      formData.pm_notes
    );
    const interpretationResponse = await this.llmManager.generateText(interpretationPrompt);
    insights.interpretation = {
      text: interpretationResponse.text,
      provider: interpretationResponse.provider,
      fallback_used: interpretationResponse.fallback_used
    };
    
    // Get recommendations
    const recommendationsPrompt = LLM_PROMPTS.recommendations(
      formData.hypothesis,
      statisticalResults.overall_results,
      formData.pm_notes
    );
    const recommendationsResponse = await this.llmManager.generateText(recommendationsPrompt);
    insights.recommendations = parseRecommendations(recommendationsResponse.text);
    
    // Get follow-up questions
    const questionsPrompt = LLM_PROMPTS.followupQuestions(
      formData.hypothesis,
      statisticalResults.overall_results,
      formData.pm_notes
    );
    const questionsResponse = await this.llmManager.generateText(questionsPrompt);
    insights.followup_questions = parseFollowupQuestions(questionsResponse.text);
    
    return insights;
  }

  getFallbackHypothesisAssessment() {
    return {
      score: null,
      assessment: "AI assessment unavailable. Please review hypothesis manually for clarity, measurability, and specificity.",
      suggestions: "Ensure hypothesis specifies what is changing, expected metric impact, and magnitude of change.",
      provider: 'fallback',
      fallback_used: true
    };
  }

  getFallbackAIInsights() {
    return {
      interpretation: {
        text: "AI interpretation unavailable. Please review the statistical results manually: Check if results are statistically significant (p-value < 0.05), evaluate practical significance of the effect size, and consider business context.",
        provider: 'fallback',
        fallback_used: true
      },
      recommendations: [{
        action: "REVIEW RESULTS MANUALLY",
        confidence: "Medium",
        rationale: "AI analysis unavailable. Review statistical significance and effect size to make decision."
      }],
      followup_questions: [
        "What segments showed different behavior patterns?",
        "Were there any external factors during the test period?",
        "How do these results compare to historical baselines?",
        "What would be the business impact of implementing this change?",
        "Should we test variations of this approach?"
      ]
    };
  }

  getValidateFormData() {
    const formData = new FormData(document.getElementById('validateForm'));
    const mdeType = document.querySelector('input[name="mdeType"]:checked')?.value || 'relative';
    
    return {
      hypothesis: formData.get('hypothesis'),
      metricName: formData.get('metricName'),
      baseline_conversion_rate: parseFloat(formData.get('baselineRate')),
      minimum_detectable_effect: parseFloat(formData.get(mdeType === 'relative' ? 'relativeMde' : 'absoluteMde')),
      mde_type: mdeType,
      statistical_power: parseFloat(formData.get('power')),
      significance_level: parseFloat(formData.get('significance')),
      estimated_daily_users: parseInt(formData.get('dailyUsers')),
      variants: parseInt(formData.get('variants') || '2')
    };
  }

  getAnalyzeFormData() {
    // Get basic form data
    const formData = new FormData(document.getElementById('analyzeForm'));
    
    // Get variants data
    const variants = [];
    const variantElements = document.querySelectorAll('.variant-group');
    
    variantElements.forEach((element, index) => {
      const nameField = element.querySelector(`input[name="variant_${index}_name"]`);
      const usersField = element.querySelector(`input[name="variant_${index}_users"]`);
      const conversionsField = element.querySelector(`input[name="variant_${index}_conversions"]`);
      
      if (nameField && usersField && conversionsField) {
        const name = nameField.value;
        const users = parseInt(usersField.value);
        const conversions = parseInt(conversionsField.value);
        
        variants.push({ name, users, conversions });
      }
    });
    
    return {
      hypothesis: formData.get('analyzeHypothesis'),
      primary_metric_name: formData.get('primaryMetric'),
      pm_notes: formData.get('pmNotes'),
      variants: variants,
      segments: [] // Segments support can be added later
    };
  }

  validateForm(data, formType) {
    const errors = [];
    
    if (formType === 'validate') {
      // Validate hypothesis
      if (!data.hypothesis || data.hypothesis.length < FORM_VALIDATION.MIN_HYPOTHESIS_LENGTH) {
        errors.push('Hypothesis too short - need more detail');
      }
      
      // Validate conversion rate
      if (!data.baseline_conversion_rate || data.baseline_conversion_rate <= 0 || data.baseline_conversion_rate >= 1) {
        errors.push('Baseline conversion rate must be between 0 and 1');
      }
      
      // Validate MDE
      if (!data.minimum_detectable_effect || data.minimum_detectable_effect <= 0) {
        errors.push('Minimum detectable effect must be positive');
      }
      
      // Validate users
      if (!data.estimated_daily_users || data.estimated_daily_users < FORM_VALIDATION.MIN_USERS) {
        errors.push(`Need at least ${FORM_VALIDATION.MIN_USERS} users`);
      }
      
    } else if (formType === 'analyze') {
      // Validate hypothesis
      if (!data.hypothesis || data.hypothesis.length < FORM_VALIDATION.MIN_HYPOTHESIS_LENGTH) {
        errors.push('Hypothesis too short - need more detail');
      }
      
      // Validate variants
      if (!data.variants || data.variants.length < 2) {
        errors.push('Need at least 2 variants');
      }
      
      // Validate variant data
      data.variants.forEach((variant, index) => {
        if (!variant.name) {
          errors.push(`Variant ${index + 1} needs a name`);
        }
        if (variant.users <= 0) {
          errors.push(`Variant ${index + 1} needs positive user count`);
        }
        if (variant.conversions < 0) {
          errors.push(`Variant ${index + 1} can't have negative conversions`);
        }
        if (variant.conversions > variant.users) {
          errors.push(`Variant ${index + 1} conversions can't exceed users`);
        }
      });
    }
    
    if (errors.length > 0) {
      throw new Error(errors[0]);
    }
  }

  displayValidateResults(results) {
    const resultsDiv = document.getElementById('validateResults');
    const resultsContent = document.getElementById('validateResultsContent');
    
    // Sample size and duration
    const duration = results.estimated_duration_days;
    const durationText = duration < 1 ? `${Math.round(duration * 7)} days` : `${Math.round(duration)} days`;
    
    let html = `
      <div class="results-section">
        <h3>📊 Sample Size Analysis</h3>
        <div class="results-grid">
          <div class="result-item">
            <div class="result-label">Sample Size per Variant</div>
            <div class="result-value">${formatNumber(results.sample_size_per_variant)}</div>
          </div>
          <div class="result-item">
            <div class="result-label">Total Sample Size</div>
            <div class="result-value">${formatNumber(results.total_sample_size)}</div>
          </div>
          <div class="result-item">
            <div class="result-label">Estimated Test Duration</div>
            <div class="result-value">${durationText}</div>
          </div>
        </div>
      </div>
    `;
    
    // Trade-off matrix
    html += `
      <div class="results-section">
        <h3>⚖️ Trade-off Analysis</h3>
        <div class="trade-off-table">
          <div class="table-header">
            <div>MDE</div>
            <div>Sample Size</div>
            <div>Duration</div>
          </div>
    `;
    
    results.trade_off_matrix.forEach(row => {
      const mdeDisplay = row.mde_type === 'relative' 
        ? formatPercentage(row.mde)
        : (row.mde * 100).toFixed(1) + 'pp';
      
      html += `
        <div class="table-row">
          <div>${mdeDisplay}</div>
          <div>${formatNumber(row.sample_size_per_variant)}</div>
          <div>${row.estimated_duration_days}d</div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    // AI Assessment
    if (results.hypothesis_assessment) {
      const assessment = results.hypothesis_assessment;
      const scoreColor = assessment.score >= 7 ? 'green' : assessment.score >= 5 ? 'orange' : 'red';
      
      html += `
        <div class="results-section">
          <h3>🤖 AI Hypothesis Assessment</h3>
          ${assessment.score ? `<div class="assessment-score" style="color: ${scoreColor}">Score: ${assessment.score}/10</div>` : ''}
          <div class="assessment-text">${formatTextToHTML(assessment.assessment)}</div>
          ${assessment.suggestions ? `<div class="suggestions"><strong>Suggestions:</strong> ${formatTextToHTML(assessment.suggestions)}</div>` : ''}
          ${assessment.fallback_used ? '<div class="ai-notice">⚠️ Using fallback analysis (AI unavailable)</div>' : ''}
        </div>
      `;
    }
    
    // Set content in the content area
    resultsContent.innerHTML = html;
    
    // Show the results container by removing hidden class
    resultsDiv.classList.remove('hidden');
  }

  displayAnalyzeResults(results) {
    const resultsDiv = document.getElementById('analyzeResults');
    const resultsContent = document.getElementById('analyzeResultsContent');
    
    // Overall results
    const overall = results.overall_results;
    const isSignificant = overall.is_significant;
    const significanceColor = isSignificant ? 'green' : 'red';
    
    let html = `
      <div class="results-section">
        <h3>📈 Statistical Results</h3>
        <div class="results-grid">
          <div class="result-item">
            <div class="result-label">Control Conversion</div>
            <div class="result-value">${formatPercentage(overall.control_conversion_rate)}</div>
          </div>
          <div class="result-item">
            <div class="result-label">Treatment Conversion</div>
            <div class="result-value">${formatPercentage(overall.treatment_conversion_rate)}</div>
          </div>
          <div class="result-item">
            <div class="result-label">Relative Lift</div>
            <div class="result-value">${formatPercentage(overall.relative_lift)}</div>
          </div>
          <div class="result-item">
            <div class="result-label">P-value</div>
            <div class="result-value">${overall.p_value.toFixed(4)}</div>
          </div>
          <div class="result-item">
            <div class="result-label">Statistical Significance</div>
            <div class="result-value" style="color: ${significanceColor}">
              ${isSignificant ? '✅ Significant' : '❌ Not Significant'}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // AI Insights
    if (results.ai_insights) {
      const insights = results.ai_insights;
      
      // Interpretation
      html += `
        <div class="results-section">
          <h3>🧠 AI Interpretation</h3>
          <div class="interpretation-text">${formatTextToHTML(insights.interpretation.text)}</div>
          ${insights.interpretation.fallback_used ? '<div class="ai-notice">⚠️ Using fallback analysis (AI unavailable)</div>' : ''}
        </div>
      `;
      
      // Recommendations
      if (insights.recommendations && insights.recommendations.length > 0) {
        html += `
          <div class="results-section">
            <h3>💡 Recommendations</h3>
            <div class="recommendations">
        `;
        
        insights.recommendations.forEach((rec, index) => {
          const confidenceColor = rec.confidence === 'High' ? 'green' : rec.confidence === 'Medium' ? 'orange' : 'red';
          html += `
            <div class="recommendation">
              <div class="rec-header">
                <strong>${index + 1}. ${rec.action}</strong>
                <span class="confidence" style="color: ${confidenceColor}">${rec.confidence} Confidence</span>
              </div>
              <div class="rec-rationale">${rec.rationale}</div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      }
      
      // Follow-up questions
      if (insights.followup_questions && insights.followup_questions.length > 0) {
        html += `
          <div class="results-section">
            <h3>❓ Follow-up Questions</h3>
            <ul class="followup-questions">
        `;
        
        insights.followup_questions.forEach(question => {
          html += `<li>${question}</li>`;
        });
        
        html += `
            </ul>
          </div>
        `;
      }
    }
    
    // Set content in the content area
    resultsContent.innerHTML = html;
    
    // Show the results container by removing hidden class
    resultsDiv.classList.remove('hidden');
  }

  setLoadingState(button, textEl, spinnerEl, isLoading) {
    button.disabled = isLoading;
    if (isLoading) {
      textEl.classList.add('hidden');
      spinnerEl.classList.remove('hidden');
    } else {
      textEl.classList.remove('hidden');
      spinnerEl.classList.add('hidden');
    }
  }

  scrollToResults(tabName) {
    const resultsEl = document.getElementById(`${tabName}Results`);
    if (resultsEl) {
      resultsEl.scrollIntoView({ behavior: 'smooth' });
      
      // Add visual highlight if animations enabled
      if (this.userPreferences?.userExperience?.animationEnabled !== false) {
        resultsEl.style.animation = 'resultHighlight 2s ease-in-out';
        setTimeout(() => {
          resultsEl.style.animation = '';
        }, 2000);
      }
    }
  }

  addVariant() {
    this.variantCount++;
    this.updateVariantFields();
  }

  updateVariantFields() {
    const container = document.getElementById('variantFields');
    if (!container) return;
    
    let html = '';
    for (let i = 0; i < this.variantCount; i++) {
      const label = i === 0 ? 'Control' : i === 1 ? 'Treatment' : `Variant ${i + 1}`;
      html += `
        <div class="variant-group">
          <div class="variant-header">
            <h4>${label}</h4>
            ${i >= 2 ? `<button type="button" class="btn-remove" onclick="this.closest('.variant-group').remove()">×</button>` : ''}
          </div>
          <div class="variant-fields">
            <div class="form-group">
              <label for="variant${i}Name">Variant Name</label>
              <input type="text" id="variant${i}Name" name="variant${i}Name" value="${label}" class="form-input">
            </div>
            <div class="form-group">
              <label for="variant${i}Users">Users</label>
              <input type="number" id="variant${i}Users" name="variant${i}Users" min="1" class="form-input">
            </div>
            <div class="form-group">
              <label for="variant${i}Conversions">Conversions</label>
              <input type="number" id="variant${i}Conversions" name="variant${i}Conversions" min="0" class="form-input">
            </div>
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  }

  exportResults(tabName, format) {
    if (!this.currentResults || !this.currentResults[tabName]) {
      showMessage(
        document.getElementById('messages'),
        'No results to export',
        'warning'
      );
      return;
    }
    
    const data = this.currentResults[tabName];
    const filename = `pmtools-${tabName}-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'json') {
      downloadJSON(data, filename);
    } else {
      downloadCSV(data, filename);
    }
    
    showMessage(
      document.getElementById('messages'),
      SUCCESS_MESSAGES.DATA_EXPORTED,
      'success',
      3000
    );
  }

  autoSaveFormData() {
    try {
      if (this.currentTab === 'validate') {
        const validateData = this.getValidateFormData();
        setStorageData(STORAGE_KEYS.formDataValidate, validateData);
      } else if (this.currentTab === 'analyze') {
        const analyzeData = this.getAnalyzeFormData();
        setStorageData(STORAGE_KEYS.formDataAnalyze, analyzeData);
      }
    } catch (error) {
      // Silent fail for auto-save
      console.warn('Auto-save failed:', error);
    }
  }

  async loadSavedFormData() {
    try {
      if (this.currentTab === 'validate') {
        const savedData = await getStorageData(STORAGE_KEYS.formDataValidate);
        if (savedData) {
          this.populateValidateForm(savedData);
        }
      } else {
        const savedData = await getStorageData(STORAGE_KEYS.formDataAnalyze);
        if (savedData) {
          this.populateAnalyzeForm(savedData);
        }
      }
    } catch (error) {
      console.warn('Failed to load saved form data:', error);
    }
  }

  populateValidateForm(data) {
    try {
      // Basic fields
      if (data.hypothesis) {
        const hypothesisField = document.getElementById('hypothesis');
        if (hypothesisField) hypothesisField.value = data.hypothesis;
      }
      
      if (data.metricName) {
        const metricField = document.getElementById('metricName');
        if (metricField) metricField.value = data.metricName;
      }
      
      if (data.baseline_conversion_rate !== undefined) {
        const baselineField = document.getElementById('baselineRate');
        if (baselineField) baselineField.value = data.baseline_conversion_rate;
      }
      
      if (data.estimated_daily_users !== undefined) {
        const dailyUsersField = document.getElementById('dailyUsers');
        if (dailyUsersField) dailyUsersField.value = data.estimated_daily_users;
      }
      
      // MDE type radio buttons
      if (data.mde_type) {
        const mdeRadios = document.querySelectorAll('input[name="mdeType"]');
        mdeRadios.forEach(radio => {
          radio.checked = radio.value === data.mde_type;
        });
        
        // Show/hide appropriate MDE input groups
        this.toggleMDEGroups(data.mde_type);
      }
      
      // MDE values
      if (data.minimum_detectable_effect !== undefined) {
        if (data.mde_type === 'relative') {
          const relativeMdeField = document.getElementById('relativeMde');
          if (relativeMdeField) relativeMdeField.value = data.minimum_detectable_effect;
        } else {
          const absoluteMdeField = document.getElementById('absoluteMde');
          if (absoluteMdeField) absoluteMdeField.value = data.minimum_detectable_effect;
        }
      }
      
      // Advanced options
      if (data.statistical_power !== undefined) {
        const powerField = document.getElementById('power');
        if (powerField) powerField.value = data.statistical_power;
      }
      
      if (data.significance_level !== undefined) {
        const significanceField = document.getElementById('significance');
        if (significanceField) significanceField.value = data.significance_level;
      }
      
      if (data.variants !== undefined) {
        const variantsField = document.getElementById('variants');
        if (variantsField) variantsField.value = data.variants;
      }
      
      console.log('✅ Validate form populated with saved data');
    } catch (error) {
      console.warn('Failed to populate validate form:', error);
    }
  }

  populateAnalyzeForm(data) {
    try {
      // Context fields
      if (data.hypothesis) {
        const hypothesisField = document.getElementById('analyzeHypothesis');
        if (hypothesisField) hypothesisField.value = data.hypothesis;
      }
      
      if (data.primary_metric_name) {
        const metricField = document.getElementById('primaryMetric');
        if (metricField) metricField.value = data.primary_metric_name;
      }
      
      if (data.pm_notes) {
        const notesField = document.getElementById('pmNotes');
        if (notesField) notesField.value = data.pm_notes;
      }
      
      // Variants data
      if (data.variants && Array.isArray(data.variants)) {
        // Update variant count if needed
        const expectedVariants = data.variants.length;
        if (expectedVariants !== this.variantCount) {
          this.variantCount = expectedVariants;
          this.updateVariantFields();
        }
        
        // Populate variant data
        data.variants.forEach((variant, index) => {
          if (variant.name) {
            const nameField = document.querySelector(`input[name="variant_${index}_name"]`);
            if (nameField) nameField.value = variant.name;
          }
          
          if (variant.users !== undefined) {
            const usersField = document.querySelector(`input[name="variant_${index}_users"]`);
            if (usersField) usersField.value = variant.users;
          }
          
          if (variant.conversions !== undefined) {
            const conversionsField = document.querySelector(`input[name="variant_${index}_conversions"]`);
            if (conversionsField) conversionsField.value = variant.conversions;
          }
        });
      }
      
      console.log('✅ Analyze form populated with saved data');
    } catch (error) {
      console.warn('Failed to populate analyze form:', error);
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  async refreshConnection() {
    await this.checkAIStatus();
    showMessage(
      document.getElementById('messages'),
      'Connection status refreshed',
      'info',
      3000
    );
  }

  setupRealTimeValidation() {
    // Validate fields on input/change events
    const validateForm = document.getElementById('validateForm');
    if (validateForm) {
      validateForm.addEventListener('input', this.debounce(() => this.validateCurrentForm(), 500));
      validateForm.addEventListener('change', () => this.validateCurrentForm());
    }
    
    const analyzeForm = document.getElementById('analyzeForm');
    if (analyzeForm) {
      analyzeForm.addEventListener('input', this.debounce(() => this.validateCurrentForm(), 500));
      analyzeForm.addEventListener('change', () => this.validateCurrentForm());
    }
  }

  validateCurrentForm() {
    try {
      if (this.currentTab === 'validate') {
        const formData = this.getValidateFormData();
        this.showValidationMessages('validate', formData);
      } else if (this.currentTab === 'analyze') {
        const formData = this.getAnalyzeFormData();
        this.showValidationMessages('analyze', formData);
      }
    } catch (error) {
      // Silent fail for real-time validation
      console.warn('Real-time validation failed:', error);
    }
  }

  showValidationMessages(formType, data) {
    const messagesEl = document.getElementById('messages');
    clearMessages(messagesEl);
    
    try {
      this.validateForm(data, formType);
      // If validation passes, show success or clear messages
      showMessage(messagesEl, '✅ Form validation passed', 'success', 2000);
    } catch (error) {
      // Show validation error in real-time
      showMessage(messagesEl, error.message, 'warning', 5000);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new StandalonePopupManager();
});