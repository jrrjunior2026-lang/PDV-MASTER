import '@testing-library/jest-dom';

// Mock para localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock para sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock para crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-1234-5678-9012')
  }
});

// Mock para navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock para console.warn/error to avoid noise in tests
const originalWarn = console.warn;
const originalError = console.error;

// But allow them in development or when explicitly needed
const isDebugMode = process.env.DEBUG_TESTS === 'true';

console.warn = (...args) => {
  if (isDebugMode || args[0]?.includes?.('ReactDOMTestUtils')) {
    originalWarn(...args);
  }
};

console.error = (...args) => {
  if (isDebugMode || args[0]?.includes?.('Warning:')) {
    originalError(...args);
  }
};

// Mock window.location methods
delete (global as any).window.location;
(global as any).window.location = {
  href: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  reload: vi.fn(),
  replace: vi.fn(),
  assign: vi.fn()
};

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
