import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from typing import Dict, Any, List, Optional


def show_api_status():
    """Display API connection status."""
    from .api_client import get_api_client
    
    client = get_api_client()
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.subheader("🧪 PM Tools - A/B Testing API")
    
    with col2:
        if client.check_health():
            st.success("API Connected", icon="✅")
        else:
            st.error("API Disconnected", icon="❌")
            st.warning("Make sure the FastAPI server is running on http://localhost:8000")


def display_error(error_message: str):
    """Display error message with consistent styling."""
    st.error(f"❌ {error_message}")


def display_success(message: str):
    """Display success message with consistent styling."""
    st.success(f"✅ {message}")


def display_info(message: str):
    """Display info message with consistent styling."""
    st.info(f"ℹ️ {message}")


def create_metric_card(title: str, value: Any, delta: Optional[str] = None, help_text: Optional[str] = None):
    """Create a metric display card."""
    st.metric(
        label=title,
        value=value,
        delta=delta,
        help=help_text
    )


def display_statistical_summary(stats: Dict[str, Any]):
    """Display statistical summary in a formatted way."""
    st.subheader("📊 Statistical Summary")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        create_metric_card(
            "Control Rate",
            f"{stats['control_conversion_rate']:.2%}",
            help_text="Conversion rate of the control variant"
        )
    
    with col2:
        create_metric_card(
            "Treatment Rate", 
            f"{stats['treatment_conversion_rate']:.2%}",
            help_text="Conversion rate of the treatment variant"
        )
    
    with col3:
        relative_lift = stats['relative_lift']
        lift_color = "normal" if abs(relative_lift) < 0.05 else ("inverse" if relative_lift < 0 else "off")
        create_metric_card(
            "Relative Lift",
            f"{relative_lift:.1%}",
            help_text="Percentage change from control to treatment"
        )
    
    with col4:
        p_value = stats['p_value']
        significance = "✅ Significant" if stats['is_significant'] else "❌ Not Significant"
        create_metric_card(
            "P-value",
            f"{p_value:.4f}",
            delta=significance,
            help_text="Probability that observed difference is due to chance"
        )
    
    # Confidence interval
    ci = stats['confidence_interval']
    st.write(f"**95% Confidence Interval:** [{ci['lower']:.4f}, {ci['upper']:.4f}]")


def display_tradeoff_matrix(matrix: List[Dict[str, Any]]):
    """Display trade-off matrix as a table and chart."""
    st.subheader("⚖️ Trade-off Matrix")
    
    df = pd.DataFrame(matrix)
    
    # Format the dataframe for display
    display_df = df.copy()
    if display_df['mde_type'].iloc[0] == 'relative':
        display_df['MDE'] = display_df['mde'].apply(lambda x: f"{x:.1%}")
    else:
        display_df['MDE'] = display_df['mde'].apply(lambda x: f"{x:.3f}")
    
    display_df['Sample Size per Variant'] = display_df['sample_size_per_variant'].apply(lambda x: f"{x:,}")
    display_df['Total Sample Size'] = display_df['total_sample_size'].apply(lambda x: f"{x:,}")
    display_df['Duration (Days)'] = display_df['estimated_duration_days']
    
    # Show table
    st.dataframe(
        display_df[['MDE', 'Sample Size per Variant', 'Total Sample Size', 'Duration (Days)']],
        use_container_width=True,
        hide_index=True
    )
    
    # Show chart
    fig = px.line(
        df, 
        x='mde', 
        y='estimated_duration_days',
        title='Test Duration vs Minimum Detectable Effect',
        labels={
            'mde': 'Minimum Detectable Effect',
            'estimated_duration_days': 'Duration (Days)'
        }
    )
    fig.update_traces(mode='markers+lines', marker=dict(size=8))
    st.plotly_chart(fig, use_container_width=True)


def display_hypothesis_assessment(assessment: Dict[str, Any]):
    """Display hypothesis assessment."""
    st.subheader("📝 Hypothesis Assessment")
    
    score = assessment['score']
    
    # Score visualization
    col1, col2 = st.columns([1, 3])
    
    with col1:
        # Create a gauge-like visualization for the score
        fig = go.Figure(go.Indicator(
            mode = "gauge+number",
            value = score,
            domain = {'x': [0, 1], 'y': [0, 1]},
            title = {'text': "Clarity Score"},
            gauge = {
                'axis': {'range': [None, 10]},
                'bar': {'color': "darkblue"},
                'steps': [
                    {'range': [0, 4], 'color': "lightgray"},
                    {'range': [4, 7], 'color': "yellow"},
                    {'range': [7, 10], 'color': "lightgreen"}
                ],
                'threshold': {
                    'line': {'color': "red", 'width': 4},
                    'thickness': 0.75,
                    'value': 8
                }
            }
        ))
        fig.update_layout(height=200)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.write("**Assessment:**")
        st.write(assessment['assessment'])
        
        st.write("**Suggestions:**")
        st.write(assessment['suggestions'])


def display_recommendations(recommendations: List[Dict[str, Any]]):
    """Display actionable recommendations."""
    st.subheader("🎯 Recommended Next Steps")
    
    for i, rec in enumerate(recommendations, 1):
        confidence_color = {
            "High": "🟢",
            "Medium": "🟡", 
            "Low": "🔴"
        }.get(rec['confidence'], "⚪")
        
        with st.expander(f"{confidence_color} {rec['action']} (Confidence: {rec['confidence']})"):
            st.write(rec['rationale'])


def display_followup_questions(questions: List[str]):
    """Display follow-up questions."""
    st.subheader("❓ Follow-up Questions")
    
    for i, question in enumerate(questions, 1):
        st.write(f"{i}. {question}")


def create_variant_input_form(default_variants: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Create static form for variant input (no dynamic buttons)."""
    st.subheader("📊 Variant Data")
    
    if default_variants is None:
        default_variants = [
            {"name": "Control", "users": 1000, "conversions": 50},
            {"name": "Treatment", "users": 1000, "conversions": 60}
        ]
    
    variants = []
    
    # Fixed number of variants for now (user can add empty ones)
    num_variants = st.selectbox(
        "Number of Variants",
        options=[2, 3, 4, 5],
        index=0,
        help="Select the number of variants in your experiment"
    )
    
    # Create input fields for each variant
    for i in range(num_variants):
        st.write(f"**Variant {i+1}**")
        col1, col2, col3 = st.columns(3)
        
        default_variant = default_variants[i] if i < len(default_variants) else {"name": f"Variant {i+1}", "users": 1000, "conversions": 50}
        
        with col1:
            name = st.text_input(f"Name", value=default_variant["name"], key=f"variant_name_{i}")
        with col2:
            users = st.number_input(f"Users", min_value=0, value=default_variant["users"], key=f"variant_users_{i}")
        with col3:
            conversions = st.number_input(f"Conversions", min_value=0, max_value=users, value=min(default_variant["conversions"], users), key=f"variant_conversions_{i}")
        
        if name.strip():  # Only add non-empty variants
            variants.append({
                "name": name,
                "users": int(users),
                "conversions": int(conversions)
            })
    
    return variants


def download_json_button(data: Dict[str, Any], filename: str, button_text: str):
    """Create a download button for JSON data."""
    import json
    
    json_str = json.dumps(data, indent=2)
    st.download_button(
        label=button_text,
        data=json_str,
        file_name=filename,
        mime="application/json"
    )