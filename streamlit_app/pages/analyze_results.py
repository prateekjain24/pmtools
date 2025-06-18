import streamlit as st
import pandas as pd
from components.ui_helpers import (
    show_api_status, display_error, display_success, display_statistical_summary,
    display_recommendations, display_followup_questions, create_variant_input_form,
    download_json_button
)
from components.api_client import get_api_client, APIError

# Page configuration
st.set_page_config(
    page_title="Analyze Results - PM Tools",
    page_icon="📊",
    layout="wide"
)

def create_segment_input() -> list:
    """Create input form for segment data."""
    segments = []
    
    st.subheader("📊 Segment Analysis (Optional)")
    
    # Simple checkbox to enable/disable segments
    enable_segments = st.checkbox("Enable Segment Analysis", help="Analyze results broken down by user segments")
    
    if enable_segments:
        num_segments = st.selectbox(
            "Number of Segments",
            options=[1, 2, 3],
            index=0,
            help="How many segments do you want to analyze?"
        )
        
        # Create input fields for each segment
        for i in range(num_segments):
            with st.expander(f"Segment {i+1}", expanded=True):
                # Segment name
                segment_name = st.text_input(
                    "Segment Name", 
                    value=f"Segment {i+1}",
                    key=f"segment_name_{i}",
                    help="e.g., 'Mobile Users', 'New Users', 'Premium Users'"
                )
                
                # Number of variants for this segment
                num_variants = st.selectbox(
                    f"Variants in {segment_name}",
                    options=[2, 3, 4],
                    index=0,
                    key=f"seg_{i}_variants"
                )
                
                # Variants for this segment
                segment_variants = []
                for j in range(num_variants):
                    st.write(f"**Variant {j+1}**")
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        name = st.text_input(
                            "Name", 
                            value="Control" if j == 0 else f"Treatment {j}",
                            key=f"seg_{i}_var_name_{j}"
                        )
                    with col2:
                        users = st.number_input(
                            "Users", 
                            min_value=0, 
                            value=500, 
                            key=f"seg_{i}_var_users_{j}"
                        )
                    with col3:
                        conversions = st.number_input(
                            "Conversions", 
                            min_value=0, 
                            max_value=users, 
                            value=25 if j == 0 else 35, 
                            key=f"seg_{i}_var_conversions_{j}"
                        )
                    
                    if name.strip():
                        segment_variants.append({
                            "name": name,
                            "users": int(users),
                            "conversions": int(conversions)
                        })
                
                if segment_name.strip() and len(segment_variants) >= 2:
                    segments.append({
                        "segment_name": segment_name,
                        "variants": segment_variants
                    })
    
    return segments

