// Statistical calculations for PM Tools Chrome Extension
// Port of Python calculations.py to vanilla JavaScript

PMTools.statistics = {
  // Normal distribution CDF using Hart's algorithm for better accuracy
  normalCDF(z) {
    // Handle edge cases
    if (z === 0) return 0.5;
    if (z < -8.0) return 0;
    if (z > 8.0) return 1;
    
    // Constants for Hart's algorithm
    const a1 = 0.0705230784;
    const a2 = 0.0422820123;
    const a3 = 0.0092705272;
    const a4 = 0.0001520143;
    const a5 = 0.0002765672;
    const a6 = 0.0000430638;
    
    const absZ = Math.abs(z);
    const expNegHalfZSquared = Math.exp(-0.5 * z * z);
    
    // Build the polynomial
    const sumA = 1 + absZ * (a1 + absZ * (a2 + absZ * (a3 + absZ * (a4 + absZ * (a5 + absZ * a6)))));
    
    // Calculate the approximation
    const temp = 1 - expNegHalfZSquared / Math.sqrt(2 * Math.PI) / sumA;
    
    // Apply the sign
    return z > 0 ? temp : 1 - temp;
  },
  
  // Inverse normal CDF (for z-scores) using Beasley-Springer-Moro algorithm
  normalInverse(p) {
    if (p <= 0 || p >= 1) {
      throw new Error('Probability must be between 0 and 1');
    }
    
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    
    if (p < pLow) {
      // Rational approximation for lower region
      const q = Math.sqrt(-2 * Math.log(p));
      return (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
             ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    } else if (p <= pHigh) {
      // Rational approximation for central region
      const q = p - 0.5;
      const r = q * q;
      return (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q /
             (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
    } else {
      // Rational approximation for upper region
      const q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
              ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    }
  },
  
  /**
   * Calculate required sample size per variant for A/B test
   * @param {number} baselineConversionRate - Current conversion rate (e.g., 0.05 for 5%)
   * @param {number} minimumDetectableEffect - MDE as relative (0.1 for 10%) or absolute (0.005)
   * @param {number} statisticalPower - Power of the test (1 - β), default 0.8
   * @param {number} significanceLevel - Alpha level, default 0.05
   * @param {boolean} isRelativeMDE - True if MDE is relative, False if absolute
   * @returns {number} Required sample size per variant
   */
  calculateSampleSize(baselineConversionRate, minimumDetectableEffect, statisticalPower = 0.8, significanceLevel = 0.05, isRelativeMDE = true) {
    // Validate inputs
    if (baselineConversionRate <= 0 || baselineConversionRate >= 1) {
      throw new Error('Baseline conversion rate must be between 0 and 1');
    }
    
    const p1 = baselineConversionRate;
    
    let p2;
    if (isRelativeMDE) {
      p2 = p1 * (1 + minimumDetectableEffect);
    } else {
      p2 = p1 + minimumDetectableEffect;
    }
    
    // Ensure p2 is within valid bounds
    p2 = Math.max(0.0001, Math.min(0.9999, p2));
    
    // Z-scores for alpha and beta
    const zAlpha = this.normalInverse(1 - significanceLevel / 2);
    const zBeta = this.normalInverse(statisticalPower);
    
    // Use the exact two-proportion sample size formula
    // n = (zα + zβ)² × [p1(1-p1) + p2(1-p2)] / (p2 - p1)²
    const variance1 = p1 * (1 - p1);
    const variance2 = p2 * (1 - p2);
    const delta = Math.abs(p2 - p1);
    
    if (delta < 0.0001) {
      throw new Error('Effect size too small to calculate meaningful sample size');
    }
    
    const n = Math.pow(zAlpha + zBeta, 2) * (variance1 + variance2) / Math.pow(delta, 2);
    
    return Math.ceil(n);
  },
  
  /**
   * Calculate estimated test duration in days
   * @param {number} sampleSizePerVariant - Required sample size per variant
   * @param {number} estimatedDailyUsers - Daily traffic available
   * @param {number} numVariants - Number of test variants
   * @returns {number} Test duration in days
   */
  calculateTestDuration(sampleSizePerVariant, estimatedDailyUsers, numVariants = 2) {
    const totalSampleSize = sampleSizePerVariant * numVariants;
    return totalSampleSize / estimatedDailyUsers;
  },
  
  /**
   * Generate a trade-off matrix showing different MDE scenarios
   * @param {number} baselineConversionRate - Baseline conversion rate
   * @param {number} estimatedDailyUsers - Daily users available
   * @param {Array} mdeValues - Array of MDE values to test
   * @param {number} statisticalPower - Statistical power
   * @param {number} significanceLevel - Significance level
   * @param {boolean} isRelativeMDE - Whether MDE is relative
   * @param {number} numVariants - Number of variants
   * @returns {Array} Array of trade-off scenarios
   */
  generateTradeoffMatrix(baselineConversionRate, estimatedDailyUsers, mdeValues, statisticalPower = 0.8, significanceLevel = 0.05, isRelativeMDE = true, numVariants = 2) {
    const matrix = [];
    
    for (const mde of mdeValues) {
      const sampleSize = this.calculateSampleSize(
        baselineConversionRate,
        mde,
        statisticalPower,
        significanceLevel,
        isRelativeMDE
      );
      
      const duration = this.calculateTestDuration(
        sampleSize,
        estimatedDailyUsers,
        numVariants
      );
      
      matrix.push({
        mde: mde,
        mdeType: isRelativeMDE ? 'relative' : 'absolute',
        sampleSizePerVariant: sampleSize,
        totalSampleSize: sampleSize * numVariants,
        estimatedDurationDays: Math.round(duration * 10) / 10
      });
    }
    
    return matrix;
  },
  
  /**
   * Calculate conversion rates, lift, and statistical significance
   * @param {number} controlUsers - Number of users in control group
   * @param {number} controlConversions - Number of conversions in control group
   * @param {number} treatmentUsers - Number of users in treatment group
   * @param {number} treatmentConversions - Number of conversions in treatment group
   * @param {boolean} useContinuityCorrection - Apply Yates' continuity correction (default: true for small samples)
   * @returns {Object} Dictionary with conversion metrics and statistical results
   */
  calculateConversionMetrics(controlUsers, controlConversions, treatmentUsers, treatmentConversions, useContinuityCorrection = null) {
    // Validate inputs
    if (controlUsers <= 0 || treatmentUsers <= 0) {
      throw new Error('User counts must be positive');
    }
    
    if (controlConversions < 0 || treatmentConversions < 0) {
      throw new Error('Conversion counts cannot be negative');
    }
    
    if (controlConversions > controlUsers || treatmentConversions > treatmentUsers) {
      throw new Error('Conversions cannot exceed user count');
    }
    
    // Conversion rates
    const controlRate = controlConversions / controlUsers;
    const treatmentRate = treatmentConversions / treatmentUsers;
    
    // Relative and absolute lift
    const absoluteLift = treatmentRate - controlRate;
    const relativeLift = controlRate > 0 ? absoluteLift / controlRate : 0;
    
    // Determine if continuity correction should be applied
    if (useContinuityCorrection === null) {
      // Apply continuity correction if any cell in 2x2 table < 5
      const minCell = Math.min(
        controlConversions, 
        controlUsers - controlConversions,
        treatmentConversions, 
        treatmentUsers - treatmentConversions
      );
      useContinuityCorrection = minCell < 5;
    }
    
    // Statistical test (two-proportion z-test)
    let zScore = 0;
    let pValue = 1.0;
    let ciLower = absoluteLift;
    let ciUpper = absoluteLift;
    
    // Calculate pooled proportion for hypothesis test
    const pooledP = (controlConversions + treatmentConversions) / (controlUsers + treatmentUsers);
    
    // Standard error for hypothesis test (under null hypothesis)
    const seHypothesis = Math.sqrt(pooledP * (1 - pooledP) * (1/controlUsers + 1/treatmentUsers));
    
    if (seHypothesis > 0) {
      // Apply continuity correction if needed
      let numerator = Math.abs(treatmentRate - controlRate);
      if (useContinuityCorrection) {
        const correction = 0.5 * (1/controlUsers + 1/treatmentUsers);
        numerator = Math.max(0, numerator - correction);
      }
      
      // Z-score
      zScore = numerator / seHypothesis;
      
      // Two-tailed p-value
      pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
      
      // Confidence interval for difference (using unpooled variance)
      const variance1 = controlRate * (1 - controlRate);
      const variance2 = treatmentRate * (1 - treatmentRate);
      
      // Add small constant to avoid division by zero
      const diffSe = Math.sqrt(
        (variance1 + 0.5/controlUsers) / controlUsers + 
        (variance2 + 0.5/treatmentUsers) / treatmentUsers
      );
      
      const marginOfError = 1.96 * diffSe;
      ciLower = absoluteLift - marginOfError;
      ciUpper = absoluteLift + marginOfError;
    }
    
    return {
      controlConversionRate: Math.round(controlRate * 10000) / 10000,
      treatmentConversionRate: Math.round(treatmentRate * 10000) / 10000,
      absoluteLift: Math.round(absoluteLift * 10000) / 10000,
      relativeLift: Math.round(relativeLift * 10000) / 10000,
      zScore: Math.round(zScore * 1000) / 1000,
      pValue: Math.round(Math.min(1, pValue) * 10000) / 10000,
      isSignificant: pValue < 0.05,
      confidenceInterval: {
        lower: Math.round(ciLower * 10000) / 10000,
        upper: Math.round(ciUpper * 10000) / 10000
      },
      continuityCorrection: useContinuityCorrection
    };
  },
  
  /**
   * Analyze segmented experiment results
   * @param {Array} segmentData - Array of segment data with variants
   * @returns {Array} Array of segment analyses
   */
  analyzeSegments(segmentData) {
    const segmentAnalyses = [];
    
    for (const segment of segmentData) {
      const segmentName = segment.segmentName;
      const variants = segment.variants;
      
      if (variants.length >= 2) {
        // Assume first variant is control, second is treatment
        const control = variants[0];
        const treatment = variants[1];
        
        const metrics = this.calculateConversionMetrics(
          control.users,
          control.conversions,
          treatment.users,
          treatment.conversions
        );
        
        segmentAnalyses.push({
          segmentName: segmentName,
          metrics: metrics
        });
      }
    }
    
    return segmentAnalyses;
  },
  
  /**
   * Validate experiment setup inputs
   * @param {Object} params - Experiment parameters
   * @returns {Object} Validation result
   */
  validateExperimentSetup(params) {
    const errors = [];
    
    try {
      PMTools.utils.validatePercentage(params.baselineConversionRate, 'Baseline conversion rate');
    } catch (e) {
      errors.push(e.message);
    }
    
    try {
      if (params.isRelativeMDE) {
        PMTools.utils.validatePositiveNumber(params.minimumDetectableEffect, 'Minimum detectable effect');
      } else {
        const num = parseFloat(params.minimumDetectableEffect);
        if (isNaN(num) || num <= 0 || num > 1) {
          errors.push('Absolute MDE must be between 0 and 1');
        }
      }
    } catch (e) {
      errors.push(e.message);
    }
    
    try {
      PMTools.utils.validateInteger(params.estimatedDailyUsers, 'Estimated daily users');
    } catch (e) {
      errors.push(e.message);
    }
    
    try {
      PMTools.utils.validatePercentage(params.statisticalPower, 'Statistical power');
    } catch (e) {
      errors.push(e.message);
    }
    
    try {
      PMTools.utils.validatePercentage(params.significanceLevel, 'Significance level');
    } catch (e) {
      errors.push(e.message);
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },
  
  /**
   * Validate results analysis inputs
   * @param {Object} data - Results data
   * @returns {Object} Validation result
   */
  validateResultsData(data) {
    const errors = [];
    
    if (!data.variants || !Array.isArray(data.variants) || data.variants.length < 2) {
      errors.push('At least 2 variants are required');
      return { isValid: false, errors: errors };
    }
    
    for (let i = 0; i < data.variants.length; i++) {
      const variant = data.variants[i];
      
      try {
        PMTools.utils.validateInteger(variant.users, `Variant ${i + 1} users`);
        PMTools.utils.validateInteger(variant.conversions, `Variant ${i + 1} conversions`, 0);
        
        if (variant.conversions > variant.users) {
          errors.push(`Variant ${i + 1}: Conversions cannot exceed users`);
        }
      } catch (e) {
        errors.push(e.message);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
};

console.log('PM Tools statistical calculations loaded');