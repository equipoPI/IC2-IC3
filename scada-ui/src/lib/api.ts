export const getCookie = (name: string) => {
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
};

const getBase = () => {
  const base = import.meta.env.VITE_API_URL || '';
  // If proxy is set (dev) base may be empty; use relative path then
  return base.replace(/\/$/, '');
};

export async function apiFetch(path: string, options: RequestInit = {}) {
  const base = getBase();
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const defaults: RequestInit = { credentials: 'include' };
  const init = { ...defaults, ...options } as RequestInit;

  // Añadir CSRF automáticamente para métodos que lo requieran
  const method = (init.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const csrftoken = getCookie('csrftoken');
    init.headers = { ...(init.headers || {}), ...(csrftoken ? { 'X-CSRFToken': csrftoken } : {}) };
  }

  return fetch(url, init);
}

export default apiFetch;
