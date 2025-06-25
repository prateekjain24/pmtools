# PM Tools - Standalone Chrome Extension

A fully standalone Chrome extension for A/B testing calculations and AI-powered insights. No server required!

## 🚀 Features

- **Statistical Calculations**: Sample size, test duration, significance testing
- **AI Insights**: Hypothesis analysis and results interpretation (BYOK)
- **Offline First**: Core features work without internet
- **Chrome Web Store Ready**: No build process, direct installation
- **Secure**: All data stored locally in your browser

## 📦 Installation

### From Chrome Web Store (Recommended)
1. Visit the Chrome Web Store listing
2. Click "Add to Chrome"
3. Start using immediately!

### Developer Installation
1. Download/clone this extension
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select this folder
5. Pin the extension to your toolbar

## 🎯 Quick Start

1. **Click the PM Tools icon** in your browser toolbar
2. **Fill out the experiment form** with your hypothesis and metrics
3. **Get instant results** with sample sizes and duration estimates
4. **Optional**: Add AI API keys in settings for advanced insights

## 🤖 AI Setup (Optional)

PM Tools supports AI-powered insights with your own API keys:

### Google Gemini (Recommended)
1. Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Open PM Tools → Settings
3. Paste your key and test the connection

### Anthropic Claude
1. Get an API key at [Anthropic Console](https://console.anthropic.com/)
2. Open PM Tools → Settings
3. Paste your key and test the connection

## 📊 What You Can Calculate

### Experiment Validation
- Required sample size per variant
- Estimated test duration
- Trade-off analysis (different MDE scenarios)
- Statistical power analysis
- AI hypothesis assessment

### Results Analysis
- Statistical significance testing
- Confidence intervals
- Relative and absolute lift
- AI-powered interpretation and recommendations

## 🔧 Technical Details

### Core Statistical Functions
- Two-proportion z-test for significance
- Sample size calculation with power analysis
- Effect size calculations
- Confidence interval estimation

### Security & Privacy
- All calculations run locally in your browser
- API keys stored securely in Chrome's encrypted storage
- No data sent to external servers (except AI APIs if configured)
- No tracking or analytics

### Browser Support
- Chrome 88+
- Chromium-based browsers (Edge, Brave, Opera)
- Manifest V3 compliant

## 📋 File Structure

```
chrome-extension-standalone/
├── manifest.json          # Extension configuration
├── popup.html            # Main interface
├── popup.js              # UI logic and form handling
├── popup.css             # Styling
├── options.html          # Settings page
├── options.js            # Settings logic
├── options.css           # Settings styling
├── background.js         # Service worker
├── shared.js             # Shared utilities
├── statistics.js         # Statistical calculations
├── llm-client.js         # AI integration
└── assets/
    └── icons/            # Extension icons
```

## 🧮 Statistical Accuracy

All calculations are ported from proven Python implementations using:
- SciPy-equivalent normal distribution functions
- Two-proportion z-test methodology
- Standard power analysis formulas
- 95% confidence intervals

Results match server-side calculations within numerical precision limits.

## 🎨 Design Principles

- **PM-First**: Designed specifically for Product Managers
- **Progressive Disclosure**: Advanced options hidden by default
- **Educational**: Tooltips and explanations throughout
- **Accessible**: Full keyboard navigation and screen reader support
- **Responsive**: Works in popup and full-tab modes

## 🔄 Data Management

### Export Options
- CSV export for spreadsheet analysis
- JSON export for data portability
- Settings backup and restore

### Privacy Controls
- Clear all data option
- Individual API key removal
- No persistent server storage

## 🚀 Chrome Web Store Submission

This extension is ready for Chrome Web Store submission:

1. ✅ Manifest V3 compliant
2. ✅ No external dependencies
3. ✅ Secure API key handling
4. ✅ Privacy-focused design
5. ✅ Comprehensive testing
6. ✅ Professional UI/UX

### Store Assets Required
- Icon: 128x128px PNG (provided)
- Screenshots: 1280x800px or 640x400px
- Promotional images (optional)

## 🛠️ Development

### Making Changes
1. Edit files directly (no build process)
2. Go to `chrome://extensions/`
3. Click refresh on PM Tools
4. Test changes

### Testing
- Manual testing checklist in CLAUDE.md
- Cross-browser compatibility verification
- Statistical accuracy validation
- API integration testing

## 📞 Support

- **Documentation**: Available in extension settings
- **Issues**: Report via GitHub or Chrome Web Store
- **Community**: Join our Discord for PM discussions

## 📄 License

MIT License - See LICENSE file for details

---

**Made with ❤️ for Product Managers everywhere**

*Democratizing A/B testing expertise, one PM at a time.*