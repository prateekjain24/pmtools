from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any


class InputsSummaryModel(BaseModel):
    hypothesis: str
    baseline_conversion_rate: float
    minimum_detectable_effect: float
    mde_type: str
    statistical_power: float
    significance_level: float
    variants: int
    estimated_daily_users: int
    
    explanations: Dict[str, str] = Field(
        default_factory=lambda: {
            "baseline_conversion_rate": "The current conversion rate of your control experience",
            "minimum_detectable_effect": "The smallest change you want to be able to detect",
            "statistical_power": "Probability of detecting an effect if it exists (1-β)",
            "significance_level": "Probability of false positive (α)",
            "variants": "Number of different versions being tested"
        }
    )


class RecommendedPlanModel(BaseModel):
    sample_size_per_variant: int
    total_sample_size: int
    estimated_duration_days: float
    duration_explanation: str = "Time needed to collect sufficient data for reliable results"


class TradeoffMatrixItem(BaseModel):
    mde: float
    mde_type: str
    sample_size_per_variant: int
    total_sample_size: int
    estimated_duration_days: float


class FeasibilityAnalysisModel(BaseModel):
    recommended_plan: RecommendedPlanModel
    tradeoff_matrix: List[TradeoffMatrixItem]


class HypothesisAssessmentModel(BaseModel):
    score: int = Field(..., ge=1, le=10)
    assessment: str
    suggestions: str


class ValidateSetupResponse(BaseModel):
    inputs_summary: InputsSummaryModel
    feasibility_analysis: FeasibilityAnalysisModel
    hypothesis_assessment: HypothesisAssessmentModel


class StatisticalSummaryModel(BaseModel):
    control_conversion_rate: float
    treatment_conversion_rate: float
    absolute_lift: float
    relative_lift: float
    z_score: float
    p_value: float
    is_significant: bool
    confidence_interval: Dict[str, float]
    
    explanations: Dict[str, str] = Field(
        default_factory=lambda: {
            "relative_lift": "Percentage change from control to treatment",
            "p_value": "Probability that the observed difference is due to chance",
            "is_significant": "Whether the difference is statistically significant (p < 0.05)",
            "confidence_interval": "Range of plausible values for the true difference"
        }
    )


class SegmentAnalysisItem(BaseModel):
    segment_name: str
    metrics: StatisticalSummaryModel


class NextStepModel(BaseModel):
    action: str
    confidence: str
    rationale: str


class GenerativeAnalysisModel(BaseModel):
    interpretation_narrative: str
    recommended_next_steps: List[NextStepModel]
    generated_questions: List[str]


class AnalyzeResultsResponse(BaseModel):
    statistical_summary: StatisticalSummaryModel
    segment_analysis: Optional[List[SegmentAnalysisItem]] = None
    generative_analysis: GenerativeAnalysisModel