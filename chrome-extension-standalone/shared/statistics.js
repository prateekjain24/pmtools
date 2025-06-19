/**
 * JavaScript Statistical Functions for PM Tools Standalone
 * Port of app/statistics/calculations.py with local implementations
 */

// ==================== CORE STATISTICAL FUNCTIONS ====================

/**
 * Standard normal cumulative distribution function (CDF)
 * Approximation using Abramowitz and Stegun method
 */
function normalCDF(x, mean = 0, std = 1) {
  const z = (x - mean) / std;
  
  // Abramowitz and Stegun approximation
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  
  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ);
  
  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard normal percent point function (inverse CDF)
 * Approximation using Beasley-Springer-Moro algorithm
 */
function normalPPF(p, mean = 0, std = 1) {
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }
  
  // Beasley-Springer-Moro algorithm
  const a = [
    -3.969683028665376e+01,
     2.209460984245205e+02,
    -2.759285104469687e+02,
     1.383577518672690e+02,
    -3.066479806614716e+01,
     2.506628277459239e+00
  ];
  
  const b = [
    -5.447609879822406e+01,
     1.615858368580409e+02,
    -1.556989798598866e+02,
     6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
     4.374664141464968e+00,
     2.938163982698783e+00
  ];
  
  const d = [
     7.784695709041462e-03,
     3.224671290700398e-01,
     2.445134137142996e+00,
     3.754408661907416e+00
  ];
  
  let x;
  
  if (p < 0.02425) {
    // Lower tail
    const q = Math.sqrt(-2.0 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
  } else if (p < 0.97575) {
    // Central region
    const q = p - 0.5;
    const r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0);
  } else {
    // Upper tail
    const q = Math.sqrt(-2.0 * Math.log(1.0 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
         ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
  }
  
  return mean + std * x;
}

// ==================== A/B TESTING STATISTICAL FUNCTIONS ====================

/**
 * Calculate required sample size per variant for A/B test
 * Port of calculate_sample_size() from calculations.py
 */
export function calculateSampleSize(
  baselineConversionRate,
  minimumDetectableEffect,
  statisticalPower = 0.8,
  significanceLevel = 0.05,
  isRelativeMDE = true
) {
  const p1 = baselineConversionRate;
  let p2;
  
  if (isRelativeMDE) {
    p2 = p1 * (1 + minimumDetectableEffect);
  } else {
    p2 = p1 + minimumDetectableEffect;
  }
  
  // Ensure p2 is within valid bounds
  p2 = Math.max(0, Math.min(1, p2));
  
  // Calculate pooled proportion
  const pPooled = (p1 + p2) / 2;
  
  // Calculate effect size
  const effectSize = Math.abs(p2 - p1) / Math.sqrt(pPooled * (1 - pPooled));
  
  // Z-scores for alpha and beta
  const zAlpha = normalPPF(1 - significanceLevel / 2);
  const zBeta = normalPPF(statisticalPower);
  
  // Sample size calculation
  const n = Math.pow((zAlpha + zBeta) / effectSize, 2);
  
  return Math.ceil(n);
}

/**
 * Calculate estimated test duration in days
 * Port of calculate_test_duration() from calculations.py
 */
export function calculateTestDuration(
  sampleSizePerVariant,
  estimatedDailyUsers,
  numVariants = 2
) {
  const totalSampleSize = sampleSizePerVariant * numVariants;
  return totalSampleSize / estimatedDailyUsers;
}

/**
 * Generate a trade-off matrix showing different MDE scenarios
 * Port of generate_tradeoff_matrix() from calculations.py
 */
export function generateTradeoffMatrix(
  baselineConversionRate,
  estimatedDailyUsers,
  mdeValues,
  statisticalPower = 0.8,
  significanceLevel = 0.05,
  isRelativeMDE = true,
  numVariants = 2
) {
  const matrix = [];
  
  for (const mde of mdeValues) {
    const sampleSize = calculateSampleSize(
      baselineConversionRate,
      mde,
      statisticalPower,
      significanceLevel,
      isRelativeMDE
    );
    
    const duration = calculateTestDuration(
      sampleSize,
      estimatedDailyUsers,
      numVariants
    );
    
    matrix.push({
      mde: mde,
      mde_type: isRelativeMDE ? "relative" : "absolute",
      sample_size_per_variant: sampleSize,
      total_sample_size: sampleSize * numVariants,
      estimated_duration_days: Math.round(duration * 10) / 10
    });
  }
  
  return matrix;
}

/**
 * Calculate conversion rates, lift, and statistical significance
 * Port of calculate_conversion_metrics() from calculations.py
 */
export function calculateConversionMetrics(
  controlUsers,
  controlConversions,
  treatmentUsers,
  treatmentConversions
) {
  // Conversion rates
  const controlRate = controlUsers > 0 ? controlConversions / controlUsers : 0;
  const treatmentRate = treatmentUsers > 0 ? treatmentConversions / treatmentUsers : 0;
  
  // Relative lift
  const relativeLift = controlRate > 0 ? (treatmentRate - controlRate) / controlRate : 0;
  const absoluteLift = treatmentRate - controlRate;
  
  // Statistical test (two-proportion z-test)
  let zScore = 0;
  let pValue = 1.0;
  let ciLower = absoluteLift;
  let ciUpper = absoluteLift;
  
  if (controlUsers > 0 && treatmentUsers > 0) {
    // Pooled proportion
    const pooledP = (controlConversions + treatmentConversions) / (controlUsers + treatmentUsers);
    
    // Standard error
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / controlUsers + 1 / treatmentUsers));
    
    if (se > 0) {
      // Z-score
      zScore = (treatmentRate - controlRate) / se;
      
      // Two-tailed p-value
      pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
      
      // Confidence interval for difference
      const diffSe = Math.sqrt(
        (controlRate * (1 - controlRate) / controlUsers) +
        (treatmentRate * (1 - treatmentRate) / treatmentUsers)
      );
      
      const marginOfError = 1.96 * diffSe;
      ciLower = absoluteLift - marginOfError;
      ciUpper = absoluteLift + marginOfError;
    }
  }
  
  return {
    control_conversion_rate: Math.round(controlRate * 10000) / 10000,
    treatment_conversion_rate: Math.round(treatmentRate * 10000) / 10000,
    absolute_lift: Math.round(absoluteLift * 10000) / 10000,
    relative_lift: Math.round(relativeLift * 10000) / 10000,
    z_score: Math.round(zScore * 1000) / 1000,
    p_value: Math.round(pValue * 10000) / 10000,
    is_significant: pValue < 0.05,
    confidence_interval: {
      lower: Math.round(ciLower * 10000) / 10000,
      upper: Math.round(ciUpper * 10000) / 10000
    }
  };
}

