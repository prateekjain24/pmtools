from fastapi import APIRouter, HTTPException
from app.models.requests import ValidateSetupRequest
from app.models.responses import (
    ValidateSetupResponse, 
    InputsSummaryModel,
    FeasibilityAnalysisModel,
    RecommendedPlanModel,
    HypothesisAssessmentModel
)
from app.statistics.calculations import calculate_sample_size, calculate_test_duration, generate_tradeoff_matrix
from app.llm.manager import llm_manager
from app.llm.prompts import get_hypothesis_assessment_prompt
from app.core.config import settings
import re

router = APIRouter()


def parse_hypothesis_assessment(llm_response: str) -> HypothesisAssessmentModel:
    """Parse LLM response for hypothesis assessment."""
    try:
        # Extract score
        score_match = re.search(r'Score:\s*(\d+)', llm_response, re.IGNORECASE)
        score = int(score_match.group(1)) if score_match else 5
        
        # Extract assessment
        assessment_match = re.search(r'Assessment:\s*(.*?)(?:\n|$)', llm_response, re.IGNORECASE | re.DOTALL)
        assessment = assessment_match.group(1).strip() if assessment_match else "Unable to assess hypothesis clarity."
        
        # Extract suggestions
        suggestions_match = re.search(r'Suggestions:\s*(.*?)(?:\n|$)', llm_response, re.IGNORECASE | re.DOTALL)
        suggestions = suggestions_match.group(1).strip() if suggestions_match else "No specific suggestions available."
        
        return HypothesisAssessmentModel(
            score=max(1, min(10, score)),
            assessment=assessment,
            suggestions=suggestions
        )
    except Exception:
        # Fallback if parsing fails
        return HypothesisAssessmentModel(
            score=5,
            assessment="Unable to assess hypothesis due to parsing error.",
            suggestions="Consider revising the hypothesis for clarity and specificity."
        )


@router.post("/validate/setup", response_model=ValidateSetupResponse)
async def validate_setup(request: ValidateSetupRequest):
    """
    Analyze a proposed experiment's setup for statistical feasibility.
    """
    try:
        # Determine MDE and type
        if request.parameters.minimum_detectable_effect_relative is not None:
            mde = request.parameters.minimum_detectable_effect_relative
            is_relative_mde = True
            mde_type = "relative"
        else:
            mde = request.parameters.minimum_detectable_effect_absolute
            is_relative_mde = False
            mde_type = "absolute"
        
        # Calculate sample size
        sample_size = calculate_sample_size(
            baseline_conversion_rate=request.metric.baseline_conversion_rate,
            minimum_detectable_effect=mde,
            statistical_power=request.parameters.statistical_power,
            significance_level=request.parameters.significance_level,
            is_relative_mde=is_relative_mde
        )
        
        # Calculate test duration
        duration = calculate_test_duration(
            sample_size_per_variant=sample_size,
            estimated_daily_users=request.traffic.estimated_daily_users,
            num_variants=request.parameters.variants
        )
        
        # Generate trade-off matrix with different MDEs
        if is_relative_mde:
            mde_values = [mde * 0.5, mde * 0.75, mde, mde * 1.25, mde * 1.5]
        else:
            mde_values = [mde * 0.5, mde * 0.75, mde, mde * 1.25, mde * 1.5]
        
        tradeoff_matrix = generate_tradeoff_matrix(
            baseline_conversion_rate=request.metric.baseline_conversion_rate,
            estimated_daily_users=request.traffic.estimated_daily_users,
            mde_values=mde_values,
            statistical_power=request.parameters.statistical_power,
            significance_level=request.parameters.significance_level,
            is_relative_mde=is_relative_mde,
            num_variants=request.parameters.variants
        )
        
        # Get hypothesis assessment from LLM
        hypothesis_assessment = HypothesisAssessmentModel(
            score=5,
            assessment="LLM assessment unavailable - hypothesis provided.",
            suggestions="Consider ensuring your hypothesis is specific and measurable."
        )
        
        try:
            prompt = get_hypothesis_assessment_prompt(request.hypothesis)
            llm_response = await llm_manager.generate_text(
                prompt=prompt,
                preferred_provider=settings.default_llm_provider,
                use_fallback=settings.llm_fallback_enabled
            )
            hypothesis_assessment = parse_hypothesis_assessment(llm_response)
        except Exception as e:
            # Use fallback assessment if LLM fails
            print(f"LLM assessment failed: {e}")
            hypothesis_assessment = HypothesisAssessmentModel(
                score=5,
                assessment=f"LLM assessment failed: {str(e)}. Using fallback assessment.",
                suggestions="Consider ensuring your hypothesis is specific and measurable."
            )
        
        # Build response
        inputs_summary = InputsSummaryModel(
            hypothesis=request.hypothesis,
            baseline_conversion_rate=request.metric.baseline_conversion_rate,
            minimum_detectable_effect=mde,
            mde_type=mde_type,
            statistical_power=request.parameters.statistical_power,
            significance_level=request.parameters.significance_level,
            variants=request.parameters.variants,
            estimated_daily_users=request.traffic.estimated_daily_users
        )
        
        recommended_plan = RecommendedPlanModel(
            sample_size_per_variant=sample_size,
            total_sample_size=sample_size * request.parameters.variants,
            estimated_duration_days=round(duration, 1)
        )
        
        feasibility_analysis = FeasibilityAnalysisModel(
            recommended_plan=recommended_plan,
            tradeoff_matrix=tradeoff_matrix
        )
        
        return ValidateSetupResponse(
            inputs_summary=inputs_summary,
            feasibility_analysis=feasibility_analysis,
            hypothesis_assessment=hypothesis_assessment
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating setup: {str(e)}")