/**
 * engine — 事件/规则引擎统一出口
 */
export { executeEventAction, triggerWidgetEvent, evaluateCondition } from './eventEngine'
export { executeRuleAction, evaluateWidgetRules, computeWidgetRenderState } from './ruleEngine'
