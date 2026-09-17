const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

let _isRefreshing = false

async function refreshTokens(): Promise<boolean> {
  if (_isRefreshing) return false
  _isRefreshing = true
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  } finally {
    _isRefreshing = false
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isForm = false,
): Promise<T> {
  const headers: Record<string, string> = {}
  let bodyInit: BodyInit | undefined

  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json'
    bodyInit = JSON.stringify(body)
  } else if (isForm) {
    bodyInit = body as FormData
  }

  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: bodyInit,
    })

  let res = await doFetch()

  if (res.status === 401) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      res = await doFetch()
    } else {
      window.dispatchEvent(new CustomEvent('navigate-to-login'))
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const json = await res.json()
      detail = json.detail ?? detail
    } catch {
      // non-JSON error body
    }
    throw new Error(detail)
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>('POST', path, formData, true),
}
