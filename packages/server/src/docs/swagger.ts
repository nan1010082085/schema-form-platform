/**
 * OpenAPI 3.0 specification for Schema Form Platform API.
 * Built programmatically from docs/api-contract.md.
 */

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Schema Form Platform API',
    version: '1.0.0',
    description: [
      'Schema-driven form engine API. All responses use a uniform envelope format.',
      '',
      '```ts',
      'interface ApiResponse<T> {',
      '  success: boolean',
      '  data?: T',
      '  error?: { message: string; code?: string; details?: Array<{ path: string; message: string }> }',
      '}',
      '```',
      '',
      '## Authentication',
      '',
      'Pass JWT via `Authorization: Bearer <token>` header. In qiankun mode the token is injected by the host app.',
      '',
      '## Rate Limiting',
      '',
      'All endpoints: 100 requests / 15 minutes / IP.',
    ].join('\n'),
  },
  servers: [
    { url: 'https://schema-form-platform.vercel.app', description: 'Production (Vercel)' },
    { url: 'http://localhost:3001', description: 'Local development' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // --- Envelope ---
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {},
          error: { $ref: '#/components/schemas/ApiError' },
        },
        required: ['success'],
      },
      ApiError: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          code: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      // --- Schema ---
      SchemaListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          editId: { type: 'string', format: 'uuid' },
          version: { type: 'string', example: '20260523143000' },
          name: { type: 'string', example: 'My Form' },
          type: { type: 'string', enum: ['form', 'search_list'] },
          status: { type: 'string', enum: ['draft', 'published'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      SchemaDetail: {
        allOf: [
          { $ref: '#/components/schemas/SchemaListItem' },
          {
            type: 'object',
            properties: {
              json: {
                type: 'array',
                description: 'Widget tree (PartialWidget[])',
                items: { type: 'object' },
              },
              publishId: { type: 'string' },
            },
          },
        ],
      },
      SchemaCreateBody: {
        type: 'object',
        required: ['name', 'type', 'json'],
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['form', 'search_list'] },
          json: { type: 'array', items: { type: 'object' } },
          editId: { type: 'string', description: 'If provided, appends a new version to this edit group' },
        },
      },
      SchemaUpdateBody: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          json: { type: 'array', items: { type: 'object' } },
          type: { type: 'string', enum: ['form', 'search_list'] },
        },
      },
      SchemaImportBody: {
        type: 'object',
        required: ['name', 'type', 'json'],
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['form', 'search_list'] },
          json: { type: 'array', items: { type: 'object' } },
        },
      },
      PublishBody: {
        type: 'object',
        properties: {
          version: { type: 'string', description: 'Specific version to publish. If omitted, publishes the target document.' },
        },
      },
      PublishedSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          editId: { type: 'string', format: 'uuid' },
          publishId: { type: 'string', format: 'uuid' },
          version: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['form', 'search_list'] },
          json: { type: 'array', items: { type: 'object' } },
          publishedAt: { type: 'string', format: 'date-time' },
        },
      },
      // --- Pagination ---
      PaginatedSchemas: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/SchemaListItem' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      // --- Versions ---
      VersionItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          version: { type: 'string', example: '20260523150000' },
          createdAt: { type: 'string', format: 'date-time' },
          published: { type: 'boolean' },
        },
      },
      VersionList: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/VersionItem' } },
          total: { type: 'integer' },
        },
      },
      // --- Auth ---
      LoginBody: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: '123456' },
        },
      },
      LoginData: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          displayName: { type: 'string' },
          role: { type: 'string' },
        },
      },
      // --- Dict ---
      DictItem: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
      },
      // --- Data ---
      DataListResponse: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'object' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      // --- Health ---
      HealthData: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number', example: 3600 },
          database: { type: 'string', example: 'connected' },
        },
      },
      // --- Import validation error ---
      ImportError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Schema validation failed' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string', example: 'json[0].children[2].type' },
                    message: { type: 'string', example: 'Invalid widget type: unknown_type' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    // ========== Health ==========
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Service healthy',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/HealthData' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    // ========== Schema CRUD ==========
    '/api/schemas': {
      get: {
        tags: ['Schema'],
        summary: 'List schemas (paginated)',
        operationId: 'listSchemas',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Items per page' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Fuzzy search by name' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['form', 'search_list'] }, description: 'Filter by schema type' },
        ],
        responses: {
          '200': {
            description: 'Paginated schema list',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/PaginatedSchemas' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Schema'],
        summary: 'Create schema (or append version)',
        operationId: 'createSchema',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SchemaCreateBody' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Schema created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/SchemaDetail' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/api/schemas/import': {
      post: {
        tags: ['Schema'],
        summary: 'Import schema from JSON',
        operationId: 'importSchema',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SchemaImportBody' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Schema imported',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/SchemaDetail' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ImportError' },
              },
            },
          },
        },
      },
    },

    '/api/schemas/published/{sourceId}': {
      get: {
        tags: ['Schema'],
        summary: 'Get published version by sourceId',
        operationId: 'getPublishedSchema',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'sourceId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'The editId of the source schema' },
        ],
        responses: {
          '200': {
            description: 'Published schema',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/PublishedSchema' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '404': {
            description: 'Published version not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    },

    '/api/schemas/{id}': {
      get: {
        tags: ['Schema'],
        summary: 'Get schema by ID',
        operationId: 'getSchema',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Schema detail',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/SchemaDetail' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Schema'],
        summary: 'Update schema (partial)',
        operationId: 'updateSchema',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SchemaUpdateBody' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Schema updated',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/SchemaDetail' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Schema'],
        summary: 'Delete schema and associated published version',
        operationId: 'deleteSchema',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Schema deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    },

    '/api/schemas/{id}/publish': {
      post: {
        tags: ['Schema'],
        summary: 'Publish a schema version',
        operationId: 'publishSchema',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PublishBody' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Published schema',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/PublishedSchema' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    // ========== Version Management ==========
    '/api/schemas/{editId}/versions': {
      get: {
        tags: ['Versions'],
        summary: 'List versions for an edit group',
        operationId: 'listVersions',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'editId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Version list (descending by version)',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/VersionList' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/api/schemas/{editId}/versions/{version}': {
      get: {
        tags: ['Versions'],
        summary: 'Get a specific version',
        operationId: 'getVersion',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'editId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'version', in: 'path', required: true, schema: { type: 'string', example: '20260523143000' } },
        ],
        responses: {
          '200': {
            description: 'Schema detail for that version',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/SchemaDetail' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '404': {
            description: 'Version not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    },

    // ========== Auth ==========
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with username/password',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginBody' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/LoginData' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    },

    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (client-side token removal)',
        operationId: 'logout',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logout acknowledged',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    { type: 'object', properties: { data: { nullable: true, example: null } } },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        operationId: 'getCurrentUser',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/User' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    },

    // ========== Dict ==========
    '/api/dict/{code}': {
      get: {
        tags: ['Dictionary'],
        summary: 'Get dictionary data by code',
        operationId: 'getDict',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Dictionary code. Built-in: city, gender, status, department, role, priority, education, industry',
          },
        ],
        responses: {
          '200': {
            description: 'Dictionary items',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/DictItem' } },
                      },
                    },
                  ],
                },
              },
            },
          },
          '404': {
            description: 'Dictionary code not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    },

    // ========== Data ==========
    '/api/data/list': {
      get: {
        tags: ['Data'],
        summary: 'Generic paginated data list',
        operationId: 'getDataList',
        parameters: [
          { name: 'pageNum', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number (alias: page)' },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Items per page (alias: size)' },
        ],
        responses: {
          '200': {
            description: 'Paginated data',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/DataListResponse' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Data'],
        summary: 'Generic paginated data list (POST)',
        operationId: 'postDataList',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pageNum: { type: 'integer', default: 1, description: 'Page number (alias: page)' },
                  pageSize: { type: 'integer', default: 10, description: 'Items per page (alias: size)' },
                },
                additionalProperties: { type: 'string', description: 'Filter params (e.g. department, status, name)' },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Paginated data',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/DataListResponse' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/api/data/{id}': {
      get: {
        tags: ['Data'],
        summary: 'Get single data record by ID',
        operationId: 'getDataItem',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Data record',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { type: 'object' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    },

    // ========== Options ==========
    '/api/options/{category}': {
      get: {
        tags: ['Options'],
        summary: 'Get flat option list by category',
        operationId: 'getOptions',
        parameters: [
          {
            name: 'category',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Category name. Built-in: cities, departments, roles, skills, priorities, statuses',
          },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Filter by label or value (case-insensitive)' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Option items with pagination',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/DictItem' } },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            pageSize: { type: 'integer' },
                            total: { type: 'integer' },
                            totalPages: { type: 'integer' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '404': {
            description: 'Category not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
          },
        },
      },
    },

    '/api/options/tree/{category}': {
      get: {
        tags: ['Options'],
        summary: 'Get tree-structured options by category',
        operationId: 'getTreeOptions',
        parameters: [
          {
            name: 'category',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Tree category. Built-in: regions (province/city/district), departments (org tree)',
          },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Filter tree nodes by label (returns matching nodes with ancestor paths)' },
        ],
        responses: {
          '200': {
            description: 'Tree nodes',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              label: { type: 'string' },
                              value: { type: 'string' },
                              children: { type: 'array', items: {} },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '404': {
            description: 'Category not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
          },
        },
      },
    },

    // ========== Mock ==========
    '/api/mock/{schemaId}': {
      get: {
        tags: ['Mock'],
        summary: 'Generate mock data for a schema',
        operationId: 'getMockData',
        parameters: [
          { name: 'schemaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Schema ID (the document id, not editId)' },
        ],
        responses: {
          '200': {
            description: 'Generated mock data keyed by field name',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { type: 'object', additionalProperties: {} },
                      },
                    },
                  ],
                },
              },
            },
          },
          '404': {
            description: 'Schema not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    },
  },
}

export default spec
