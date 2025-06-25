// LLM Structured Output Schemas for PM Tools
// Pydantic-style schema definitions for consistent LLM responses

const LLMSchemas = {
  // Schema for hypothesis analysis response
  HypothesisAnalysis: {
    type: 'object',
    required: ['clarityScore', 'strengths', 'improvements', 'improvedVersion', 'successMetrics', 'businessConsiderations'],
    properties: {
      clarityScore: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        description: 'How clear and testable is the hypothesis (1-10)'
      },
      strengths: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5,
        description: 'What works well in this hypothesis'
      },
      improvements: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 5,
        description: 'Key risks and gaps to address'
      },
      improvedVersion: {
        type: 'string',
        maxLength: 500,
        description: 'A more specific, testable version of the hypothesis'
      },
      successMetrics: {
        type: 'object',
        required: ['primary', 'secondary', 'guardrails'],
        properties: {
          primary: {
            type: 'string',
            description: 'The main metric to measure success'
          },
          secondary: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 5,
            description: 'Additional metrics to track'
          },
          guardrails: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 5,
            description: 'Metrics to ensure nothing breaks'
          }
        }
      },
      businessConsiderations: {
        type: 'object',
        required: ['estimatedImpact', 'resourcesNeeded', 'stakeholders', 'alignmentWithGoals'],
        properties: {
          estimatedImpact: {
            type: 'string',
            description: 'Revenue/cost impact if successful'
          },
          resourcesNeeded: {
            type: 'object',
            properties: {
              design: { type: 'string' },
              engineering: { type: 'string' },
              analytics: { type: 'string' },
              product: { type: 'string' }
            }
          },
          stakeholders: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key people to involve'
          },
          alignmentWithGoals: {
            type: 'array',
            items: { type: 'string' },
            description: 'How this aligns with company objectives'
          }
        }
      }
    }
  },

  // Schema for results interpretation response
  ResultsInterpretation: {
    type: 'object',
    required: ['bottomLine', 'shipDecision', 'practicalSignificance', 'riskAssessment', 'nextSteps', 'strategicQuestions'],
    properties: {
      bottomLine: {
        type: 'string',
        maxLength: 300,
        description: 'TL;DR of what happened and what it means'
      },
      shipDecision: {
        type: 'object',
        required: ['recommendation', 'confidence', 'keyReasons', 'caveats'],
        properties: {
          recommendation: {
            type: 'string',
            enum: ['SHIP IT', 'DO NOT SHIP', 'NEEDS MORE DATA'],
            description: 'Clear ship/no-ship decision'
          },
          confidence: {
            type: 'string',
            enum: ['HIGH', 'MEDIUM', 'LOW'],
            description: 'Confidence level in the recommendation'
          },
          keyReasons: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 3,
            description: 'Top reasons for the recommendation'
          },
          caveats: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 3,
            description: 'Important conditions or warnings'
          }
        }
      },
      practicalSignificance: {
        type: 'object',
        required: ['isImpactful', 'businessValue', 'effortVsReward'],
        properties: {
          isImpactful: {
            type: 'boolean',
            description: 'Is this meaningful for the business?'
          },
          businessValue: {
            type: 'string',
            description: 'Actual impact in revenue/users/engagement'
          },
          effortVsReward: {
            type: 'string',
            enum: ['WORTH IT', 'MARGINAL', 'NOT WORTH IT'],
            description: 'Is the improvement worth the effort?'
          }
        }
      },
      riskAssessment: {
        type: 'object',
        required: ['potentialIssues', 'affectedSegments', 'technicalConcerns'],
        properties: {
          potentialIssues: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 3,
            description: 'What could go wrong if shipped'
          },
          affectedSegments: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 3,
            description: 'User segments that might be negatively affected'
          },
          technicalConcerns: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 3,
            description: 'Technical debt or maintenance issues'
          }
        }
      },
      nextSteps: {
        type: 'array',
        items: {
          type: 'object',
          required: ['action', 'owner', 'timeline'],
          properties: {
            action: { type: 'string' },
            owner: { type: 'string' },
            timeline: { type: 'string' }
          }
        },
        minItems: 1,
        maxItems: 3,
        description: 'Immediate actions to take this week'
      },
      strategicQuestions: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 3,
        description: 'Important questions not yet considered'
      }
    }
  },

  // Helper function to generate JSON schema prompt
  generateSchemaPrompt(schemaName) {
    const schema = this[schemaName];
    return `You must respond with valid JSON that exactly matches this schema:
${JSON.stringify(schema, null, 2)}

Important rules:
1. Return ONLY valid JSON, no markdown formatting
2. All required fields must be present
3. Arrays must respect minItems and maxItems constraints
4. Strings must not exceed maxLength where specified
5. Use only allowed enum values where specified
6. Numbers must be within minimum and maximum bounds`;
  },

  // Validate response against schema
  validateResponse(response, schemaName) {
    try {
      const data = typeof response === 'string' ? JSON.parse(response) : response;
      const schema = this[schemaName];
      
      // Basic validation (in production, use a proper JSON schema validator)
      for (const field of schema.required) {
        if (!(field in data)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },

  // Convert structured data to clean HTML (no markdown parsing needed!)
  renderHypothesisAnalysis(data) {
    return {
      clarityScore: `${data.clarityScore}/10`,
      strengths: `<ul>${data.strengths.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}</ul>`,
      improvements: `<ul>${data.improvements.map(i => `<li>${this.escapeHtml(i)}</li>`).join('')}</ul>`,
      improvedVersion: `<div class="improved-hypothesis">${this.escapeHtml(data.improvedVersion)}</div>`,
      successMetrics: `
        <div class="metrics-section">
          <div><strong>Primary:</strong> ${this.escapeHtml(data.successMetrics.primary)}</div>
          <div><strong>Secondary:</strong> <ul>${data.successMetrics.secondary.map(m => `<li>${this.escapeHtml(m)}</li>`).join('')}</ul></div>
          <div><strong>Guardrails:</strong> <ul>${data.successMetrics.guardrails.map(g => `<li>${this.escapeHtml(g)}</li>`).join('')}</ul></div>
        </div>
      `,
      businessConsiderations: `
        <div class="business-section">
          <div><strong>Impact:</strong> ${this.escapeHtml(data.businessConsiderations.estimatedImpact)}</div>
          <div><strong>Resources:</strong> 
            <ul>
              ${Object.entries(data.businessConsiderations.resourcesNeeded).map(([k, v]) => 
                `<li><strong>${this.capitalize(k)}:</strong> ${this.escapeHtml(v)}</li>`
              ).join('')}
            </ul>
          </div>
          <div><strong>Stakeholders:</strong> ${data.businessConsiderations.stakeholders.map(s => this.escapeHtml(s)).join(', ')}</div>
          <div><strong>Goals Alignment:</strong> <ul>${data.businessConsiderations.alignmentWithGoals.map(g => `<li>${this.escapeHtml(g)}</li>`).join('')}</ul></div>
        </div>
      `
    };
  },

  renderResultsInterpretation(data) {
    const shipColor = {
      'SHIP IT': '#28a745',
      'DO NOT SHIP': '#dc3545',
      'NEEDS MORE DATA': '#ffc107'
    }[data.shipDecision.recommendation];

    return {
      keyTakeaway: this.escapeHtml(data.bottomLine),
      recommendation: `
        <div style="background: ${shipColor}; color: white; padding: 8px; border-radius: 4px; margin: 8px 0;">
          <strong>${data.shipDecision.recommendation}</strong> (${data.shipDecision.confidence} confidence)
        </div>
        <ul>${data.shipDecision.keyReasons.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}</ul>
        ${data.shipDecision.caveats.length > 0 ? 
          `<div class="caveats"><strong>⚠️ Caveats:</strong> <ul>${data.shipDecision.caveats.map(c => `<li>${this.escapeHtml(c)}</li>`).join('')}</ul></div>` 
          : ''}
      `,
      practicalSignificance: `
        <div class="${data.practicalSignificance.isImpactful ? 'impactful' : 'not-impactful'}">
          <div><strong>Business Impact:</strong> ${this.escapeHtml(data.practicalSignificance.businessValue)}</div>
          <div><strong>Worth the Effort?</strong> ${data.practicalSignificance.effortVsReward}</div>
        </div>
      `,
      riskAssessment: `
        <div class="risks">
          ${data.riskAssessment.potentialIssues.length > 0 ? 
            `<div><strong>Potential Issues:</strong> <ul>${data.riskAssessment.potentialIssues.map(i => `<li>${this.escapeHtml(i)}</li>`).join('')}</ul></div>` 
            : ''}
          ${data.riskAssessment.affectedSegments.length > 0 ? 
            `<div><strong>Affected Users:</strong> ${data.riskAssessment.affectedSegments.map(s => this.escapeHtml(s)).join(', ')}</div>` 
            : ''}
          ${data.riskAssessment.technicalConcerns.length > 0 ? 
            `<div><strong>Technical Concerns:</strong> <ul>${data.riskAssessment.technicalConcerns.map(c => `<li>${this.escapeHtml(c)}</li>`).join('')}</ul></div>` 
            : ''}
        </div>
      `,
      nextSteps: `
        <table class="next-steps-table">
          <thead><tr><th>Action</th><th>Owner</th><th>Timeline</th></tr></thead>
          <tbody>
            ${data.nextSteps.map(step => 
              `<tr>
                <td>${this.escapeHtml(step.action)}</td>
                <td>${this.escapeHtml(step.owner)}</td>
                <td>${this.escapeHtml(step.timeline)}</td>
              </tr>`
            ).join('')}
          </tbody>
        </table>
      `,
      followUpQuestions: `<ol>${data.strategicQuestions.map(q => `<li>${this.escapeHtml(q)}</li>`).join('')}</ol>`
    };
  },

  // Helper functions
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

// Make schemas available globally
window.LLMSchemas = LLMSchemas;