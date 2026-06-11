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
      'Schema-driven form engine API with workflow orchestration. All responses use a uniform envelope format.',
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
      'Two authentication methods are supported:',
      '',
      '1. **JWT Bearer Token** — Pass via `Authorization: Bearer <token>` header. Obtain from `/api/auth/login`.',
      '2. **API Key** — Pass via `X-API-Key` header. Use for programmatic access to Workflow Instance endpoints.',
      '',
      '## Workflow API',
      '',
      'The Workflow API enables creating, publishing, and executing automated business processes:',
      '',
      '1. **Create workflow** — Link a form schema to a flow definition',
      '2. **Publish workflow** — Makes the workflow available for instance creation via API',
      '3. **Start instance** — `POST /api/workflows/{id}/instances` (public API)',
      '4. **Query status** — `GET /api/workflows/{id}/instances/{instanceId}`',
      '',
      '## Rate Limiting',
      '',
      'All endpoints: 100 requests / 15 minutes / IP.',
    ].join('\n'),
  },
  servers: [
    { url: 'https://schema-form-platform.vercel.app', description: 'Production (Vercel)' },
    { url: `http://localhost:${process.env.PORT ?? 3001}`, description: 'Local development' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API Key for programmatic access. Create keys via the admin panel.',
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
      // --- Workflow ---
      Workflow: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string' },
          name: { type: 'string', example: 'Leave Request Workflow' },
          description: { type: 'string', example: 'Employee leave request approval process' },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          formSchemaId: { type: 'string', format: 'uuid' },
          flowDefinitionId: { type: 'string', format: 'uuid' },
          dataUpdateRules: {
            type: 'array',
            items: { $ref: '#/components/schemas/DataUpdateRule' },
          },
          publishConfig: { $ref: '#/components/schemas/PublishConfig' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DataUpdateRule: {
        type: 'object',
        required: ['trigger', 'targetField', 'sourceField'],
        properties: {
          trigger: { type: 'string', example: 'onApprove' },
          targetField: { type: 'string', example: 'status' },
          sourceField: { type: 'string', example: 'approvalResult' },
          transform: { type: 'string', example: 'value.toUpperCase()' },
        },
      },
      PublishConfig: {
        type: 'object',
        properties: {
          entryUrl: { type: 'string', example: 'https://api.example.com/api/workflows/{id}/instances' },
          permissions: {
            type: 'object',
            properties: {
              launchers: { type: 'array', items: { type: 'string' } },
              viewers: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      WorkflowCreateBody: {
        type: 'object',
        required: ['name', 'formSchemaId', 'flowDefinitionId'],
        properties: {
          name: { type: 'string', minLength: 1, example: 'Leave Request Workflow' },
          description: { type: 'string', example: 'Employee leave request approval process' },
          formSchemaId: { type: 'string', format: 'uuid' },
          flowDefinitionId: { type: 'string', format: 'uuid' },
          dataUpdateRules: {
            type: 'array',
            items: { $ref: '#/components/schemas/DataUpdateRule' },
          },
          publishConfig: { $ref: '#/components/schemas/PublishConfig' },
        },
        example: {
          name: 'Leave Request Workflow',
          description: 'Employee leave request approval process',
          formSchemaId: '550e8400-e29b-41d4-a716-446655440000',
          flowDefinitionId: '660e8400-e29b-41d4-a716-446655440001',
        },
      },
      WorkflowUpdateBody: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          formSchemaId: { type: 'string', format: 'uuid' },
          flowDefinitionId: { type: 'string', format: 'uuid' },
          dataUpdateRules: {
            type: 'array',
            items: { $ref: '#/components/schemas/DataUpdateRule' },
          },
          publishConfig: { $ref: '#/components/schemas/PublishConfig' },
        },
      },
      StartInstanceBody: {
        type: 'object',
        properties: {
          variables: {
            type: 'object',
            description: 'Initial variables for the flow instance',
            additionalProperties: {},
            example: {
              applicantName: 'John Doe',
              leaveDays: 5,
              reason: 'Annual vacation',
            },
          },
        },
        example: {
          variables: {
            applicantName: 'John Doe',
            leaveDays: 5,
            reason: 'Annual vacation',
          },
        },
      },
      StartInstanceResponse: {
        type: 'object',
        properties: {
          instanceId: { type: 'string', format: 'uuid' },
          status: { type: 'string', example: 'running' },
        },
      },
      InstanceStatus: {
        type: 'object',
        properties: {
          instanceId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['running', 'completed', 'terminated', 'suspended'] },
          currentNode: { type: 'string', nullable: true, description: 'ID of the currently active/waiting node' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      PaginatedWorkflows: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Workflow' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          totalPages: { type: 'integer' },
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

    // ========== Workflow CRUD ==========
    '/api/workflows': {
      get: {
        tags: ['Workflow'],
        summary: 'List workflows (paginated)',
        operationId: 'listWorkflows',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Items per page' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'archived'] }, description: 'Filter by workflow status' },
        ],
        responses: {
          '200': {
            description: 'Paginated workflow list',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/PaginatedWorkflows' },
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
        tags: ['Workflow'],
        summary: 'Create a new workflow',
        operationId: 'createWorkflow',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkflowCreateBody' },
              examples: {
                basic: {
                  summary: 'Basic workflow creation',
                  value: {
                    name: 'Leave Request Workflow',
                    description: 'Employee leave request approval process',
                    formSchemaId: '550e8400-e29b-41d4-a716-446655440000',
                    flowDefinitionId: '660e8400-e29b-41d4-a716-446655440001',
                  },
                },
                withRules: {
                  summary: 'With data update rules',
                  value: {
                    name: 'Purchase Order Workflow',
                    description: 'Purchase order approval with budget tracking',
                    formSchemaId: '550e8400-e29b-41d4-a716-446655440000',
                    flowDefinitionId: '660e8400-e29b-41d4-a716-446655440001',
                    dataUpdateRules: [
                      {
                        trigger: 'onApprove',
                        targetField: 'budgetStatus',
                        sourceField: 'approvalResult',
                        transform: 'value === "approved" ? "allocated" : "rejected"',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Workflow created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Workflow' },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
          '404': { description: 'Referenced formSchema or flowDefinition not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
        },
      },
    },

    '/api/workflows/{id}': {
      get: {
        tags: ['Workflow'],
        summary: 'Get workflow by ID',
        operationId: 'getWorkflow',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Workflow detail',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/Workflow' } } },
                  ],
                },
              },
            },
          },
          '404': { description: 'Workflow not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
        },
      },
      put: {
        tags: ['Workflow'],
        summary: 'Update workflow',
        operationId: 'updateWorkflow',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkflowUpdateBody' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Workflow updated',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/Workflow' } } },
                  ],
                },
              },
            },
          },
          '400': { description: 'Invalid UUID or validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
          '404': { description: 'Workflow not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
        },
      },
      delete: {
        tags: ['Workflow'],
        summary: 'Delete workflow',
        operationId: 'deleteWorkflow',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Workflow deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
          '404': { description: 'Workflow not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
        },
      },
    },

    '/api/workflows/{id}/publish': {
      post: {
        tags: ['Workflow'],
        summary: 'Publish workflow (enables API instance creation)',
        operationId: 'publishWorkflow',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Workflow published with auto-generated entry URL',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    { type: 'object', properties: { data: { $ref: '#/components/schemas/Workflow' } } },
                  ],
                },
              },
            },
          },
          '400': { description: 'Workflow already published', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
          '404': { description: 'Workflow not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
        },
      },
    },

    '/api/workflows/{id}/start': {
      post: {
        tags: ['Workflow'],
        summary: 'Start workflow instance (internal, requires JWT)',
        operationId: 'startWorkflow',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Workflow ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StartInstanceBody' },
              example: {
                data: { applicantName: 'John Doe', leaveDays: 5 },
                variables: { priority: 'high' },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Flow instance started',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            submission: { type: 'object' },
                            instance: { type: 'object' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { description: 'Only published workflows can be started', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
          '404': { description: 'Workflow not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
        },
      },
    },

    // ========== Workflow Instances (Public API) ==========
    '/api/workflows/{id}/instances': {
      post: {
        tags: ['Workflow Instances'],
        summary: 'Start a new flow instance via API',
        description: 'Public API endpoint for programmatic workflow execution. Accepts JWT or API Key authentication. The workflow must be published before instances can be created.',
        operationId: 'createInstance',
        security: [
          { bearerAuth: [] },
          { apiKey: [] },
        ],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Workflow ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StartInstanceBody' },
              examples: {
                basic: {
                  summary: 'Start with variables',
                  value: {
                    variables: {
                      applicantName: 'John Doe',
                      leaveDays: 5,
                      reason: 'Annual vacation',
                    },
                  },
                },
                minimal: {
                  summary: 'Start with empty variables',
                  value: {
                    variables: {},
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Instance created successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/StartInstanceResponse' },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  data: {
                    instanceId: '770e8400-e29b-41d4-a716-446655440002',
                    status: 'running',
                  },
                },
              },
            },
          },
          '400': {
            description: 'Workflow not published or invalid request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
                example: { success: false, error: { message: 'Only published workflows can be started via API.' } },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
                example: { success: false, error: { message: 'Authentication required. Provide a valid Bearer token or X-API-Key header.' } },
              },
            },
          },
          '404': {
            description: 'Workflow not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
                example: { success: false, error: { message: 'Workflow not found.' } },
              },
            },
          },
        },
      },
    },

    '/api/workflows/{id}/instances/{instanceId}': {
      get: {
        tags: ['Workflow Instances'],
        summary: 'Get flow instance status',
        description: 'Query the current status and active node of a running flow instance. Supports JWT or API Key authentication.',
        operationId: 'getInstanceStatus',
        security: [
          { bearerAuth: [] },
          { apiKey: [] },
        ],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Workflow ID' },
          { name: 'instanceId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Instance ID returned from createInstance' },
        ],
        responses: {
          '200': {
            description: 'Instance status',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/InstanceStatus' },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  data: {
                    instanceId: '770e8400-e29b-41d4-a716-446655440002',
                    status: 'running',
                    currentNode: 'userTask_approval',
                    completedAt: null,
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid ID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
                example: { success: false, error: { message: 'Invalid ID format.' } },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          '404': {
            description: 'Instance not found or does not belong to specified workflow',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
                example: { success: false, error: { message: 'Instance not found for this workflow.' } },
              },
            },
          },
        },
      },
    },
  },
}

export default spec
