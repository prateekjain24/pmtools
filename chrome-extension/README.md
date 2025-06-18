# PM Tools Chrome Extension

A Chrome extension that provides Product Managers with instant access to A/B testing validation and analysis through the PM Tools API.

## 🎯 Features

- **Experiment Setup Validation**: Calculate sample sizes, test durations, and get AI-powered hypothesis assessments
- **Results Analysis**: Interpret experiment results with statistical analysis and AI-generated insights
- **Configurable API**: Connect to any PM Tools API instance (local, staging, production)
- **Export Functionality**: Download results as JSON or CSV
- **Smart Defaults**: Remember form data and provide intelligent defaults
- **User-Friendly Interface**: Clean, responsive design optimized for quick access

## 📋 Prerequisites

Before installing the extension, ensure you have:

1. **PM Tools API Server**: A running instance of the PM Tools API
   - Default local development: `http://localhost:8000`
   - Must have `/validate/setup` and `/analyze/results` endpoints
   
2. **Chrome Browser**: Version 88 or later (Manifest V3 support)

3. **API Configuration**: Valid API hostname and network access

## 🚀 Installation

### Development Installation

1. **Clone or download** the extension files to your local machine

2. **Open Chrome** and navigate to `chrome://extensions/`

3. **Enable Developer Mode** by toggling the switch in the top-right corner

4. **Click "Load unpacked"** and select the `chrome-extension` folder

5. **Pin the extension** to your toolbar for easy access

### Configuration

1. **Open Extension Settings**:
   - Right-click the PM Tools extension icon
   - Select "Options" or click the settings (⚙️) button in the popup

2. **Configure API Connection**:
   - Enter your API hostname (e.g., `http://localhost:8000`)
   - Use environment presets for quick setup
   - Test the connection to verify it's working

3. **Customize Settings**:
   - Set statistical defaults (power, significance level)
   - Configure user experience preferences
   - Choose default export format

## 💡 Usage

### Validating Experiment Setup

1. **Click the extension icon** in your toolbar
2. **Select "Validate Setup" tab** (🔬)
3. **Fill out the form**:
   - Enter your hypothesis
   - Specify primary metric and baseline rate
   - Set minimum detectable effect (relative % or absolute)
   - Enter daily user estimates
4. **Click "Validate Setup"** to get results
5. **Review recommendations** including sample sizes and duration estimates
6. **Export results** if needed for sharing

### Analyzing Experiment Results

1. **Switch to "Analyze Results" tab** (📊)
2. **Enter experiment context**:
   - Original hypothesis
   - Primary metric name
   - Optional PM notes
3. **Input results data**:
   - Add variant data (users and conversions)
   - Use + and - buttons to add/remove variants
4. **Click "Analyze Results"** to get insights
5. **Review AI interpretation** and recommended next steps
6. **Export analysis** for documentation

## ⚙️ Configuration Options

### API Settings
- **Hostname**: Full URL to your PM Tools API
- **Environment Presets**: Quick selection for local/staging/production
- **Connection Test**: Verify API accessibility
- **Advanced Settings**: Timeout, retry attempts, retry delay

### Statistical Defaults
- **Power**: Default statistical power (recommended: 80%)
- **Significance**: Default alpha level (recommended: 5%)
- **Variants**: Default number of test variants
- **MDE Type**: Preference for relative vs absolute effect sizes

### User Experience
- **Theme**: Light, dark, or auto (system)
- **Auto-save**: Automatically save form data
- **Clear on Success**: Reset forms after successful submission
- **Tooltips**: Show helpful explanations
- **Export Format**: Default format for downloaded results

## 🔧 Troubleshooting

### Common Issues

**Extension not loading**:
- Ensure you're using Chrome 88+
- Check that Developer Mode is enabled
- Verify all files are in the correct directory structure

**API connection failed**:
- Verify the API server is running
- Check the hostname URL format (include http:// or https://)
- Test connection from the options page
- Ensure no firewall/network restrictions

**Forms not submitting**:
- Check for validation errors (red outlines)
- Verify API connection status (green dot in header)
- Check browser console for error messages

**Results not displaying**:
- Refresh the extension popup
- Check API server logs for errors
- Verify request/response format compatibility

### Error Messages

- **"Connection failed"**: API server not accessible
- **"Validation Error"**: Form data doesn't meet requirements
- **"Server Error"**: API server internal error
- **"Timeout Error"**: Request took too long (increase timeout)

## 🔒 Privacy & Security

- **No Data Collection**: Extension doesn't collect or transmit personal data
- **Local Processing**: All data stays between your browser and your API server
- **Secure Storage**: Settings stored using Chrome's encrypted storage APIs
- **No Third-Party Services**: Direct communication with your API only

## 📖 API Compatibility

This extension is compatible with PM Tools API v1.0+. Required endpoints:

- `GET /health` - Health check
- `POST /validate/setup` - Experiment validation
- `POST /analyze/results` - Results analysis
- `GET /llm/status` - LLM provider status (optional)

## 🆘 Support

### Getting Help

1. **Check this documentation** for common issues
2. **Test API connection** in extension settings
3. **Check browser console** for error messages
4. **Verify API server logs** for backend issues

### Useful Information for Support

When reporting issues, include:
- Chrome version
- Extension version
- API server version
- Error messages from browser console
- Steps to reproduce the issue

## 📄 License

Copyright © 2024 PM Tools. All rights reserved.

## 🔄 Updates

The extension will notify you when updates are available through the Chrome Extensions page. Updates may include:

- New features and functionality
- Bug fixes and performance improvements
- API compatibility updates
- UI/UX enhancements

---

**Happy experimenting!** 🧪📊