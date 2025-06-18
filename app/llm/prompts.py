def get_hypothesis_assessment_prompt(hypothesis: str) -> str:
    """Generate prompt for hypothesis clarity assessment."""
    return f"""
You are a senior statistician reviewing this A/B testing hypothesis. Be moderately critical and rigorous in your evaluation:

"{hypothesis}"

Evaluate using this strict scoring rubric:
• **9-10**: Exceptional - Clear action→metric→magnitude with justification (e.g., "Changing CTA from 'Learn More' to 'Get Started' will increase signup conversion rate by at least 15% because it creates more urgency")
• **7-8**: Good - Specifies change, metric, and expected direction with some quantification  
• **5-6**: Average - Mentions what's being tested and general expectation but lacks precision
• **3-4**: Poor - Vague about change or outcome, missing key elements
• **1-2**: Very Poor - No clear direction, unmeasurable, or fundamentally flawed

**Common issues to penalize:**
- Vague language ("improve", "better", "increase" without specifics)
- No quantified expectation or timeframe
- Unclear what exactly is being changed
- Unmeasurable outcomes
- Missing baseline or comparison point
- No logical reasoning for expected outcome

**Criteria for evaluation:**
1. **Specificity**: Does it clearly state WHAT is changing FROM what TO what?
2. **Measurability**: Is the outcome quantifiable with specific metrics?
3. **Magnitude**: Does it specify HOW MUCH change is expected?
4. **Logic**: Is there reasoning for WHY this change should work?

Be critical - most hypotheses have room for improvement. A score of 8+ should be rare and only for truly well-crafted hypotheses.

Format your response as:
Score: X/10
Assessment: [Your critical assessment in 2-3 sentences explaining the score]
Suggestions: [Specific, actionable improvements - always provide suggestions unless score is 9+]
"""


def get_interpretation_prompt(
    hypothesis: str,
    metric_name: str,
    statistical_results: dict,
    pm_notes: str = None
) -> str:
    """Generate prompt for experiment results interpretation."""
    
    results_summary = f"""
Control conversion rate: {statistical_results.get('control_conversion_rate', 'N/A')}
Treatment conversion rate: {statistical_results.get('treatment_conversion_rate', 'N/A')}
Relative lift: {statistical_results.get('relative_lift', 'N/A')}
P-value: {statistical_results.get('p_value', 'N/A')}
Statistical significance: {statistical_results.get('is_significant', 'N/A')}
"""
    
    context_section = f"PM Context: {pm_notes}" if pm_notes else ""
    
    return f"""
You are a statistical consultant helping a Product Manager interpret A/B test results.

Original Hypothesis: "{hypothesis}"
Primary Metric: {metric_name}

Statistical Results:
{results_summary}

{context_section}

Please provide a plain-English interpretation of these results. Consider:
1. What do these results mean in practical terms?
2. Are the results statistically significant and practically significant?
3. What factors might explain these results?
4. What are the key takeaways for the Product Manager?

Keep your explanation accessible to someone who is data-literate but not a statistician.
"""


def get_recommendations_prompt(
    hypothesis: str,
    statistical_results: dict,
    pm_notes: str = None
) -> str:
    """Generate prompt for actionable recommendations."""
    
    significance = statistical_results.get('is_significant', False)
    p_value = statistical_results.get('p_value', 1.0)
    relative_lift = statistical_results.get('relative_lift', 0)
    
    return f"""
Based on these A/B test results, provide 3-5 specific, actionable next steps for the Product Manager:

Hypothesis: "{hypothesis}"
Statistical significance: {significance}
P-value: {p_value}
Relative lift: {relative_lift}
{"PM Context: " + pm_notes if pm_notes else ""}

For each recommendation, provide:
1. The specific action (e.g., "SHIP TO ALL USERS", "ITERATE AND RE-TEST", "ABANDON HYPOTHESIS")
2. A brief rationale (1-2 sentences)
3. A confidence level (High/Medium/Low)

Format as:
1. ACTION: [Action] - CONFIDENCE: [Level]
   Rationale: [Explanation]

2. ACTION: [Action] - CONFIDENCE: [Level]
   Rationale: [Explanation]

[Continue for 3-5 recommendations]
"""


def get_followup_questions_prompt(
    hypothesis: str,
    statistical_results: dict,
    pm_notes: str = None
) -> str:
    """Generate prompt for follow-up questions."""
    
    return f"""
Based on these A/B test results, generate 5 critical follow-up questions the Product Manager should investigate:

Hypothesis: "{hypothesis}"
Results: {statistical_results.get('is_significant', False)} significance, {statistical_results.get('relative_lift', 0)} relative lift
{"PM Context: " + pm_notes if pm_notes else ""}

Focus on questions that would:
1. Deepen understanding of user behavior
2. Identify potential confounding factors
3. Explore segmentation opportunities
4. Guide future experiment design
5. Inform broader product strategy

Format as a numbered list of 5 questions, each being specific and actionable.
"""