def main():
    """Results analysis page."""
    
    show_api_status()
    
    st.title("📊 Experiment Results Analysis")
    st.markdown("""
    Transform your raw experiment data into actionable insights. Get statistical analysis, 
    AI-powered interpretation, and concrete next steps.
    """)
    
    # Input form
    with st.form("results_analysis_form"):
        st.subheader("📝 Experiment Context")
        
        col1, col2 = st.columns(2)
        
        with col1:
            hypothesis = st.text_area(
                "Original Hypothesis",
                placeholder="We believed that the new checkout flow would increase conversions...",
                help="The hypothesis you were testing",
                height=100
            )
            
            metric_name = st.text_input(
                "Primary Metric Name",
                value="conversion_rate",
                help="Name of the metric you were measuring"
            )
        
        with col2:
            pm_notes = st.text_area(
                "PM Notes (Optional)",
                placeholder="Any additional context about the experiment, external factors, observations...",
                help="Qualitative context that might help interpret the results",
                height=120
            )
        
        # Variant data input
        variants = create_variant_input_form()
        
        # Segment data input
        segments = create_segment_input()
        
        # Submit button
        submitted = st.form_submit_button("🔍 Analyze Results", use_container_width=True)
    
    # Process form submission
    if submitted:
        # Validation
        if not hypothesis.strip():
            display_error("Please enter the original hypothesis")
            return
        
        if not metric_name.strip():
            display_error("Please enter the primary metric name")
            return
        
        if len(variants) < 2:
            display_error("Please provide at least 2 variants")
            return
        
        # Prepare API request data
        results_data = {
            "context": {
                "hypothesis": hypothesis,
                "primary_metric_name": metric_name,
                "pm_notes": pm_notes if pm_notes.strip() else None
            },
            "results_data": {
                "variants": variants
            }
        }
        
        # Add segments if provided
        if segments:
            results_data["results_data"]["segments"] = segments
        
        # Call API
        try:
            with st.spinner("Analyzing your experiment results..."):
                client = get_api_client()
                response = client.analyze_results(results_data)
            
            display_success("Results analysis completed!")
            
            # Display results
            st.markdown("---")
            
            # Statistical summary
            display_statistical_summary(response["statistical_summary"])
            
            # Segment analysis (if available)
            if "segment_analysis" in response and response["segment_analysis"]:
                st.markdown("---")
                st.subheader("🎯 Segment Analysis")
                
                for segment in response["segment_analysis"]:
                    with st.expander(f"📊 {segment['segment_name']}", expanded=True):
                        display_statistical_summary(segment["metrics"])
            
            # AI-powered insights
            if "generative_analysis" in response:
                analysis = response["generative_analysis"]
                
                # Interpretation narrative
                st.markdown("---")
                st.subheader("🧠 AI Interpretation")
                st.write(analysis["interpretation_narrative"])
                
                # Recommendations
                st.markdown("---")
                display_recommendations(analysis["recommended_next_steps"])
                
                # Follow-up questions
                st.markdown("---")
                display_followup_questions(analysis["generated_questions"])
            
            # Download results
            st.markdown("---")
            col1, col2 = st.columns(2)
            with col1:
                download_json_button(
                    response, 
                    "experiment_analysis.json", 
                    "📥 Download Full Analysis"
                )
            
            with col2:
                download_json_button(
                    results_data, 
                    "experiment_data.json", 
                    "📥 Download Input Data"
                )
            
            # Data summary table
            st.markdown("---")
            st.subheader("📋 Data Summary")
            
            # Create summary dataframe
            summary_data = []
            for variant in variants:
                conversion_rate = (variant["conversions"] / variant["users"]) if variant["users"] > 0 else 0
                summary_data.append({
                    "Variant": variant["name"],
                    "Users": f"{variant['users']:,}",
                    "Conversions": f"{variant['conversions']:,}",
                    "Conversion Rate": f"{conversion_rate:.2%}"
                })
            
            df = pd.DataFrame(summary_data)
            st.dataframe(df, use_container_width=True, hide_index=True)
            
        except APIError as e:
            display_error(str(e))
        except Exception as e:
            display_error(f"Unexpected error: {str(e)}")
    
    # Sidebar with tips
    with st.sidebar:
        st.header("💡 Tips for Better Analysis")
        
        st.markdown("""
        **Data Quality:**
        - Ensure your data is clean and complete
        - Check for outliers or anomalies
        - Verify tracking implementation
        
        **Context Matters:**
        - Include external factors in PM notes
        - Consider seasonality effects
        - Note any technical issues during the test
        
        **Statistical Significance:**
        - Don't stop tests early due to significance
        - Consider practical significance vs statistical
        - Look at confidence intervals, not just p-values
        
        **Segment Analysis:**
        - Break down by key user segments
        - Look for interaction effects
        - Consider Simpson's paradox
        """)
        
        st.markdown("---")
        st.header("📤 Import Data")
        
        uploaded_file = st.file_uploader(
            "Upload CSV",
            type=['csv'],
            help="Upload a CSV file with your experiment data"
        )
        
        if uploaded_file is not None:
            try:
                df = pd.read_csv(uploaded_file)
                st.success("File uploaded successfully!")
                st.dataframe(df.head())
                
                st.info("💡 Use the uploaded data to fill in the form above")
            except Exception as e:
                st.error(f"Error reading file: {e}")
        
        if st.button("🏠 Back to Dashboard", use_container_width=True):
            st.switch_page("main.py")

if __name__ == "__main__":
    main()