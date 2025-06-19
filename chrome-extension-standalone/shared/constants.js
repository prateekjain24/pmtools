// Constants for PM Tools Standalone Edition
// Self-sufficient Chrome extension with BYOK AI integration

// ==================== LLM CONFIGURATION ====================

export const LLM_PROVIDERS = {
  GEMINI: 'gemini',
  CLAUDE: 'claude'
};

export const LLM_CONFIG = {
  [LLM_PROVIDERS.GEMINI]: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
    description: 'Google\'s latest AI model (typically lower cost)',
    setupUrl: 'https://aistudio.google.com/',
    costEstimate: 'Low cost - great for getting started'
  },
  [LLM_PROVIDERS.CLAUDE]: {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-20241022',
    description: 'Anthropic\'s advanced reasoning model',
    setupUrl: 'https://console.anthropic.com/',
    costEstimate: 'Higher cost - excellent quality'
  }
};

export const DEFAULT_LLM_SETTINGS = {
  defaultProvider: LLM_PROVIDERS.GEMINI,
  fallbackEnabled: true,
  timeout: 30000 // 30 seconds for LLM calls
};

// ==================== STATISTICAL CONFIGURATION ====================

export const STATISTICAL_DEFAULTS = {
  statistical_power: 0.80,
  significance_level: 0.05,
  variants: 2,
  mde_type: 'relative'
};

export const MDE_PRESETS = {
  conservative: {
    relative: [0.05, 0.10, 0.15, 0.20, 0.25, 0.30],
    absolute: [0.005, 0.01, 0.015, 0.02, 0.025, 0.03]
  },
  aggressive: {
    relative: [0.10, 0.20, 0.30, 0.50, 0.75, 1.00],
    absolute: [0.01, 0.02, 0.03, 0.05, 0.075, 0.10]
  }
};

// ==================== USER PREFERENCES ====================

export const USER_EXPERIENCE_DEFAULTS = {
  theme: 'light',
  autoSave: true,
  clearOnSuccess: false,
  showTooltips: true,
  exportFormat: 'json',
  animationEnabled: true
};

export const BYOK_DEFAULTS = {
  googleApiKey: '',
  anthropicApiKey: '',
  defaultProvider: LLM_PROVIDERS.GEMINI,
  fallbackEnabled: true,
  maskKeysInUI: true
};

// Combined User Preferences Schema
export const DEFAULT_USER_PREFERENCES = {
  statisticalDefaults: STATISTICAL_DEFAULTS,
  userExperience: USER_EXPERIENCE_DEFAULTS,
  llmSettings: DEFAULT_LLM_SETTINGS,
  byokSettings: BYOK_DEFAULTS
};

// ==================== STORAGE CONFIGURATION ====================

export const STORAGE_KEYS = {
  // User preferences and settings
  userPreferences: 'pmtools_standalone_preferences',
  
  // API keys (stored separately for security)
  googleApiKey: 'pmtools_google_api_key',
  anthropicApiKey: 'pmtools_anthropic_api_key',
  
  // Form data persistence
  formDataValidate: 'pmtools_form_data_validate',
  formDataAnalyze: 'pmtools_form_data_analyze',
  
  // Results and history
  recentResults: 'pmtools_recent_results',
  
  // Legacy keys for migration
  legacyConfig: 'pmtools_config',
  legacyPreferences: 'pmtools_user_preferences'
};

// ==================== UI CONFIGURATION ====================

export const FORM_VALIDATION = {
  MIN_HYPOTHESIS_LENGTH: 10,
  MAX_HYPOTHESIS_LENGTH: 500,
  MIN_USERS: 100,
  MAX_USERS: 10000000,
  MIN_CONVERSION_RATE: 0.001,
  MAX_CONVERSION_RATE: 0.999,
  MIN_MDE_RELATIVE: 0.01,
  MAX_MDE_RELATIVE: 2.0,
  MIN_MDE_ABSOLUTE: 0.0001,
  MAX_MDE_ABSOLUTE: 0.5
};

export const EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv'
};

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// ==================== ERROR MESSAGES ====================

