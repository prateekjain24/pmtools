import streamlit as st
from components.ui_helpers import show_api_status

# Page configuration
st.set_page_config(
    page_title="PM Tools - A/B Testing",
    page_icon="🧪",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        text-align: center;
        padding: 2rem 0;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 10px;
        margin-bottom: 2rem;
    }
    .feature-card {
        padding: 1.5rem;
        border-radius: 10px;
        border: 1px solid #e0e0e0;
        margin: 1rem 0;
        background: #f8f9fa;
    }
    .metric-card {
        text-align: center;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
</style>
""", unsafe_allow_html=True)

def main():
    """Main dashboard page."""
    
    # Show API status
    show_api_status()
    
    # Main header
    st.markdown("""
    <div class="main-header">
        <h1>🧪 PM Tools Dashboard</h1>
        <p>Your AI-powered A/B Testing Statistical Consultant</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Introduction
    st.markdown("""
    Welcome to PM Tools! This application helps Product Managers design sound experiments, 
    interpret complex results with confidence, and build a rapid, cumulative learning loop.
    """)
    
    # Feature cards
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        <div class="feature-card">
            <h3>🔬 Validate Experiment Setup</h3>
            <p>Get instant feedback on your A/B test design:</p>
            <ul>
                <li>Calculate required sample sizes</li>
                <li>Estimate test duration</li>
                <li>Explore trade-offs between speed and sensitivity</li>
                <li>AI-powered hypothesis assessment</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("🚀 Start Experiment Validation", use_container_width=True):
            st.switch_page("pages/validate_setup.py")
    
    with col2:
        st.markdown("""
        <div class="feature-card">
            <h3>📊 Analyze Test Results</h3>
            <p>Transform raw data into actionable insights:</p>
            <ul>
                <li>Statistical significance testing</li>
                <li>AI-generated interpretation narratives</li>
                <li>Actionable next steps and recommendations</li>
                <li>Segment analysis capabilities</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("📈 Analyze Results", use_container_width=True):
            st.switch_page("pages/analyze_results.py")
    
    # Quick stats section
    st.markdown("---")
    st.subheader("🎯 Key Benefits")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown("""
        <div class="metric-card">
            <h2>⚡</h2>
            <h4>Fast</h4>
            <p>Instant statistical calculations</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="metric-card">
            <h2>🧠</h2>
            <h4>Smart</h4>
            <p>AI-powered insights</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
        <div class="metric-card">
            <h2>📚</h2>
            <h4>Educational</h4>
            <p>Learn while you work</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        st.markdown("""
        <div class="metric-card">
            <h2>🔧</h2>
            <h4>Practical</h4>
            <p>Actionable recommendations</p>
        </div>
        """, unsafe_allow_html=True)
    
    # Sidebar with navigation
    with st.sidebar:
        st.header("🧭 Navigation")
        
        if st.button("🏠 Dashboard", use_container_width=True):
            st.rerun()
        
        if st.button("🔬 Validate Setup", use_container_width=True):
            st.switch_page("pages/validate_setup.py")
        
        if st.button("📊 Analyze Results", use_container_width=True):
            st.switch_page("pages/analyze_results.py")
        
        st.markdown("---")
        st.header("ℹ️ About")
        st.markdown("""
        **PM Tools** is a headless A/B Testing API designed to serve as a statistical consultant 
        for Product Managers. It combines rigorous statistical analysis with AI-powered insights 
        to help you make confident, data-driven decisions.
        
        **Features:**
        - Statistical power analysis
        - Sample size calculations  
        - Significance testing
        - AI interpretation & recommendations
        - Segment analysis
        
        **Built with:**
        - FastAPI (Backend)
        - Streamlit (Frontend)
        - Google Gemini & Anthropic Claude (AI)
        """)

if __name__ == "__main__":
    main()