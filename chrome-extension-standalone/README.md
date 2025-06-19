# PM Tools - Standalone Edition 🚀

**Self-sufficient A/B testing validation and analysis tool with bring-your-own-key AI integration for Product Managers.**

## ✨ What Makes This Special

This is a **completely self-sufficient** version of PM Tools that:
- 🔑 **Bring Your Own Key (BYOK)**: Use your own Google Gemini or Anthropic Claude API keys
- 🏠 **No Backend Required**: All calculations run locally in your browser
- 🔒 **Privacy First**: Your API keys and data never leave your browser
- 💰 **Cost Control**: You control your own AI usage and costs
- ⚡ **Fast**: No network round-trips for statistical calculations

## 🆚 Standalone vs API-Dependent Version

| Feature | Standalone Edition | API-Dependent Version |
|---------|-------------------|----------------------|
| **Setup Required** | Just API keys | Full backend server |
| **Privacy** | Everything local | Data sent to backend |
| **Cost** | Pay for your own AI usage | Server hosting costs |
| **Dependencies** | None (except your API keys) | PM Tools API server |
| **Performance** | Instant calculations | Network latency |
| **Distribution** | Standalone installation | Requires infrastructure |

## 🚀 Quick Start

### 1. Get Your API Keys

**Option A: Google Gemini (Recommended)**
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the key for setup

**Option B: Anthropic Claude**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create a new API key
3. Copy the key for setup

### 2. Install the Extension

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select the `chrome-extension-standalone` folder
5. Pin the extension to your toolbar

### 3. Configure Your API Keys

1. Right-click the extension icon → "Options"
2. Enter your API key(s) in the settings
3. Choose your preferred AI provider
4. Save and you're ready to go!

## 🎯 Features

### **Validate Experiment Setup**
- Statistical power analysis and sample size calculations
- Trade-off matrices showing test duration vs effect size
- AI-powered hypothesis assessment and improvement suggestions
- Risk analysis and feasibility evaluation

### **Analyze Experiment Results**
- Statistical significance testing with confidence intervals
- Effect size calculations and practical significance assessment
- AI-generated interpretation in plain English
- Actionable recommendations and follow-up questions
- Segmentation analysis support

### **Smart Features**
- Auto-save form data as you type
- Export results in JSON or CSV format
- Clickable tooltips with helpful explanations
- Auto-scroll to results (no more "hidden results" confusion!)
- PM-friendly language throughout

## 🔧 Technical Details

### **Statistical Calculations**
All performed locally using JavaScript implementations of:
- Sample size calculations (power analysis)
- Two-proportion z-tests
- Confidence interval estimation
- Effect size calculations

### **AI Integration**
Direct API calls to:
- **Google Gemini API** (generativelanguage.googleapis.com)
- **Anthropic Claude API** (api.anthropic.com)

### **Security**
- API keys stored securely in Chrome's encrypted storage
- No logging or exposure of sensitive data
- HTTPS-only communication with AI providers

## 🛠️ Development

### **Project Structure**
```
chrome-extension-standalone/
├── manifest.json           # Extension configuration
├── popup/                  # Main interface
├── options/               # Settings page
├── background/            # Service worker
├── shared/               # Utilities and libraries
└── assets/               # Icons and static files
```

### **Key Technologies**
- **Chrome Extensions Manifest V3**
- **Vanilla JavaScript** (ES6 modules)
- **Local Statistical Calculations** (JavaScript implementations)
- **Direct AI API Integration** (Gemini + Claude)

### **Loading in Development**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select this folder
4. Make changes → click reload extension button

## 🧪 Testing Your Extension

### **Phase 1: Load and Basic Setup**

1. **Load the Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select this `chrome-extension-standalone` folder
   - ✅ Extension should appear without errors
   - ✅ Icon should show in browser toolbar with orange ⚡ badge (no API keys yet)

2. **First Launch Test**:
   - Click the PM Tools extension icon
   - ✅ Popup should open (600x800px) with clean interface
   - ✅ Two tabs visible: "Validate Setup" and "Analyze Results"
   - ✅ Status should show "No API keys configured" warning message
   - ✅ Settings button (⚙️) should be visible in header

### **Phase 2: Statistical Functions Test**

