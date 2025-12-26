import { IAuditLog, IUser } from '../types';

const KEYS = {
  AUDIT_LOGS: 'pdv_master_audit_logs',
  SESSION: 'pdv_master_session'
};

// Safe storage wrapper (duplicate from storageService to avoid circular dependency issues)
const getStorageItem = (key: string) => {
    try { return localStorage.getItem(key); } catch { return null; }
};
const setStorageItem = (key: string, val: string) => {
    try { localStorage.setItem(key, val); } catch { }
};

export const AuditService = {
  
  log: (
    action: IAuditLog['action'], 
    details: string, 
    severity: IAuditLog['severity'] = 'INFO',
    userOverride?: IUser // Optional: pass user if session might be empty (e.g. login)
  ) => {
    try {
        let user = userOverride;
        
        if (!user) {
            const session = getStorageItem(KEYS.SESSION);
            user = session ? JSON.parse(session) : null;
        }

        const logEntry: IAuditLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: user?.id || 'SYSTEM',
            userName: user?.name || 'Sistema',
            userRole: user?.role || 'ADMIN',
            action,
            details,
            severity,
            ip: '192.168.1.10' // Simulated local IP
        };

        const logs = AuditService.getLogs();
        logs.unshift(logEntry); // Add to beginning
        
        // Limit log size to prevent storage overflow (keep last 1000)
        if (logs.length > 1000) logs.length = 1000;

        setStorageItem(KEYS.AUDIT_LOGS, JSON.stringify(logs));
    } catch (e) {

    }
  },

  getLogs: (): IAuditLog[] => {
      const data = getStorageItem(KEYS.AUDIT_LOGS);
      return data ? JSON.parse(data) : [];
  },

  getLogsByFilter: (filter: { startDate?: Date, endDate?: Date, severity?: string }) => {
      let logs = AuditService.getLogs();
      
      if (filter.startDate) {
          logs = logs.filter(l => new Date(l.timestamp) >= filter.startDate!);
      }
      if (filter.endDate) {
          logs = logs.filter(l => new Date(l.timestamp) <= filter.endDate!);
      }
      if (filter.severity && filter.severity !== 'ALL') {
          logs = logs.filter(l => l.severity === filter.severity);
      }
      
      return logs;
  }
};
