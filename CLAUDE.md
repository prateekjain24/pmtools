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

### Known Issues (Resolved)
- ~~**Results Hidden in Fold 2**: Results were not immediately visible after analysis~~ ✅ Fixed June 2025
- ~~**Auto-scroll Not Working**: ID mismatch prevented scrollToResults from functioning~~ ✅ Fixed June 2025