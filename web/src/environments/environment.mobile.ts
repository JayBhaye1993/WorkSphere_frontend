// Android / iOS app (Capacitor). The app runs on the phone, so "localhost" would mean the phone itself.
// - Android emulator: 10.0.2.2 is the PC running the backend.
// - A real phone on the same Wi-Fi: use the PC's address, e.g. http://192.168.1.20:5010 (the gateway must listen on the network).
// - Production: the public API address.
const API = 'http://10.0.2.2:5010';

export const environment = {
  production: true,
  apiUrls: {
    identity: `${API}/api/identity`,
    tenant:   `${API}/api/tenant`,
    employee: `${API}/api/employee`,
    hr:       `${API}/api/hr`,
    task:     `${API}/api/task`,
    notification: `${API}/api/notification`,
    document: `${API}/api/document`,
    workflow: `${API}/api/workflow`,
    ai:       `${API}/api/ai`,
    analytics:`${API}/api/analytics`,
  }
};
