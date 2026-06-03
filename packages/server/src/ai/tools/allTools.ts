/**
 * Unified tool set — all agents can access all tools.
 *
 * Merges editorTools and flowTools into a single array,
 * removing duplicates and ensuring all tools are available
 * to every agent.
 */

// Editor tools
import {
  searchSchemasTool,
  getSchemaDetailTool,
  searchPublishedSchemasTool,
  getWidgetCatalogueTool,
  semanticSearchSchemasTool,
  validateSchemaTool,
} from './editorTools.js'

// Flow tools
import {
  searchFlowsTool,
  getFlowDetailTool,
  searchUsersTool,
  generateSchemaTool,
  validateFlowTool,
} from './flowTools.js'

// Collaboration tools
import { requestCollaborationTool } from './collaborationTools.js'

// ────────────────────────────────────────────
// Unified tool array for ToolNode
// ────────────────────────────────────────────

export const allTools = [
  // Editor tools
  searchSchemasTool,
  getSchemaDetailTool,
  searchPublishedSchemasTool,
  getWidgetCatalogueTool,
  semanticSearchSchemasTool,
  validateSchemaTool,

  // Flow tools
  searchFlowsTool,
  getFlowDetailTool,
  searchUsersTool,
  generateSchemaTool,
  validateFlowTool,

  // Collaboration tools
  requestCollaborationTool,
]
