import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client'

/**
 * Prometheus Metrics Registry
 *
 * Provides RED metrics (Rate, Errors, Duration) and custom business metrics
 * for monitoring the Sentinel backend application.
 */

// Create a new registry
export const register = new Registry()

// Collect default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({
  register,
  prefix: 'sentinel_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
})

// ============================================================================
// HTTP Metrics
// ============================================================================

/**
 * Total number of HTTP requests
 * Labels: method, path, status
 */
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
})

/**
 * HTTP request duration in seconds
 * Labels: method, path
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
})

/**
 * Number of active HTTP connections
 */
export const activeConnections = new Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
})

// ============================================================================
// Database Metrics
// ============================================================================

/**
 * Database query duration in seconds
 * Labels: operation (e.g., 'findMany', 'create', 'update')
 */
export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
})

/**
 * Database connection pool size
 */
export const databasePoolSize = new Gauge({
  name: 'database_pool_size',
  help: 'Number of connections in the database pool',
  labelNames: ['state'], // 'idle', 'active'
  registers: [register],
})

/**
 * Total number of database queries
 * Labels: operation, status (success/error)
 */
export const databaseQueriesTotal = new Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'status'],
  registers: [register],
})

// ============================================================================
// Authentication Metrics
// ============================================================================

/**
 * Total number of authentication attempts
 * Labels: result (success/failure), method (session/apikey)
 */
export const authAttemptsTotal = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result', 'method'],
  registers: [register],
})

/**
 * Number of active sessions
 */
export const activeSessions = new Gauge({
  name: 'auth_active_sessions',
  help: 'Number of active user sessions',
  registers: [register],
})

// ============================================================================
// Business Metrics - Check-ins
// ============================================================================

/**
 * Total number of check-ins
 * Labels: direction (in/out), type (normal/late/early)
 */
export const checkinsTotal = new Counter({
  name: 'checkins_total',
  help: 'Total number of check-ins',
  labelNames: ['direction', 'type'],
  registers: [register],
})

/**
 * Check-in processing duration in seconds
 */
export const checkinDuration = new Histogram({
  name: 'checkin_duration_seconds',
  help: 'Check-in processing duration in seconds',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
})

/**
 * Number of members currently checked in
 */
export const membersCheckedIn = new Gauge({
  name: 'members_checked_in',
  help: 'Number of members currently checked in',
  registers: [register],
})

// ============================================================================
// Business Metrics - Badges
// ============================================================================

/**
 * Total number of badge operations
 * Labels: operation (assigned/unassigned/created/deactivated)
 */
export const badgeOperationsTotal = new Counter({
  name: 'badge_operations_total',
  help: 'Total number of badge operations',
  labelNames: ['operation'],
  registers: [register],
})

/**
 * Number of badges by status
 * Labels: status (active/assigned/unassigned/deactivated)
 */
export const badgesByStatus = new Gauge({
  name: 'badges_by_status',
  help: 'Number of badges by status',
  labelNames: ['status'],
  registers: [register],
})

// ============================================================================
// Business Metrics - Visitors
// ============================================================================

/**
 * Total number of visitor operations
 * Labels: operation (signin/signout/created)
 */
export const visitorOperationsTotal = new Counter({
  name: 'visitor_operations_total',
  help: 'Total number of visitor operations',
  labelNames: ['operation'],
  registers: [register],
})

/**
 * Number of visitors currently on-site
 */
export const visitorsOnSite = new Gauge({
  name: 'visitors_on_site',
  help: 'Number of visitors currently on-site',
  registers: [register],
})

// ============================================================================
// Business Metrics - Events
// ============================================================================

/**
 * Total number of events created
 * Labels: type (training/parade/exercise/other)
 */
export const eventsTotal = new Counter({
  name: 'events_total',
  help: 'Total number of events created',
  labelNames: ['type'],
  registers: [register],
})

// ============================================================================
// Business Metrics - DDS (Duty Desk Supervisor)
// ============================================================================

/**
 * Total number of DDS assignments
 * Labels: status (assigned/completed/cancelled)
 */
export const ddsAssignmentsTotal = new Counter({
  name: 'dds_assignments_total',
  help: 'Total number of DDS assignments',
  labelNames: ['status'],
  registers: [register],
})

// ============================================================================
// Business Metrics - Security
// ============================================================================

/**
 * Total number of security alerts
 * Labels: severity (low/medium/high/critical), type
 */
export const securityAlertsTotal = new Counter({
  name: 'security_alerts_total',
  help: 'Total number of security alerts',
  labelNames: ['severity', 'type'],
  registers: [register],
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Record an HTTP request
 */
export function recordHttpRequest(method: string, path: string, statusCode: number, duration: number) {
  httpRequestsTotal.inc({ method, path, status: statusCode.toString() })
  httpRequestDuration.observe({ method, path }, duration)
}

/**
 * Record a database query
 */
export function recordDatabaseQuery(operation: string, duration: number, success: boolean) {
  databaseQueriesTotal.inc({ operation, status: success ? 'success' : 'error' })
  databaseQueryDuration.observe({ operation }, duration)
}

/**
 * Record an authentication attempt
 */
export function recordAuthAttempt(result: 'success' | 'failure', method: 'session' | 'apikey') {
  authAttemptsTotal.inc({ result, method })
}

/**
 * Record a check-in
 */
export function recordCheckin(direction: 'in' | 'out', type: 'normal' | 'late' | 'early' = 'normal') {
  checkinsTotal.inc({ direction, type })
}

/**
 * Record a badge operation
 */
export function recordBadgeOperation(operation: 'assigned' | 'unassigned' | 'created' | 'deactivated') {
  badgeOperationsTotal.inc({ operation })
}

/**
 * Record a visitor operation
 */
export function recordVisitorOperation(operation: 'signin' | 'signout' | 'created') {
  visitorOperationsTotal.inc({ operation })
}

/**
 * Record an event creation
 */
export function recordEvent(type: 'training' | 'parade' | 'exercise' | 'other') {
  eventsTotal.inc({ type })
}

/**
 * Record a DDS assignment
 */
export function recordDdsAssignment(status: 'assigned' | 'completed' | 'cancelled') {
  ddsAssignmentsTotal.inc({ status })
}

/**
 * Record a security alert
 */
export function recordSecurityAlert(severity: 'low' | 'medium' | 'high' | 'critical', type: string) {
  securityAlertsTotal.inc({ severity, type })
}
