// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for Next.js Web APIs
import { TextEncoder, TextDecoder } from 'util';

// Set up global Web APIs
Object.assign(global, {
  TextEncoder,
  TextDecoder,
  // Mock Headers class
  Headers: class Headers {
    constructor(init) {
      this.headers = new Map();
      if (init) {
        for (const [key, value] of Object.entries(init)) {
          this.headers.set(key.toLowerCase(), String(value));
        }
      }
    }
    get(name) { return this.headers.get(name.toLowerCase()) || null; }
    set(name, value) { this.headers.set(name.toLowerCase(), String(value)); }
    append(name, value) { 
      const existing = this.get(name);
      this.set(name, existing ? `${existing}, ${value}` : value);
    }
    delete(name) { this.headers.delete(name.toLowerCase()); }
    has(name) { return this.headers.has(name.toLowerCase()); }
  },
  // Mock Request class
  Request: class Request {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new global.Headers(init?.headers);
      this.body = init?.body || null;
    }
    async json() {
      if (this._mockJson) {
        return this._mockJson;
      }
      return JSON.parse(this.body || '{}');
    }
  },
  // Mock Response class  
  Response: class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new global.Headers(init?.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
  },
});

// Mock React's createElement to handle JSX transform issues with React 19
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    createElement: originalReact.createElement,
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useParams: () => ({
    id: 'test-poll-id'
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});