import streamlit as st
from components.ui_helpers import (
    show_api_status, display_error, display_success, 
    display_tradeoff_matrix, display_hypothesis_assessment,
    download_json_button
)
from components.api_client import get_api_client, APIError

# Page configuration
st.set_page_config(
    page_title="Validate Setup - PM Tools",
    page_icon="🔬",
    layout="wide"
)

def main():
    """Experiment setup validation page."""
    
    show_api_status()
    
    st.title("🔬 Experiment Setup Validation")
    st.markdown("""
    Get instant feedback on your A/B test design. This tool will calculate sample sizes, 
    estimate test duration, and provide AI-powered feedback on your hypothesis.
    """)
    
    # Input form
    with st.form("setup_validation_form"):
        st.subheader("📝 Experiment Details")
        
        # Hypothesis input
        hypothesis = st.text_area(
            "Hypothesis",
            placeholder="We believe that adding a prominent CTA button will increase conversions by improving user engagement...",
            help="Describe what you're testing and what you expect to happen",
            height=100
        )
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("📊 Baseline Metrics")
            baseline_rate = st.number_input(
                "Current Conversion Rate (%)",
                min_value=0.0,
                max_value=100.0,
                value=5.0,
                step=0.1,
                help="Your current conversion rate as a percentage"
            ) / 100  # Convert to decimal
            
            daily_users = st.number_input(
                "Estimated Daily Users",
                min_value=1,
                value=1000,
                step=100,
                help="How many users you expect to see per day"
            )
        
        with col2:
            st.subheader("⚙️ Test Parameters")
            
            num_variants = st.number_input(
                "Number of Variants",
                min_value=2,
                max_value=10,
                value=2,
                help="Total number of variants (including control)"
            )
            
            mde_type = st.radio(
                "Minimum Detectable Effect Type",
                ["Relative (%)", "Absolute"],
                help="Choose whether to specify effect size as relative percentage or absolute value"
            )
            
            if mde_type == "Relative (%)":
                mde_value = st.number_input(
                    "Minimum Detectable Effect (%)",
                    min_value=0.1,
                    max_value=100.0,
                    value=20.0,
                    step=1.0,
                    help="Smallest relative change you want to detect (e.g., 20% means 20% relative improvement)"
                ) / 100  # Convert to decimal
                is_relative = True
            else:
                mde_value = st.number_input(
                    "Minimum Detectable Effect (Absolute)",
                    min_value=0.001,
                    max_value=1.0,
                    value=0.01,
                    step=0.001,
                    format="%.3f",
                    help="Smallest absolute change you want to detect (e.g., 0.01 means 1 percentage point)"
                )
                is_relative = False
            
            statistical_power = st.slider(
                "Statistical Power",
                min_value=0.5,
                max_value=0.99,
                value=0.8,
                step=0.05,
                help="Probability of detecting an effect if it exists (1-β)"
            )
            
            significance_level = st.slider(
                "Significance Level (α)",
                min_value=0.01,
                max_value=0.1,
                value=0.05,
                step=0.01,
                help="Probability of false positive"
            )
        
        # Submit button
        submitted = st.form_submit_button("🚀 Validate Setup", use_container_width=True)
    
    # Process form submission
    if submitted:
        if not hypothesis.strip():
            display_error("Please enter a hypothesis")
            return
        
        # Prepare API request data
        setup_data = {
            "hypothesis": hypothesis,
            "metric": {
                "baseline_conversion_rate": baseline_rate
            },
            "parameters": {
                "variants": num_variants,
                "statistical_power": statistical_power,
                "significance_level": significance_level
            },
            "traffic": {
                "estimated_daily_users": daily_users
            }
        }
        
        # Add MDE based on type
        if is_relative:
            setup_data["parameters"]["minimum_detectable_effect_relative"] = mde_value
        else:
            setup_data["parameters"]["minimum_detectable_effect_absolute"] = mde_value
        
        # Call API
        try:
            with st.spinner("Analyzing your experiment setup..."):
                client = get_api_client()
                response = client.validate_setup(setup_data)
            
            display_success("Setup validation completed!")
            
            # Display results
            st.markdown("---")
            
            # Inputs summary
            st.subheader("📋 Input Summary")
            inputs = response["inputs_summary"]
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Baseline Rate", f"{inputs['baseline_conversion_rate']:.2%}")
                st.metric("Statistical Power", f"{inputs['statistical_power']:.0%}")
            with col2:
                st.metric("MDE", f"{inputs['minimum_detectable_effect']:.2%}" if inputs['mde_type'] == 'relative' else f"{inputs['minimum_detectable_effect']:.3f}")
                st.metric("Significance Level", f"{inputs['significance_level']:.2%}")
            with col3:
                st.metric("Variants", inputs['variants'])
                st.metric("Daily Users", f"{inputs['estimated_daily_users']:,}")
            
            # Feasibility analysis
            st.markdown("---")
            st.subheader("🎯 Recommended Plan")
            
            plan = response["feasibility_analysis"]["recommended_plan"]
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric(
                    "Sample Size per Variant", 
                    f"{plan['sample_size_per_variant']:,}",
                    help="Number of users needed in each variant"
                )
            with col2:
                st.metric(
                    "Total Sample Size", 
                    f"{plan['total_sample_size']:,}",
                    help="Total users needed across all variants"
                )
            with col3:
                st.metric(
                    "Estimated Duration", 
                    f"{plan['estimated_duration_days']:.1f} days",
                    help="Expected time to collect sufficient data"
                )
            
            # Trade-off matrix
            st.markdown("---")
            display_tradeoff_matrix(response["feasibility_analysis"]["tradeoff_matrix"])
            
            # Hypothesis assessment
            st.markdown("---")
            display_hypothesis_assessment(response["hypothesis_assessment"])
            
            # Download results
            st.markdown("---")
            col1, col2 = st.columns(2)
            with col1:
                download_json_button(
                    response, 
                    "experiment_validation.json", 
                    "📥 Download Full Results"
                )
            
            with col2:
                download_json_button(
                    setup_data, 
                    "experiment_setup.json", 
                    "📥 Download Setup Configuration"
                )
            
        except APIError as e:
            display_error(str(e))
        except Exception as e:
            display_error(f"Unexpected error: {str(e)}")
    
    # Sidebar with tips
    with st.sidebar:
        st.header("💡 Tips for Better Experiments")
        
        st.markdown("""
        **Writing Good Hypotheses:**
        - Be specific about what you're changing
        - State your expected outcome
        - Include the reasoning behind your belief
        - Use format: "We believe that [change] will [outcome] because [reasoning]"
        
        **Sample Size Considerations:**
        - Larger effects need smaller samples
        - Higher power requires larger samples
        - Consider your traffic constraints
        - Plan for potential dropouts
        
        **Common MDE Guidelines:**
        - 10-20% relative lift is typical for most tests
        - Smaller effects require longer tests
        - Consider business significance vs statistical significance
        """)
        
        if st.button("🏠 Back to Dashboard", use_container_width=True):
            st.switch_page("main.py")

if __name__ == "__main__":
    main()