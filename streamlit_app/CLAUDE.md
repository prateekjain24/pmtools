# CLAUDE.md - Streamlit Frontend Development

This file provides guidance for working with the Streamlit frontend (`streamlit_app/` directory).

## Frontend Architecture

The Streamlit app is organized for maintainability and reusability:

```
streamlit_app/
├── main.py                 # Main dashboard and navigation
├── pages/
│   ├── validate_setup.py      # Setup validation page
│   └── analyze_results.py     # Results analysis page
├── components/
│   ├── api_client.py          # HTTP client for FastAPI communication
│   └── ui_helpers.py          # Reusable UI components
└── requirements.txt           # Streamlit-specific dependencies
```

## Development Patterns

### Page Structure
```python
# Standard page structure
def main():
    show_api_status()  # Always show API connectivity
    st.title("Page Title")
    
    # Form with validation
    with st.form("form_name"):
        # Input fields
        submitted = st.form_submit_button("Submit")
    
    if submitted:
        # Process and display results
        pass

if __name__ == "__main__":
    main()
```

### API Integration Pattern
```python
from components.api_client import get_api_client, APIError

try:
    with st.spinner("Processing..."):
        client = get_api_client()
        response = client.validate_setup(data)
    
    display_success("Operation completed!")
    # Display results
    
except APIError as e:
    display_error(str(e))
except Exception as e:
    display_error(f"Unexpected error: {str(e)}")
```

### UI Component Usage
```python
from components.ui_helpers import (
    display_statistical_summary,
    display_tradeoff_matrix,
    download_json_button
)

# Display results using helper components
display_statistical_summary(response["statistical_summary"])
download_json_button(response, "results.json", "Download Results")
```

## Running the Frontend

### Development
```bash
# Install dependencies
pip install -r streamlit_app/requirements.txt

# Run with hot reload
cd streamlit_app
uv run streamlit run main.py

# Or from project root
uv run streamlit run streamlit_app/main.py
```

### Configuration
- **API Base URL**: Configured via `API_BASE_URL` environment variable
- **Default**: `http://localhost:8000`
- **Production**: Set to your deployed API URL

## Form Limitations and Solutions

### Streamlit Form Constraints
```python
# ❌ Don't use interactive widgets inside forms
with st.form("my_form"):
    if st.button("Add Item"):  # This will cause error
        pass

# ✅ Use selectbox or other non-interactive widgets
with st.form("my_form"):
    num_items = st.selectbox("Number of Items", [1, 2, 3, 4, 5])
    # Create that many input fields
```

### Dynamic Content
```python
# Use session state for dynamic content outside forms
if 'dynamic_items' not in st.session_state:
    st.session_state.dynamic_items = []

# Add/remove buttons outside forms
col1, col2 = st.columns(2)
with col1:
    if st.button("Add Item"):
        st.session_state.dynamic_items.append({})
        st.rerun()

# Then use in forms
with st.form("form_name"):
    for i, item in enumerate(st.session_state.dynamic_items):
        # Create input fields
        pass
```

## UI Helper Components

### Available Components
- `show_api_status()`: API connection indicator
- `display_error()`, `display_success()`, `display_info()`: Status messages
- `display_statistical_summary()`: Metrics display with charts
- `display_tradeoff_matrix()`: Interactive table and visualization
- `display_hypothesis_assessment()`: AI assessment with gauge
- `display_recommendations()`: Expandable action items
- `create_variant_input_form()`: Dynamic variant entry
- `download_json_button()`: File download functionality

### Creating New Components
```python
def new_component(data: Dict[str, Any], **kwargs):
    """New reusable component."""
    st.subheader("Component Title")
    
    # Component logic
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Metric 1", data.get("value1"))
    with col2:
        st.metric("Metric 2", data.get("value2"))
    
    # Return data if needed
    return processed_data
```

## Styling and Layout

### Custom CSS
```python
st.markdown("""
<style>
    .custom-class {
        property: value;
    }
</style>
""", unsafe_allow_html=True)
```

### Layout Patterns
```python
# Two-column layout
col1, col2 = st.columns(2)
with col1:
    # Left content
with col2:
    # Right content

# Tabs
tab1, tab2, tab3 = st.tabs(["Tab 1", "Tab 2", "Tab 3"])
with tab1:
    # Tab 1 content

# Sidebar
with st.sidebar:
    st.header("Navigation")
    # Sidebar content
```

## Error Handling

### API Connection Issues
```python
# Check API status
from components.api_client import get_api_client

client = get_api_client()
if not client.check_health():
    st.error("API server is not responding. Please ensure it's running on http://localhost:8000")
    st.stop()
```

### Form Validation
```python
# Client-side validation
if not hypothesis.strip():
    st.error("Please enter a hypothesis")
    return

if len(variants) < 2:
    st.error("Please provide at least 2 variants")
    return
```

## Performance Optimization

### Caching
```python
@st.cache_resource
def get_cached_client():
    return APIClient()

@st.cache_data
def expensive_calculation(data):
    # Expensive operations
    return result
```

### Session State Management
```python
# Initialize session state
if 'key' not in st.session_state:
    st.session_state.key = default_value

# Update and rerun
st.session_state.key = new_value
st.rerun()
```

## Testing Frontend

### Manual Testing Checklist
- [ ] API connectivity indicator works
- [ ] Forms validate inputs correctly
- [ ] Error messages are clear and helpful
- [ ] Results display properly
- [ ] Download functions work
- [ ] Navigation between pages works
- [ ] Responsive design on different screen sizes

### Common Issues
- **API not connecting**: Check FastAPI server is running
- **Form errors**: Ensure no interactive widgets inside forms
- **Slow performance**: Use caching for expensive operations
- **State issues**: Clear browser cache or restart Streamlit

## Adding New Pages

1. **Create page file** in `pages/` directory
2. **Follow naming convention**: `new_page.py`
3. **Add navigation** in `main.py` sidebar
4. **Use consistent layout** with `show_api_status()`
5. **Handle errors gracefully** with try/catch blocks
6. **Add page to navigation** in sidebar

## Deployment Considerations

### Environment Variables
```bash
# Production API URL
API_BASE_URL=https://your-api-domain.com

# Streamlit configuration
STREAMLIT_SERVER_PORT=8501
STREAMLIT_SERVER_ADDRESS=0.0.0.0
```

### Docker Deployment
```dockerfile
# In streamlit_app/Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["streamlit", "run", "main.py", "--server.address", "0.0.0.0"]
```