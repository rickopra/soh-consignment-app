export class ApiError extends Error {
  code: string
  status?: number

  constructor(message: string, code = 'REQUEST_FAILED', status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}
