# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PM Tools is a comprehensive A/B testing solution for Product Managers, consisting of two integrated components:

1. **FastAPI Backend** (`app/`) - Statistical calculations and LLM-powered analysis
2. **Chrome Extension** (`chrome-extension/`) - Browser-based UI for instant access

The project serves as a "statistical consultant in a box" providing:
- **Pre-Experiment Feasibility Calculator** - Validates experiment design before running tests
- **Post-Experiment Results Interpreter** - Analyzes results with AI-powered insights

### 🎯 Standalone Chrome Extension (COMPLETED - December 2024)
The standalone Chrome extension is now fully implemented with:
- ✅ All statistical calculations running client-side in JavaScript
- ✅ BYOK (Bring Your Own Key) model with dynamic model selection
- ✅ No server dependencies - works entirely in the browser
- ✅ Direct API calls to Gemini and Anthropic
- ✅ Enhanced statistical accuracy with proper formulas
- ✅ PM-focused AI prompts for actionable insights
- ✅ Real-time model discovery from API providers
- ✅ 24-hour caching for model lists
- ✅ Markdown to HTML conversion for LLM responses
- ✅ Structured JSON output for reliable LLM responses (June 2025)

#### Key Documentation Files
- `chrome-extension-standalone/README.md` - Technical implementation details
- `chrome-extension-standalone/IMPLEMENTATION_V2.md` - Standalone version architecture
- `chrome-extension-standalone/publish.md` - Chrome Web Store publishing guide (June 2025)

## Memory

### Temporal Memories
- We are in June 2025

## Chrome Extension Features

### 🚀 Recent Updates (June 2025)

#### Enhanced Results Visibility
- **Fixed Auto-Scroll**: Results now properly scroll into view after calculations
- **Visual Notifications**: "📊 Results ready below ↓" notification appears briefly
- **Attention Animation**: Results section highlighted with blue border and pulse effect
- **Form Collapse**: Forms automatically collapse after showing results to maximize space
- **Smooth Scrolling**: Added smooth scroll behavior throughout the extension
- **ID Mismatch Fix**: Corrected scrollToResults() to use proper element ID 'resultsSection'

#### Implementation Details
- Fixed ID mismatch in shared.js (was looking for 'results-section', now 'resultsSection')
- Added 150ms delay before scrolling to ensure DOM is fully rendered
- Implemented slideInFade/slideOutFade animations for notifications
- Added pulse animation for visual highlight effect
- Form collapse feature with toggle button for better space utilization

### Structured LLM Output (June 2025)
- **Problem**: LLM responses had broken markdown formatting (e.g., `**3/10**`, incomplete bold markers)
- **Solution**: Implemented Pydantic-style structured JSON output
- **Features**:
  - JSON schemas for hypothesis analysis and results interpretation
  - Direct HTML rendering from structured data (no regex parsing)
  - Support for both Gemini (JSON mode) and Anthropic
  - Professional UI with tables, colored indicators, and semantic sections
  - Backward compatibility with text-based parsing as fallback
- **Benefits**:
  - Eliminates markdown parsing errors completely
  - Type-safe responses with validation
  - Consistent formatting regardless of LLM quirks
  - Cleaner, more maintainable code

### Modern Minimalist UI Redesign (June 2025)
- **Objective**: Transform the extension from a colorful, emoji-heavy interface to a sophisticated, minimalist design
- **Design Philosophy**: Black & white color scheme for timeless, professional appearance
- **Color Palette Changes**:
  - Primary color: #000000 (pure black)
  - Secondary color: #ffffff (pure white)
  - Accent colors: Various shades of gray (#f8f8f8, #e5e5e5, #999999, #666666, #333333)
  - Removed all blues, greens, reds, and purple gradients
- **Typography & Icons**:
  - Removed all emoji icons (🧪, 📊, ⚙️, etc.)
  - Replaced with clean text labels and minimal symbols (?, ↑, ↻)
  - Enhanced typography hierarchy using font weights instead of colors
- **Component Updates**:
  - **Headers**: White background with black text, removed gradient backgrounds
  - **Buttons**: Black background with white text, inverted on hover
  - **Forms**: Clean borders, subtle grayscale focus states
  - **AI Insights**: Removed purple gradient, now uses bordered design
  - **Status Indicators**: Replaced colored badges with black/white contrast
  - **Messages**: Monochromatic styling with border emphasis
- **Benefits**:
  - Professional, distraction-free interface
  - Better accessibility with maximum contrast
  - Timeless design that won't look dated
  - Focus on content and functionality over decoration
  - Consistent visual language throughout the extension
- **Technical Implementation**:
  - Updated CSS variables in popup.css and options.css
  - Modified HTML files to remove emoji references
  - Maintained all existing functionality and calculations
  - Updated default LLM models to latest versions (Gemini 2.5 Pro, Claude Sonnet 4.0)

### Chrome Web Store Publishing Guide (June 2025)
- **Documentation Created**: Comprehensive `publish.md` file in `chrome-extension-standalone/`
- **Publishing Requirements**:
  - Manifest V3 compliance verified (no remote code execution)
  - One-time $5 USD developer registration fee
  - Minimum 1 screenshot required (1280x800 px), up to 5 recommended
  - Privacy policy required due to data handling permissions
  - 1-3 day typical review time
- **Store Listing Content Prepared**:
  - **Name**: PM Tools - A/B Testing Assistant
  - **Short Description**: Statistical power calculator & AI insights for A/B tests. Your personal PM consultant for experiment design & results analysis.
  - **Category**: Productivity
  - **Detailed Description**: Comprehensive feature list emphasizing local calculations, BYOK model, and privacy-first approach
- **Permission Justifications Documented**:
  - **storage**: Save user preferences, API keys (encrypted), and form data locally
  - **notifications**: Alert users when calculations or AI analysis complete
  - **alarms**: Periodic cache cleanup and auto-save functionality
  - **host_permissions**: Optional AI API access (only when user provides keys)
- **Privacy Policy Template**: Created with Chrome Web Store compliance, emphasizing:
  - All calculations run locally
  - No analytics or tracking
  - API keys only used for direct AI service communication
  - Adherence to Limited Use requirements
- **Publishing Strategy**:
  - Start with "Unlisted" visibility for beta testing
  - Gather feedback before public release
  - Phased rollout recommended (5% → 50% → 100%)
- **Key Files**:
  - Extension package excludes test files, documentation, and development files
  - ZIP command: `zip -r pm-tools-extension.zip . -x "test-*" "*.md" ".*" "*~" "*.zip"`

### Known Issues (Resolved)
- ~~**Results Hidden in Fold 2**: Results were not immediately visible after analysis~~ ✅ Fixed June 2025
- ~~**Auto-scroll Not Working**: ID mismatch prevented scrollToResults from functioning~~ ✅ Fixed June 2025
- ~~**Broken Markdown in LLM Responses**: Raw markdown like `**text**` showing incorrectly~~ ✅ Fixed June 2025 with structured output