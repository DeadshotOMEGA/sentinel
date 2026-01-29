import { Router } from 'express'
import swaggerUi from 'swagger-ui-express'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { apiLogger } from '../lib/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load OpenAPI spec
let openApiSpec: object
try {
  const specPath = join(__dirname, '../../openapi.json')
  const specContent = readFileSync(specPath, 'utf-8')
  openApiSpec = JSON.parse(specContent)
} catch (error) {
  apiLogger.error('Failed to load OpenAPI spec', { error: error instanceof Error ? error.message : String(error) })
  openApiSpec = {
    openapi: '3.0.2',
    info: {
      title: 'Sentinel API',
      version: '2.0.0',
      description: 'OpenAPI spec not found. Run `pnpm openapi` to generate.',
    },
    paths: {},
  }
}

/**
 * Swagger UI Router
 * Interactive API documentation with "Try it out" functionality
 */
export const swaggerRouter: Router = Router()

swaggerRouter.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Sentinel API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  })
)

/**
 * ReDoc Router
 * Clean, responsive API reference documentation
 */
export const redocRouter: Router = Router()

redocRouter.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sentinel API Reference</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <redoc spec-url='/openapi.json'></redoc>
        <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
      </body>
    </html>
  `)
})

/**
 * OpenAPI Spec Router
 * Serves the raw OpenAPI JSON specification
 */
export const openapiRouter: Router = Router()

openapiRouter.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(openApiSpec, null, 2))
})
