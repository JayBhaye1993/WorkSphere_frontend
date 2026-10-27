// Development: the dev server forwards /api/* to the gateway on :5010 (proxy.conf.json),
// so the app talks to its own address (no CORS, works in embedded browsers).
export const environment = {
  production: false,
  apiUrls: {
    identity: '/api/identity',
    tenant:   '/api/tenant',
    employee: '/api/employee',
    hr:       '/api/hr',
    task:     '/api/task',
    notification: '/api/notification',
    document: '/api/document',
    workflow: '/api/workflow',
    ai:       '/api/ai',
    analytics:'/api/analytics',
  }
};
