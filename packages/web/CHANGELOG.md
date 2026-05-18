# Changelog

## 1.0.0-rc.1 (2026-05-15)

### Features

- **29→35 SchemaTypes**: added `search-list`, `toolbar-buttons`, `file-preview`, `dialog`, `steps`, `tabs`
- **6 linkage types**: `visible` / `disabled` / `required` / `options` / `set-value` (S16) / `reset-fields` (S17)
- **API pipeline**: `dataPath` dot-notation (S16), `childrenKey` tree options (S17), `${fieldName}` template params (S16), cache TTL (S17)
- **Response normalizer**: 4 duplicated parsing sites consolidated into `responseNormalizer.ts` (S16)
- **Dialog rendering**: `FgDialog` renders `dialogSchema` via `SchemaRender` with isolated `formData` (S16)
- **ErrorBoundary**: catches render errors, shows fallback UI with retry, supports telemetry callback (S15/S20)
- **FgFilePreview**: file selection component with two-column layout (S19)
- **Structured ButtonEditor**: per-action-type conditional form, 8 action types (S18)
- **RulesEditor**: visual validation rule builder replacing JSON textarea (S18)
- **Real-time schema validation**: PropertyPanel shows inline errors/warnings during editing (S18)
- **Editor field completion**: tooltipField/linkEvent/imageWidth/renderFn/icon/navigateQuery (S18)
- **SearchFields/Columns API config**: full `SchemaApiConfig` editing (S16)
- **FgTable display label**: any column with `api`/`options` renders translated label (S17)
- **CSS variables**: `--fg-*` namespace across all 8 layout components (S15/S20)
- **Export**: CSV + Excel download for search-list (S15)
- **RendererView postMessage protocol**: schema injection, formData read/write, host examples (S20)
- **5 structured guides**: getting-started, schema-writing, linkage, API pipeline, migration (S20)
- **Performance benchmarks**: 50/100/200 field thresholds in CI (S20)
- **PreviewView**: 35-component documentation with live rendering (S19)

### Testing

- 295 tests, 16 spec files, zero TypeScript errors
- CI pipeline: typecheck + test

### Docs

- `docs/guides/getting-started.md`
- `docs/guides/schema-writing.md`
- `docs/guides/linkage-guide.md`
- `docs/guides/api-pipeline.md`
- `docs/guides/migration-guide.md`
- `docs/guides/renderer-protocol.md`
- `docs/component-catalog.html`
- `docs/project-summary-2026-05-15.html`
