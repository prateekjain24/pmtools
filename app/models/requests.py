from pydantic import BaseModel, Field, validator
from typing import Optional, List, Union
from enum import Enum


class MetricModel(BaseModel):
    baseline_conversion_rate: float = Field(..., ge=0, le=1, description="Baseline conversion rate (0-1)")


class ParametersModel(BaseModel):
    variants: int = Field(default=2, ge=2, description="Number of variants in the test")
    minimum_detectable_effect_relative: Optional[float] = Field(None, gt=0, description="Relative MDE (e.g., 0.10 for 10%)")
    minimum_detectable_effect_absolute: Optional[float] = Field(None, gt=0, le=1, description="Absolute MDE (e.g., 0.005)")
    statistical_power: float = Field(default=0.8, ge=0.5, le=0.99, description="Statistical power (1-β)")
    significance_level: float = Field(default=0.05, gt=0, lt=0.5, description="Significance level (α)")
    
    @validator('minimum_detectable_effect_absolute')
    def validate_mde(cls, v, values):
        relative_mde = values.get('minimum_detectable_effect_relative')
        
        # Exactly one MDE must be provided
        if relative_mde is not None and v is not None:
            raise ValueError("Exactly one of minimum_detectable_effect_relative or minimum_detectable_effect_absolute must be provided")
        
        if relative_mde is None and v is None:
            raise ValueError("Exactly one of minimum_detectable_effect_relative or minimum_detectable_effect_absolute must be provided")
        
        return v


class TrafficModel(BaseModel):
    estimated_daily_users: int = Field(..., gt=0, description="Estimated daily users for the test")


class ValidateSetupRequest(BaseModel):
    hypothesis: str = Field(..., min_length=10, description="Experiment hypothesis")
    metric: MetricModel
    parameters: ParametersModel
    traffic: TrafficModel


class VariantModel(BaseModel):
    name: str = Field(..., description="Variant name (e.g., 'control', 'treatment')")
    users: int = Field(..., ge=0, description="Number of users in this variant")
    conversions: int = Field(..., ge=0, description="Number of conversions for this variant")
    
    @validator('conversions')
    def conversions_not_exceed_users(cls, v, values):
        if 'users' in values and v > values['users']:
            raise ValueError("Conversions cannot exceed users")
        return v


class SegmentModel(BaseModel):
    segment_name: str = Field(..., description="Name of the segment")
    variants: List[VariantModel] = Field(..., min_items=2, description="Variant data for this segment")


class ExperimentContextModel(BaseModel):
    hypothesis: str = Field(..., min_length=10, description="Original experiment hypothesis")
    primary_metric_name: str = Field(..., description="Name of the primary metric")
    pm_notes: Optional[str] = Field(None, description="Optional qualitative context from PM")


class ResultsDataModel(BaseModel):
    variants: List[VariantModel] = Field(..., min_items=2, description="Overall variant results")
    segments: Optional[List[SegmentModel]] = Field(None, description="Optional segmented results")


class AnalyzeResultsRequest(BaseModel):
    context: ExperimentContextModel
    results_data: ResultsDataModel