export const ERROR_MESSAGES = {
  // API Key related
  NO_API_KEYS: "No API keys configured 🔑 (Head to Settings to add your keys!)",
  INVALID_API_KEY: "API key seems to be having trust issues 🤔 (Double-check it in Settings)",
  API_KEY_EXPIRED: "Your API key expired faster than sprint estimates 📅 (Time for a refresh!)",
  LLM_QUOTA_EXCEEDED: "You've hit your AI quota like a PM hits deadlines ⏰ (Check your usage limits)",
  
  // Network and service errors
  LLM_SERVICE_DOWN: "AI service is taking a break ☕ (Try the other provider or wait a moment)",
  NETWORK_ERROR: "Network hiccup detected 📡 (Check your connection and try again)",
  TIMEOUT_ERROR: "AI is thinking harder than a PM during planning 🤖 (This happens sometimes)",
  
  // Validation errors
  VALIDATION_ERROR: "Houston, we have an input problem 🚀 (Double-check those numbers and try again)",
  HYPOTHESIS_TOO_SHORT: "Your hypothesis needs more substance than 'make it better' 📝 (Be specific!)",
  CONVERSIONS_EXCEED_USERS: "Conversions can't exceed users 🔢 (Unless you've discovered time travel)",
  SAMPLE_SIZE_TOO_SMALL: "Sample size smaller than your team's attention span 📏 (You need more data!)",
  MDE_TOO_AMBITIOUS: "That MDE is more optimistic than a PM's initial timeline estimate 🎯 (Try something realistic)",
  
  // Statistical errors
  INSUFFICIENT_DATA: "Not enough data to make statisticians happy 📊 (More data = better insights)",
  CALCULATION_ERROR: "Math went sideways on us 🧮 (This is awkward... try again?)",
  
  // General errors
  UNKNOWN_ERROR: 'Something unexpected happened 🎭 (Even we didn\'t see this one coming)',
  STORAGE_ERROR: 'Storage hiccup detected 💾 (Your browser might be feeling overwhelmed)'
};

export const SUCCESS_MESSAGES = {
  // Setup and configuration
  SETTINGS_SAVED: '⚙️ Settings saved! You\'re ready to analyze like a pro',
  API_KEY_SAVED: '🔑 API key saved securely! Your AI assistant is ready',
  CONNECTION_TEST_SUCCESS: '🎉 API connection successful! Your AI is ready to help',
  
  // Analysis and validation
  VALIDATION_SUCCESS: '🎯 Setup validated! Your experiment is ready to make stakeholders happy',
  ANALYSIS_COMPLETE: '✨ Analysis complete! Time to make some data-driven decisions',
  HYPOTHESIS_ASSESSMENT_COMPLETE: '📝 Hypothesis assessed! Check the feedback for improvements',
  
  // Data management
  DATA_EXPORTED: '📊 Data exported! Time to make some spreadsheet magic happen',
  FORM_AUTO_SAVED: '💾 Form auto-saved (because losing work is worse than losing users)',
  
  // AI responses
  AI_INSIGHTS_READY: '🧠 AI insights ready! Scroll down to see the analysis',
  FALLBACK_PROVIDER_SUCCESS: '🔄 Backup AI provider worked! Your analysis is complete'
};

export const TIP_MESSAGES = {
  // Statistical tips
  SAMPLE_SIZE_MATTERS: '🎯 Pro tip: Bigger sample size = more reliable results (but longer tests)',
  ONE_THING_AT_TIME: '🔬 Test one thing at a time (resist the kitchen sink approach)',
  BASELINE_IMPORTANCE: '📊 Know your baseline - it\'s the foundation of good experiments',
  STATISTICAL_VS_PRACTICAL: '⚠️ Statistical significance ≠ business significance (math can\'t fix bad ideas)',
  
  // BYOK tips
  GEMINI_COST_EFFICIENT: '💰 Gemini is typically more cost-effective for frequent use',
  CLAUDE_HIGHER_QUALITY: '🏆 Claude often provides more nuanced analysis (at higher cost)',
  ENABLE_FALLBACK: '🛡️ Enable fallback for redundancy - one provider down? No problem!',
  MONITOR_USAGE: '📈 Keep an eye on your API usage to manage costs',
  
  // General tips
  MOBILE_CONSIDERATIONS: '📱 Don\'t forget mobile users - they\'re probably half your traffic',
  SEASONAL_EFFECTS: '📅 Consider seasonality - Black Friday results won\'t match Tuesday in March',
  SEGMENT_ANALYSIS: '🎭 Segment analysis can reveal hidden patterns (age, device, location)',
  CONTEXT_MATTERS: '📝 Add PM context for better AI insights - context is everything!'
};

