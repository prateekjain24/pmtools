import math
from typing import Dict, List, Tuple, Optional
from scipy import stats
import numpy as np


def calculate_sample_size(
    baseline_conversion_rate: float,
    minimum_detectable_effect: float,
    statistical_power: float = 0.8,
    significance_level: float = 0.05,
    is_relative_mde: bool = True
) -> int:
    """
    Calculate required sample size per variant for A/B test.
    
    Args:
        baseline_conversion_rate: Current conversion rate (e.g., 0.05 for 5%)
        minimum_detectable_effect: MDE as relative (0.1 for 10%) or absolute (0.005)
        statistical_power: Power of the test (1 - β), default 0.8
        significance_level: Alpha level, default 0.05
        is_relative_mde: True if MDE is relative, False if absolute
    
    Returns:
        Required sample size per variant
    """
    p1 = baseline_conversion_rate
    
    if is_relative_mde:
        p2 = p1 * (1 + minimum_detectable_effect)
    else:
        p2 = p1 + minimum_detectable_effect
    
    # Ensure p2 is within valid bounds
    p2 = max(0, min(1, p2))
    
    # Calculate pooled proportion
    p_pooled = (p1 + p2) / 2
    
    # Calculate effect size
    effect_size = abs(p2 - p1) / math.sqrt(p_pooled * (1 - p_pooled))
    
    # Z-scores for alpha and beta
    z_alpha = stats.norm.ppf(1 - significance_level / 2)
    z_beta = stats.norm.ppf(statistical_power)
    
    # Sample size calculation
    n = ((z_alpha + z_beta) / effect_size) ** 2
    
    return math.ceil(n)


def calculate_test_duration(
    sample_size_per_variant: int,
    estimated_daily_users: int,
    num_variants: int = 2
) -> float:
    """
    Calculate estimated test duration in days.
    
    Args:
        sample_size_per_variant: Required sample size per variant
        estimated_daily_users: Daily traffic available
        num_variants: Number of test variants
    
    Returns:
        Test duration in days
    """
    total_sample_size = sample_size_per_variant * num_variants
    return total_sample_size / estimated_daily_users


def generate_tradeoff_matrix(
    baseline_conversion_rate: float,
    estimated_daily_users: int,
    mde_values: List[float],
    statistical_power: float = 0.8,
    significance_level: float = 0.05,
    is_relative_mde: bool = True,
    num_variants: int = 2
) -> List[Dict]:
    """
    Generate a trade-off matrix showing different MDE scenarios.
    
    Returns:
        List of dictionaries with MDE, sample size, and duration data
    """
    matrix = []
    
    for mde in mde_values:
        sample_size = calculate_sample_size(
            baseline_conversion_rate=baseline_conversion_rate,
            minimum_detectable_effect=mde,
            statistical_power=statistical_power,
            significance_level=significance_level,
            is_relative_mde=is_relative_mde
        )
        
        duration = calculate_test_duration(
            sample_size_per_variant=sample_size,
            estimated_daily_users=estimated_daily_users,
            num_variants=num_variants
        )
        
        matrix.append({
            "mde": mde,
            "mde_type": "relative" if is_relative_mde else "absolute",
            "sample_size_per_variant": sample_size,
            "total_sample_size": sample_size * num_variants,
            "estimated_duration_days": round(duration, 1)
        })
    
    return matrix


def calculate_conversion_metrics(
    control_users: int,
    control_conversions: int,
    treatment_users: int,
    treatment_conversions: int
) -> Dict:
    """
    Calculate conversion rates, lift, and statistical significance.
    
    Returns:
        Dictionary with conversion metrics and statistical results
    """
    # Conversion rates
    control_rate = control_conversions / control_users if control_users > 0 else 0
    treatment_rate = treatment_conversions / treatment_users if treatment_users > 0 else 0
    
    # Relative lift
    relative_lift = ((treatment_rate - control_rate) / control_rate) if control_rate > 0 else 0
    absolute_lift = treatment_rate - control_rate
    
    # Statistical test (two-proportion z-test)
    if control_users > 0 and treatment_users > 0:
        # Pooled proportion
        pooled_p = (control_conversions + treatment_conversions) / (control_users + treatment_users)
        
        # Standard error
        se = math.sqrt(pooled_p * (1 - pooled_p) * (1/control_users + 1/treatment_users))
        
        if se > 0:
            # Z-score
            z_score = (treatment_rate - control_rate) / se
            
            # Two-tailed p-value
            p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
            
            # Confidence interval for difference
            diff_se = math.sqrt(
                (control_rate * (1 - control_rate) / control_users) +
                (treatment_rate * (1 - treatment_rate) / treatment_users)
            )
            
            margin_of_error = 1.96 * diff_se
            ci_lower = absolute_lift - margin_of_error
            ci_upper = absolute_lift + margin_of_error
        else:
            z_score = 0
            p_value = 1.0
            ci_lower = ci_upper = absolute_lift
    else:
        z_score = 0
        p_value = 1.0
        ci_lower = ci_upper = absolute_lift
    
    return {
        "control_conversion_rate": round(control_rate, 4),
        "treatment_conversion_rate": round(treatment_rate, 4),
        "absolute_lift": round(absolute_lift, 4),
        "relative_lift": round(relative_lift, 4),
        "z_score": round(z_score, 3),
        "p_value": round(p_value, 4),
        "is_significant": p_value < 0.05,
        "confidence_interval": {
            "lower": round(ci_lower, 4),
            "upper": round(ci_upper, 4)
        }
    }


def analyze_segments(
    segment_data: List[Dict]
) -> List[Dict]:
    """
    Analyze segmented experiment results.
    
    Args:
        segment_data: List of segment dictionaries with variant data
    
    Returns:
        List of segment analyses
    """
    segment_analyses = []
    
    for segment in segment_data:
        segment_name = segment["segment_name"]
        variants = segment["variants"]
        
        if len(variants) >= 2:
            # Assume first variant is control, second is treatment
            control = variants[0]
            treatment = variants[1]
            
            metrics = calculate_conversion_metrics(
                control_users=control["users"],
                control_conversions=control["conversions"],
                treatment_users=treatment["users"],
                treatment_conversions=treatment["conversions"]
            )
            
            segment_analyses.append({
                "segment_name": segment_name,
                "metrics": metrics
            })
    
    return segment_analyses