from fastapi import APIRouter, HTTPException
from app.models.requests import AnalyzeResultsRequest
from app.models.responses import (
    AnalyzeResultsResponse,
    StatisticalSummaryModel,
    SegmentAnalysisItem,
    GenerativeAnalysisModel,
    NextStepModel
)
from app.statistics.calculations import calculate_conversion_metrics, analyze_segments
from app.llm.manager import llm_manager
from app.llm.prompts import (
    get_interpretation_prompt,
    get_recommendations_prompt,
    get_followup_questions_prompt
)
from app.core.config import settings
import re
from typing import List

router = APIRouter()


def parse_recommendations(llm_response: str) -> List[NextStepModel]:
    """Parse LLM response for recommendations."""
    recommendations = []
    
    try:
        # Look for numbered recommendations
        pattern = r'(\d+)\.\s*ACTION:\s*(.*?)\s*-\s*CONFIDENCE:\s*(High|Medium|Low|HIGH|MEDIUM|LOW)\s*\n\s*Rationale:\s*(.*?)(?=\n\d+\.|$)'
        matches = re.findall(pattern, llm_response, re.IGNORECASE | re.DOTALL)
        
        for match in matches:
            action = match[1].strip()
            confidence = match[2].strip().title()
            rationale = match[3].strip()
            
            recommendations.append(NextStepModel(
                action=action,
                confidence=confidence,
                rationale=rationale
            ))
    
    except Exception:
        # Fallback recommendations
        recommendations = [
            NextStepModel(
                action="REVIEW RESULTS",
                confidence="High",
                rationale="Analyze the statistical results and their business implications."
            )
        ]
    
    return recommendations if recommendations else [
        NextStepModel(
            action="REVIEW RESULTS",
            confidence="Medium",
            rationale="Further analysis needed based on the current results."
        )
    ]


def parse_questions(llm_response: str) -> List[str]:
    """Parse LLM response for follow-up questions."""
    questions = []
    
    try:
        # Look for numbered questions
        pattern = r'(\d+)\.\s*(.*?)(?=\n\d+\.|$)'
        matches = re.findall(pattern, llm_response, re.DOTALL)
        
        for match in matches:
            question = match[1].strip()
            if question and len(question) > 10:  # Basic validation
                questions.append(question)
    
    except Exception:
        pass
    
    return questions if questions else [
        "What factors might have influenced these results?",
        "How do these results vary across different user segments?",
        "What would be the business impact of implementing this change?",
        "What additional metrics should be analyzed?",
        "How confident are we in the long-term sustainability of these results?"
    ]


@router.post("/analyze/results", response_model=AnalyzeResultsResponse)
async def analyze_results(request: AnalyzeResultsRequest):
    """
    Interpret raw experiment results with statistical analysis and LLM insights.
    """
    try:
        # Get primary variants (assume first two are control and treatment)
        variants = request.results_data.variants
        if len(variants) < 2:
            raise HTTPException(status_code=400, detail="At least 2 variants required")
        
        control = variants[0]
        treatment = variants[1]
        
        # Calculate statistical metrics
        metrics = calculate_conversion_metrics(
            control_users=control.users,
            control_conversions=control.conversions,
            treatment_users=treatment.users,
            treatment_conversions=treatment.conversions
        )
        
        # Create statistical summary
        statistical_summary = StatisticalSummaryModel(**metrics)
        
        # Analyze segments if provided
        segment_analysis = None
        if request.results_data.segments:
            segment_results = analyze_segments(
                [seg.dict() for seg in request.results_data.segments]
            )
            segment_analysis = [
                SegmentAnalysisItem(
                    segment_name=seg["segment_name"],
                    metrics=StatisticalSummaryModel(**seg["metrics"])
                )
                for seg in segment_results
            ]
        
        # Generate LLM insights
        interpretation_narrative = "Statistical analysis completed. LLM interpretation unavailable."
        recommendations = [
            NextStepModel(
                action="REVIEW RESULTS",
                confidence="Medium",
                rationale="Analyze the statistical significance and business impact."
            )
        ]
        questions = [
            "What business factors might explain these results?",
            "How should these results influence the product roadmap?",
            "What additional validation is needed?"
        ]
        
        try:
            # Get interpretation
            interpretation_prompt = get_interpretation_prompt(
                hypothesis=request.context.hypothesis,
                metric_name=request.context.primary_metric_name,
                statistical_results=metrics,
                pm_notes=request.context.pm_notes
            )
            
            interpretation_response = await llm_manager.generate_text(
                prompt=interpretation_prompt,
                preferred_provider=settings.default_llm_provider,
                use_fallback=settings.llm_fallback_enabled
            )
            interpretation_narrative = interpretation_response.strip()
            
            # Get recommendations
            recommendations_prompt = get_recommendations_prompt(
                hypothesis=request.context.hypothesis,
                statistical_results=metrics,
                pm_notes=request.context.pm_notes
            )
            
            recommendations_response = await llm_manager.generate_text(
                prompt=recommendations_prompt,
                preferred_provider=settings.default_llm_provider,
                use_fallback=settings.llm_fallback_enabled
            )
            recommendations = parse_recommendations(recommendations_response)
            
            # Get follow-up questions
            questions_prompt = get_followup_questions_prompt(
                hypothesis=request.context.hypothesis,
                statistical_results=metrics,
                pm_notes=request.context.pm_notes
            )
            
            questions_response = await llm_manager.generate_text(
                prompt=questions_prompt,
                preferred_provider=settings.default_llm_provider,
                use_fallback=settings.llm_fallback_enabled
            )
            questions = parse_questions(questions_response)
            
        except Exception:
            # Use fallback values if LLM fails
            pass
        
        # Build generative analysis
        generative_analysis = GenerativeAnalysisModel(
            interpretation_narrative=interpretation_narrative,
            recommended_next_steps=recommendations,
            generated_questions=questions
        )
        
        return AnalyzeResultsResponse(
            statistical_summary=statistical_summary,
            segment_analysis=segment_analysis,
            generative_analysis=generative_analysis
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing results: {str(e)}")