3. **Test Validate Setup (Without AI)**:
   ```
   Sample Test Data:
   - Hypothesis: "Changing button color from blue to red will increase click rate by 15%"
   - Baseline conversion rate: 5%
   - MDE Type: Relative
   - Relative MDE: 15%
   - Statistical Power: 80%
   - Significance Level: 5%
   - Estimated daily users: 10000
   - Variants: 2
   ```
   - ✅ Form should accept all inputs without errors
   - ✅ Click "Validate Setup" button
   - ✅ Results should appear with sample size (~7,700), duration, trade-off matrix
   - ✅ AI assessment should show fallback message (no API keys)

4. **Test Analyze Results (Without AI)**:
   ```
   Sample Test Data:
   - Hypothesis: "Red button increases clicks"
   - Primary Metric: "Click-through rate"
   - Control: 1000 users, 50 conversions
   - Treatment: 1000 users, 65 conversions
   - PM Notes: "Ran for 2 weeks, no external factors"
   ```
   - ✅ Form should accept all inputs without errors
   - ✅ Click "Analyze Results" button  
   - ✅ Results should show statistical analysis (p-value ~0.067, not significant)
   - ✅ AI insights should show fallback messages

### **Phase 3: BYOK Configuration** 

5. **Configure API Keys**:
   - Right-click extension icon → "Options" OR click ⚙️ in popup
   - ✅ Options page should open with BYOK interface
   - ✅ Two provider sections: Google Gemini and Anthropic Claude
   - ✅ API key inputs should be masked by default
   - ✅ "Get API Key" links should work
   - ✅ Eye icons should toggle visibility

6. **Test API Connection** (If you have keys):
   - Add your Google API key or Anthropic API key
   - ✅ Status indicator should update to show "Connected" 
   - ✅ "Test Connection" button should work
   - ✅ Extension badge should turn green (at least one key working)
   - ✅ Save settings should persist keys securely

### **Phase 4: AI-Powered Analysis** (If API keys configured)

7. **Test with AI**:
   - Return to popup and repeat validate/analyze tests
   - ✅ Hypothesis assessment should show AI scores and suggestions
   - ✅ Results interpretation should show detailed AI analysis
   - ✅ Recommendations should appear with confidence levels
   - ✅ Follow-up questions should be generated

### **Phase 5: Advanced Features**

8. **Test Export Functions**:
   - ✅ Export JSON should download complete data
   - ✅ Export CSV should create spreadsheet-friendly format
   - ✅ Both formats should include all analysis data

9. **Test Settings and Preferences**:
   - ✅ Statistical defaults should persist
   - ✅ Theme settings should work (light mode)
   - ✅ Auto-save should preserve form data between sessions
   - ✅ Tooltip system should work (click ℹ️ buttons)

10. **Test Error Handling**:
    - ✅ Invalid inputs should show clear error messages
    - ✅ Missing required fields should be caught
    - ✅ API failures should show fallback content
    - ✅ Network issues should be handled gracefully

### **Expected Test Results**

**✅ PASS Criteria:**
- Extension loads without console errors
- Statistical calculations produce reasonable results
- Forms validate inputs properly  
- BYOK configuration works
- AI integration works (if keys provided)
- Export functions work
- Settings persist correctly
- Privacy and security maintained

**❌ FAIL Indicators:**
- Console errors on load
- Statistical calculations return NaN or unrealistic values
- Forms accept invalid data
- API keys don't save or connect
- Settings don't persist
- Data sent to unauthorized endpoints

## 💡 Usage Tips

### **For Best Results**
- Use specific, measurable hypotheses
- Include baseline metrics and expected effect sizes
- Add context in the "PM Notes" field for better AI insights
- Test with realistic traffic estimates

### **Cost Management**
- Start with Google Gemini (typically lower cost)
- Enable fallback for redundancy
- Monitor your API usage in the provider consoles

### **Troubleshooting**
- Check API key configuration in Options
- Ensure you have sufficient API credits
- Try the alternative AI provider if one fails
- Check browser console for detailed error messages

## 🔗 Related

- **[Original PM Tools](../chrome-extension/)**: API-dependent version
- **[PM Tools API](../app/)**: Backend service for the original version
- **[Streamlit App](../streamlit_app/)**: Web interface version

## 📋 License

This is part of the PM Tools project. See the main repository for licensing information.

---

**Made for Product Managers, by Product Managers** 💼

*No servers, no setup, just results.* ⚡