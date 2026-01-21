import type { AIProvider } from './providers'
import { FLOW_FORM_PROMPT_TEMPLATE } from './prompts/flow-form'
import { TEMPLATE_SHORT_PROMPT_TEMPLATE } from './prompts/template-short'
import { UTILITY_GENERATION_PROMPT_TEMPLATE } from './prompts/utility-generator'
import { UTILITY_JUDGE_PROMPT_TEMPLATE } from './prompts/utility-judge'
import { MARKETING_PROMPT } from './prompts/marketing'
import { UTILITY_PROMPT } from './prompts/utility'
import { BYPASS_PROMPT } from './prompts/bypass'

export type AiRoutesConfig = {
  generateTemplate: boolean
  generateUtilityTemplates: boolean
  generateFlowForm: boolean
}

export type AiFallbackConfig = {
  enabled: boolean
  order: AIProvider[]
  models: Record<AIProvider, string>
}

export type AiPromptsConfig = {
  templateShort: string
  utilityGenerationTemplate: string
  utilityJudgeTemplate: string
  flowFormTemplate: string
  // Estratégias de geração de templates
  strategyMarketing: string
  strategyUtility: string
  strategyBypass: string
}

export const DEFAULT_AI_ROUTES: AiRoutesConfig = {
  generateTemplate: true,
  generateUtilityTemplates: true,
  generateFlowForm: true,
}

export const DEFAULT_AI_FALLBACK: AiFallbackConfig = {
  enabled: false,
  order: ['google', 'openai', 'anthropic'],
  models: {
    google: 'gemini-3-flash-preview',
    openai: 'gpt-5-mini',
    anthropic: 'claude-sonnet-4-5',
  },
}

export const DEFAULT_AI_PROMPTS: AiPromptsConfig = {
  templateShort: TEMPLATE_SHORT_PROMPT_TEMPLATE,
  utilityGenerationTemplate: UTILITY_GENERATION_PROMPT_TEMPLATE,
  utilityJudgeTemplate: UTILITY_JUDGE_PROMPT_TEMPLATE,
  flowFormTemplate: FLOW_FORM_PROMPT_TEMPLATE,
  // Estratégias de geração de templates
  strategyMarketing: MARKETING_PROMPT,
  strategyUtility: UTILITY_PROMPT,
  strategyBypass: BYPASS_PROMPT,
}