/**
 * Analyze segmented experiment results
 * Port of analyze_segments() from calculations.py
 */
export function analyzeSegments(segmentData) {
  const segmentAnalyses = [];
  
  for (const segment of segmentData) {
    const segmentName = segment.segment_name;
    const variants = segment.variants;
    
    if (variants.length >= 2) {
      // Assume first variant is control, second is treatment
      const control = variants[0];
      const treatment = variants[1];
      
      const metrics = calculateConversionMetrics(
        control.users,
        control.conversions,
        treatment.users,
        treatment.conversions
      );
      
      segmentAnalyses.push({
        segment_name: segmentName,
        metrics: metrics
      });
    }
  }
  
  return segmentAnalyses;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Validate statistical inputs
 */
export function validateStatisticalInputs(data) {
  const errors = [];
  
  if (data.baseline_conversion_rate <= 0 || data.baseline_conversion_rate >= 1) {
    errors.push('Baseline conversion rate must be between 0 and 1');
  }
  
  if (data.statistical_power <= 0.5 || data.statistical_power >= 1) {
    errors.push('Statistical power must be between 0.5 and 1');
  }
  
  if (data.significance_level <= 0 || data.significance_level >= 0.5) {
    errors.push('Significance level must be between 0 and 0.5');
  }
  
  if (data.estimated_daily_users <= 0) {
    errors.push('Estimated daily users must be positive');
  }
  
  if (data.minimum_detectable_effect_relative && data.minimum_detectable_effect_relative <= 0) {
    errors.push('Relative MDE must be positive');
  }
  
  if (data.minimum_detectable_effect_absolute && 
      (data.minimum_detectable_effect_absolute <= 0 || data.minimum_detectable_effect_absolute >= 1)) {
    errors.push('Absolute MDE must be between 0 and 1');
  }
  
  return errors;
}

/**
 * Generate default MDE values for trade-off matrix
 */
export function getDefaultMDEValues(isRelative = true) {
  if (isRelative) {
    return [0.05, 0.10, 0.15, 0.20, 0.25, 0.30]; // 5%, 10%, 15%, 20%, 25%, 30%
  } else {
    return [0.005, 0.01, 0.015, 0.02, 0.025, 0.03]; // 0.5%, 1%, 1.5%, 2%, 2.5%, 3%
  }
}

// ==================== TEST FUNCTIONS ====================

/**
 * Test the statistical functions against known values
 * This helps verify our JavaScript implementation matches the Python backend
 */
export function runStatisticalTests() {
  console.log('🧪 Running statistical function tests...');
  
  // Test normal distribution functions
  const testP = 0.975;
  const expectedZ = 1.96; // Approximately
  const calculatedZ = normalPPF(testP);
  console.log(`Normal PPF test: P=${testP}, Expected≈${expectedZ}, Calculated=${calculatedZ.toFixed(3)}`);
  
  // Test sample size calculation
  const sampleSize = calculateSampleSize(0.05, 0.20, 0.8, 0.05, true);
  console.log(`Sample size test: Baseline=5%, MDE=20%, Power=80%, Alpha=5% → ${sampleSize} per variant`);
  
  // Test conversion metrics
  const metrics = calculateConversionMetrics(1000, 50, 1000, 60);
  console.log(`Conversion metrics test:`, metrics);
  
  console.log('✅ Statistical tests completed');
  return true;
}