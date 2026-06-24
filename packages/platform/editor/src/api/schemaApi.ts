/**
 * Schema API — 表单 Schema 相关接口
 *
 * 聚合 schema CRUD、版本管理、导入、模板等接口。
 * 底层委托 utils/apiClient。
 */
export {
  fetchSchemas,
  fetchSchemaById,
  createSchema,
  updateSchema,
  deleteSchema,
  publishSchema,
  fetchPublishedSchema,
  fetchPublishedByPublishId,
  fetchVersions,
  fetchVersion,
  deleteVersion,
  importSchema,
  fetchTemplates,
  applyTemplate,
  createTemplate,
  deleteTemplate,
} from '@/utils/apiClient'

export type {
  VersionEntry,
  VersionListResponse,
  SchemaImportPayload,
  TemplateCategory,
  TemplateItem,
  TemplateApplyResult,
} from '@/utils/apiClient'
