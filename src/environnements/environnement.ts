export const environnement = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api/v2',
  wsBaseUrl: 'ws://localhost:8000/ws',
  healthCheck: {
    enabled: true,
    interval: 10000, // 10 secondes
    timeout: 5000    // 5 secondes
  }
}