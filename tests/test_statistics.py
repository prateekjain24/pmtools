import pytest
import math
from app.statistics.calculations import (
    calculate_sample_size,
    calculate_test_duration,
    generate_tradeoff_matrix,
    calculate_conversion_metrics,
    analyze_segments
)


class TestSampleSizeCalculation:
    def test_relative_mde_calculation(self):
        """Test sample size calculation with relative MDE."""
        sample_size = calculate_sample_size(
            baseline_conversion_rate=0.05,
            minimum_detectable_effect=0.20,  # 20% relative lift
            statistical_power=0.8,
            significance_level=0.05,
            is_relative_mde=True
        )
        
        assert isinstance(sample_size, int)
        assert sample_size > 0
        assert sample_size < 100000  # Sanity check
    
    def test_absolute_mde_calculation(self):
        """Test sample size calculation with absolute MDE."""
        sample_size = calculate_sample_size(
            baseline_conversion_rate=0.05,
            minimum_detectable_effect=0.01,  # 1% absolute lift
            statistical_power=0.8,
            significance_level=0.05,
            is_relative_mde=False
        )
        
        assert isinstance(sample_size, int)
        assert sample_size > 0
    
    def test_higher_power_requires_larger_sample(self):
        """Test that higher statistical power requires larger sample size."""
        base_sample = calculate_sample_size(
            baseline_conversion_rate=0.05,
            minimum_detectable_effect=0.20,
            statistical_power=0.8,
            is_relative_mde=True
        )
        
        high_power_sample = calculate_sample_size(
            baseline_conversion_rate=0.05,
            minimum_detectable_effect=0.20,
            statistical_power=0.9,
            is_relative_mde=True
        )
        
        assert high_power_sample > base_sample


class TestTestDuration:
    def test_duration_calculation(self):
        """Test test duration calculation."""
        duration = calculate_test_duration(
            sample_size_per_variant=1000,
            estimated_daily_users=500,
            num_variants=2
        )
        
        expected_duration = (1000 * 2) / 500  # 4 days
        assert duration == expected_duration
    
    def test_more_variants_longer_duration(self):
        """Test that more variants require longer duration."""
        duration_2_variants = calculate_test_duration(
            sample_size_per_variant=1000,
            estimated_daily_users=500,
            num_variants=2
        )
        
        duration_3_variants = calculate_test_duration(
            sample_size_per_variant=1000,
            estimated_daily_users=500,
            num_variants=3
        )
        
        assert duration_3_variants > duration_2_variants


class TestTradeoffMatrix:
    def test_tradeoff_matrix_generation(self):
        """Test trade-off matrix generation."""
        matrix = generate_tradeoff_matrix(
            baseline_conversion_rate=0.05,
            estimated_daily_users=1000,
            mde_values=[0.1, 0.2, 0.3],
            is_relative_mde=True
        )
        
        assert len(matrix) == 3
        
        for item in matrix:
            assert "mde" in item
            assert "sample_size_per_variant" in item
            assert "estimated_duration_days" in item
            assert item["mde_type"] == "relative"
    
    def test_smaller_mde_requires_larger_sample(self):
        """Test that smaller MDE requires larger sample size."""
        matrix = generate_tradeoff_matrix(
            baseline_conversion_rate=0.05,
            estimated_daily_users=1000,
            mde_values=[0.1, 0.2],
            is_relative_mde=True
        )
        
        small_mde_item = next(item for item in matrix if item["mde"] == 0.1)
        large_mde_item = next(item for item in matrix if item["mde"] == 0.2)
        
        assert small_mde_item["sample_size_per_variant"] > large_mde_item["sample_size_per_variant"]


class TestConversionMetrics:
    def test_basic_conversion_calculation(self):
        """Test basic conversion rate and lift calculations."""
        metrics = calculate_conversion_metrics(
            control_users=1000,
            control_conversions=50,  # 5% conversion
            treatment_users=1000,
            treatment_conversions=60  # 6% conversion
        )
        
        assert metrics["control_conversion_rate"] == 0.05
        assert metrics["treatment_conversion_rate"] == 0.06
        assert metrics["absolute_lift"] == 0.01
        assert abs(metrics["relative_lift"] - 0.2) < 0.01  # 20% relative lift
    
    def test_no_conversions(self):
        """Test handling of zero conversions."""
        metrics = calculate_conversion_metrics(
            control_users=1000,
            control_conversions=0,
            treatment_users=1000,
            treatment_conversions=0
        )
        
        assert metrics["control_conversion_rate"] == 0
        assert metrics["treatment_conversion_rate"] == 0
        assert metrics["absolute_lift"] == 0
        assert metrics["relative_lift"] == 0
    
    def test_statistical_significance(self):
        """Test statistical significance calculation."""
        # Test with significant difference
        metrics = calculate_conversion_metrics(
            control_users=10000,
            control_conversions=500,
            treatment_users=10000,
            treatment_conversions=600
        )
        
        assert "p_value" in metrics
        assert "is_significant" in metrics
        assert "z_score" in metrics
        assert "confidence_interval" in metrics
        
        # With large sample sizes, this should be significant
        assert metrics["p_value"] < 0.05
        assert metrics["is_significant"] is True


class TestSegmentAnalysis:
    def test_segment_analysis(self):
        """Test segment analysis functionality."""
        segment_data = [
            {
                "segment_name": "Mobile Users",
                "variants": [
                    {"name": "control", "users": 500, "conversions": 25},
                    {"name": "treatment", "users": 500, "conversions": 35}
                ]
            },
            {
                "segment_name": "Desktop Users",
                "variants": [
                    {"name": "control", "users": 300, "conversions": 15},
                    {"name": "treatment", "users": 300, "conversions": 18}
                ]
            }
        ]
        
        results = analyze_segments(segment_data)
        
        assert len(results) == 2
        
        mobile_result = next(r for r in results if r["segment_name"] == "Mobile Users")
        assert "metrics" in mobile_result
        assert mobile_result["metrics"]["control_conversion_rate"] == 0.05
        assert mobile_result["metrics"]["treatment_conversion_rate"] == 0.07
    
    def test_segment_with_insufficient_variants(self):
        """Test segment analysis with insufficient variants."""
        segment_data = [
            {
                "segment_name": "Single Variant",
                "variants": [
                    {"name": "control", "users": 500, "conversions": 25}
                ]
            }
        ]
        
        results = analyze_segments(segment_data)
        assert len(results) == 0  # Should skip segments with < 2 variants