export const WARNING_MESSAGES = {
  // Statistical warnings
  LOW_SAMPLE_SIZE: '🚩 Red flag: Sample size might be too small for reliable results',
  HIGH_MDE: '⚠️ Warning: That\'s a pretty ambitious improvement target',
  VERY_LONG_TEST: '📅 Heads up: This test will run longer than your average product roadmap',
  MULTIPLE_VARIANTS: '🎭 Remember: More variants = more complexity (and more chances for confusion)',
  
  // API and cost warnings
  HIGH_API_USAGE: '💸 Heads up: You\'re using a lot of AI credits today',
  SINGLE_PROVIDER: '⚠️ Only one AI provider configured - consider adding a backup',
  API_KEY_EXPIRING: '📅 Your API key expires soon - time to renew!',
  
  // Data warnings
  WEEKEND_EFFECT: '📆 Consider weekday vs weekend behavior differences',
  SMALL_EFFECT_SIZE: '🔍 Small effect detected - practical significance might be limited',
  INCONCLUSIVE_RESULTS: '🤷 Results are inconclusive - consider running longer or bigger'
};

// ==================== TOOLTIP CONTENT ====================

export const TOOLTIP_CONTENT = {
  // Validate form tooltips
  hypothesis: "Be specific! Good: 'Changing CTA from X to Y will increase signups by 15%'. Bad: 'Make button better'",
  baselineConversion: "Your current conversion rate. If you don't know it, check your analytics or estimate conservatively",
  mdeType: "Relative: % change (easier to think about). Absolute: raw percentage points (more precise)",
  relativeMDE: "How much % improvement you want to detect. 10% = detecting a 10% relative increase",
  absoluteMDE: "Raw percentage point change. 0.01 = 1 percentage point increase (5% → 6%)",
  statisticalPower: "Probability of detecting an effect if it exists. 80% is standard, 90% is more robust",
  significanceLevel: "Probability of false positive. 5% is standard - stricter = harder to reach significance",
  estimatedUsers: "Daily active users who'll see your test. Be realistic - not your total user base!",
  variants: "Number of test variations. Keep it simple - more variants = longer tests",
  
  // Analyze form tooltips
  variantName: "Clear names like 'Control', 'Blue Button', 'New Copy' help everyone understand results",
  users: "Total users who saw this variant during the test period",
  conversions: "Users who completed your goal action (signup, purchase, click, etc.)",
  pmNotes: "Your qualitative insights help AI provide better analysis. What did you observe?",
  
  // Settings tooltips
  defaultProvider: "Which AI you prefer. Gemini is usually cheaper, Claude often more detailed",
  fallbackEnabled: "If your primary AI fails, automatically try the backup. Recommended!",
  exportFormat: "JSON keeps all data, CSV is spreadsheet-friendly",
  autoSave: "Saves your work as you type - because losing data is worse than losing users",
  
  // API key tooltips
  googleApiKey: "Get free credits at Google AI Studio. Keep this secret - treat it like a password!",
  anthropicApiKey: "Sign up at Anthropic Console. More expensive but often higher quality analysis"
};

// ==================== FEATURE FLAGS ====================

export const FEATURES = {
  ADVANCED_STATISTICS: true,
  SEGMENTATION_ANALYSIS: true,
  EXPORT_FUNCTIONALITY: true,
  AUTO_SAVE: true,
  TOOLTIPS: true,
  ANIMATIONS: true,
  DARK_MODE: false, // Future feature
  MULTI_METRIC: false // Future feature
};

// ==================== VERSION INFO ====================

export const VERSION_INFO = {
  version: '1.0.0',
  name: 'PM Tools - Standalone Edition',
  description: 'Self-sufficient A/B testing tool with BYOK AI integration',
  repository: 'https://github.com/prateekjain24/pmtools',
  documentation: 'https://github.com/prateekjain24/pmtools/tree/main/chrome-extension-standalone'
};