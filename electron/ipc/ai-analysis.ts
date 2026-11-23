import { Logger } from './logger.js';
import { CodeAnalysisResult, SubtaskSuggestion, AiAnalysisResult, AiProviderConfig, GenerationStrategy, EdgeCaseInfo } from './code-analysis.js';

function buildPrompt(sourceCode: string, analysis: CodeAnalysisResult, _provider: AiProviderConfig): string {
  const { variables, constraints, edgeCases, algorithm, complexity, includes } = analysis;

  const varDescriptions = variables.map(v =>
    `- ${v.name}: ${v.type}${v.isArray ? '[]' : ''} (${v.isInput ? 'input' : 'output'}) - ${v.description}`
  ).join('\n');

  const constraintDescriptions = constraints.map(c =>
    `- ${c.variable}: ${c.min !== undefined ? `min=${c.min}` : ''} ${c.max !== undefined ? `max=${c.max}` : ''} (${c.description})`
  ).join('\n');

  const edgeCaseDescriptions = edgeCases.map(e =>
    `- ${e.type}: ${e.description} (${e.affectedVariables.join(', ')}) - priority: ${e.priority}`
  ).join('\n');

  return `You are an expert competitive programming test case generator.

Analyze the following C++ solution code and provide test generation suggestions.

**Source Code:**
\`\`\`cpp
${sourceCode}
\`\`\`

**Analysis Results:**
- Algorithm: ${algorithm || 'Unknown'}
- Complexity: ${complexity || 'Unknown'}
- Includes: ${includes.join(', ') || 'None'}

**Variables:**
${varDescriptions || 'None detected'}

**Constraints:**
${constraintDescriptions || 'None detected'}

**Edge Cases:**
${edgeCaseDescriptions || 'None detected'}

**Task:**
Suggest 2-4 subtasks with different constraints and test counts. Each subtask should target specific difficulty levels (small, medium, large, edge cases).
For each subtask, specify:
1. Name and description
2. Variable limits (min/max for each numeric variable)
3. Test count
4. Generation strategy (boundary, random, pattern, mixed)

Also suggest additional edge cases not already detected.

**Output Format (JSON):**
{
  "suggestedSubtasks": [
    {
      "id": 1,
      "name": "Small",
      "description": "Small constraints for basic correctness",
      "limits": { "n": { "min": 1, "max": 10 }, "m": { "min": 1, "max": 10 } },
      "testCount": 10,
      "generationStrategy": "boundary"
    }
  ],
  "generationStrategies": [
    { "subtaskId": 1, "strategy": "boundary", "parameters": { "boundaryRatio": 0.5 } }
  ],
  "additionalEdgeCases": [
    { "type": "empty", "description": "Empty array", "affectedVariables": ["arr"], "priority": "high" }
  ]
}`;
}

async function callAiApi(provider: AiProviderConfig, prompt: string, logger: Logger): Promise<string | null> {
  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider.apiKey) {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  const body = {
    model: provider.model,
    messages: [
      { role: 'system', content: 'You are a competitive programming test case generator. Output only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('AIAnalysis', `API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    logger.error('AIAnalysis', `API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

function parseAiResponse(response: string): AiAnalysisResult {
  try {
    const parsed = JSON.parse(response);

    const suggestedSubtasks: SubtaskSuggestion[] = (parsed.suggestedSubtasks || []).map((s: any, i: number) => ({
      id: s.id || i + 1,
      name: s.name || `Subtask ${i + 1}`,
      description: s.description || '',
      limits: s.limits || {},
      testCount: s.testCount || 10,
      generationStrategy: s.generationStrategy || 'mixed',
    }));

    const generationStrategies: GenerationStrategy[] = (parsed.generationStrategies || []).map((s: any) => ({
      subtaskId: s.subtaskId || 1,
      strategy: s.strategy || 'mixed',
      parameters: s.parameters || {},
    }));

    const additionalEdgeCases: EdgeCaseInfo[] = (parsed.additionalEdgeCases || []).map((e: any) => ({
      type: e.type || 'special',
      description: e.description || '',
      affectedVariables: e.affectedVariables || [],
      priority: e.priority || 'medium',
    }));

    return {
      success: true,
      suggestedSubtasks,
      generationStrategies,
      additionalEdgeCases,
    };
  } catch (error) {
    return {
      success: false,
      suggestedSubtasks: [],
      generationStrategies: [],
      additionalEdgeCases: [],
      error: `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export function generateFallbackSubtasks(analysis: CodeAnalysisResult, totalTestCount: number): AiAnalysisResult {
  const numericVars = analysis.variables.filter(v =>
    ['int', 'long', 'double', 'float'].includes(v.type) && v.isInput
  );

  if (numericVars.length === 0) {
    return {
      success: true,
      suggestedSubtasks: [
        { id: 1, name: 'Default', description: 'Default test cases', limits: {}, testCount: totalTestCount, generationStrategy: 'mixed' },
      ],
      generationStrategies: [{ subtaskId: 1, strategy: 'mixed', parameters: {} }],
      additionalEdgeCases: [],
    };
  }

  const varNames = numericVars.map(v => v.name);
  // const limits = Object.fromEntries(varNames.map(name => [name, { min: 1, max: 100 }])); // unused

  return {
    success: true,
    suggestedSubtasks: [
      {
        id: 1,
        name: 'Small',
        description: 'Small constraints for basic correctness',
        limits: Object.fromEntries(varNames.map(name => [name, { min: 1, max: 10 }])),
        testCount: Math.floor(totalTestCount * 0.3),
        generationStrategy: 'boundary',
      },
      {
        id: 2,
        name: 'Medium',
        description: 'Medium constraints for typical cases',
        limits: Object.fromEntries(varNames.map(name => [name, { min: 10, max: 1000 }])),
        testCount: Math.floor(totalTestCount * 0.4),
        generationStrategy: 'mixed',
      },
      {
        id: 3,
        name: 'Large',
        description: 'Large constraints for performance testing',
        limits: Object.fromEntries(varNames.map(name => [name, { min: 1000, max: 100000 }])),
        testCount: totalTestCount - Math.floor(totalTestCount * 0.3) - Math.floor(totalTestCount * 0.4),
        generationStrategy: 'boundary',
      },
    ],
    generationStrategies: [
      { subtaskId: 1, strategy: 'boundary', parameters: { boundaryRatio: 0.5 } },
      { subtaskId: 2, strategy: 'mixed', parameters: { boundaryRatio: 0.3, patternRatio: 0.2 } },
      { subtaskId: 3, strategy: 'boundary', parameters: { boundaryRatio: 0.5 } },
    ],
    additionalEdgeCases: [],
  };
}

export type { AiAnalysisResult } from './code-analysis.js';

export async function analyzeWithAi(
  sourceCode: string,
  analysis: CodeAnalysisResult,
  provider: AiProviderConfig,
  logger: Logger,
  totalTestCount = 50
): Promise<AiAnalysisResult> {
  logger.info('AIAnalysis', `Starting AI analysis with ${provider.type} (${provider.model})`);

  const prompt = buildPrompt(sourceCode, analysis, provider);
  const response = await callAiApi(provider, prompt, logger);

  if (!response) {
    logger.warning('AIAnalysis', 'AI API call failed, using fallback');
    return generateFallbackSubtasks(analysis, totalTestCount);
  }

  const result = parseAiResponse(response);
  logger.success('AIAnalysis', `AI analysis complete: ${result.suggestedSubtasks.length} subtasks suggested`);
  return result;
}