import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealthEndpoints:
    def test_root_endpoint(self):
        """Test the root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "docs" in data
    
    def test_health_endpoint(self):
        """Test the health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestValidateSetupEndpoint:
    def test_valid_setup_request_relative_mde(self):
        """Test validate setup with valid relative MDE."""
        request_data = {
            "hypothesis": "We believe that adding a prominent CTA button will increase conversions by improving user engagement",
            "metric": {
                "baseline_conversion_rate": 0.05
            },
            "parameters": {
                "variants": 2,
                "minimum_detectable_effect_relative": 0.20,
                "statistical_power": 0.8,
                "significance_level": 0.05
            },
            "traffic": {
                "estimated_daily_users": 1000
            }
        }
        
        response = client.post("/validate/setup", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "inputs_summary" in data
        assert "feasibility_analysis" in data
        assert "hypothesis_assessment" in data
        
        # Check inputs summary
        inputs = data["inputs_summary"]
        assert inputs["baseline_conversion_rate"] == 0.05
        assert inputs["mde_type"] == "relative"
        assert inputs["statistical_power"] == 0.8
        
        # Check feasibility analysis
        feasibility = data["feasibility_analysis"]
        assert "recommended_plan" in feasibility
        assert "tradeoff_matrix" in feasibility
        
        plan = feasibility["recommended_plan"]
        assert plan["sample_size_per_variant"] > 0
        assert plan["total_sample_size"] > 0
        assert plan["estimated_duration_days"] > 0
        
        # Check hypothesis assessment
        assessment = data["hypothesis_assessment"]
        assert "score" in assessment
        assert "assessment" in assessment
        assert "suggestions" in assessment
        assert 1 <= assessment["score"] <= 10
    
    def test_valid_setup_request_absolute_mde(self):
        """Test validate setup with valid absolute MDE."""
        request_data = {
            "hypothesis": "We believe that simplifying the checkout process will increase conversions",
            "metric": {
                "baseline_conversion_rate": 0.03
            },
            "parameters": {
                "variants": 2,
                "minimum_detectable_effect_absolute": 0.005,
                "statistical_power": 0.8,
                "significance_level": 0.05
            },
            "traffic": {
                "estimated_daily_users": 2000
            }
        }
        
        response = client.post("/validate/setup", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        inputs = data["inputs_summary"]
        assert inputs["mde_type"] == "absolute"
        assert inputs["minimum_detectable_effect"] == 0.005
    
    def test_invalid_setup_both_mdes(self):
        """Test validation with both relative and absolute MDE provided."""
        request_data = {
            "hypothesis": "Test hypothesis",
            "metric": {
                "baseline_conversion_rate": 0.05
            },
            "parameters": {
                "variants": 2,
                "minimum_detectable_effect_relative": 0.20,
                "minimum_detectable_effect_absolute": 0.01,  # Both provided
                "statistical_power": 0.8,
                "significance_level": 0.05
            },
            "traffic": {
                "estimated_daily_users": 1000
            }
        }
        
        response = client.post("/validate/setup", json=request_data)
        assert response.status_code == 422  # Validation error
    
    def test_invalid_setup_no_mde(self):
        """Test validation with no MDE provided."""
        request_data = {
            "hypothesis": "Test hypothesis",
            "metric": {
                "baseline_conversion_rate": 0.05
            },
            "parameters": {
                "variants": 2,
                "statistical_power": 0.8,
                "significance_level": 0.05
            },
            "traffic": {
                "estimated_daily_users": 1000
            }
        }
        
        response = client.post("/validate/setup", json=request_data)
        assert response.status_code == 422  # Validation error
    
    def test_invalid_baseline_rate(self):
        """Test validation with invalid baseline conversion rate."""
        request_data = {
            "hypothesis": "Test hypothesis",
            "metric": {
                "baseline_conversion_rate": 1.5  # Invalid: > 1
            },
            "parameters": {
                "variants": 2,
                "minimum_detectable_effect_relative": 0.20,
                "statistical_power": 0.8,
                "significance_level": 0.05
            },
            "traffic": {
                "estimated_daily_users": 1000
            }
        }
        
        response = client.post("/validate/setup", json=request_data)
        assert response.status_code == 422


class TestAnalyzeResultsEndpoint:
    def test_valid_results_analysis(self):
        """Test analyze results with valid data."""
        request_data = {
            "context": {
                "hypothesis": "We believe that the new checkout flow will increase conversions",
                "primary_metric_name": "conversion_rate",
                "pm_notes": "Test ran during holiday season which might affect results"
            },
            "results_data": {
                "variants": [
                    {"name": "control", "users": 1000, "conversions": 50},
                    {"name": "treatment", "users": 1000, "conversions": 65}
                ]
            }
        }
        
        response = client.post("/analyze/results", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "statistical_summary" in data
        assert "generative_analysis" in data
        
        # Check statistical summary
        stats = data["statistical_summary"]
        assert stats["control_conversion_rate"] == 0.05
        assert stats["treatment_conversion_rate"] == 0.065
        assert stats["absolute_lift"] == 0.015
        assert abs(stats["relative_lift"] - 0.3) < 0.01  # 30% relative lift
        assert "p_value" in stats
        assert "is_significant" in stats
        assert "confidence_interval" in stats
        
        # Check generative analysis
        analysis = data["generative_analysis"]
        assert "interpretation_narrative" in analysis
        assert "recommended_next_steps" in analysis
        assert "generated_questions" in analysis
        
        assert len(analysis["recommended_next_steps"]) > 0
        assert len(analysis["generated_questions"]) > 0
        
        # Check next steps structure
        for step in analysis["recommended_next_steps"]:
            assert "action" in step
            assert "confidence" in step
            assert "rationale" in step
    
    def test_results_with_segments(self):
        """Test analyze results with segmented data."""
        request_data = {
            "context": {
                "hypothesis": "New feature will improve mobile conversions",
                "primary_metric_name": "conversion_rate"
            },
            "results_data": {
                "variants": [
                    {"name": "control", "users": 2000, "conversions": 100},
                    {"name": "treatment", "users": 2000, "conversions": 130}
                ],
                "segments": [
                    {
                        "segment_name": "Mobile",
                        "variants": [
                            {"name": "control", "users": 1200, "conversions": 48},
                            {"name": "treatment", "users": 1200, "conversions": 72}
                        ]
                    },
                    {
                        "segment_name": "Desktop",
                        "variants": [
                            {"name": "control", "users": 800, "conversions": 52},
                            {"name": "treatment", "users": 800, "conversions": 58}
                        ]
                    }
                ]
            }
        }
        
        response = client.post("/analyze/results", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "segment_analysis" in data
        assert data["segment_analysis"] is not None
        assert len(data["segment_analysis"]) == 2
        
        # Check segment structure
        for segment in data["segment_analysis"]:
            assert "segment_name" in segment
            assert "metrics" in segment
            assert segment["segment_name"] in ["Mobile", "Desktop"]
    
    def test_invalid_results_insufficient_variants(self):
        """Test analyze results with insufficient variants."""
        request_data = {
            "context": {
                "hypothesis": "Test hypothesis",
                "primary_metric_name": "conversion_rate"
            },
            "results_data": {
                "variants": [
                    {"name": "control", "users": 1000, "conversions": 50}
                ]  # Only one variant
            }
        }
        
        response = client.post("/analyze/results", json=request_data)
        assert response.status_code == 400
    
    def test_invalid_conversions_exceed_users(self):
        """Test validation when conversions exceed users."""
        request_data = {
            "context": {
                "hypothesis": "Test hypothesis",
                "primary_metric_name": "conversion_rate"
            },
            "results_data": {
                "variants": [
                    {"name": "control", "users": 100, "conversions": 150},  # Invalid
                    {"name": "treatment", "users": 100, "conversions": 50}
                ]
            }
        }
        
        response = client.post("/analyze/results", json=request_data)
        assert response.status_code == 422  # Validation error