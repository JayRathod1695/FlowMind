import { API_BASE_URL } from '@/lib/constants'

interface ApiSuccessEnvelope<TData> {
	success: true
	data: TData
}

interface ApiFailureEnvelope {
	success: false
	error: {
		code: string
		message: string
	}
}

type ApiEnvelope<TData> = ApiSuccessEnvelope<TData> | ApiFailureEnvelope

interface ApiErrorOptions {
	status?: number
	code?: string | null
	details?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

const isFailureEnvelope = (value: unknown): value is ApiFailureEnvelope => {
	if (!isRecord(value) || value.success !== false) {
		return false
	}

	const errorPayload = value.error
	return (
		isRecord(errorPayload) &&
		typeof errorPayload.code === 'string' &&
		typeof errorPayload.message === 'string'
	)
}

const isSuccessEnvelope = <TData>(
	value: unknown,
): value is ApiSuccessEnvelope<TData> =>
	isRecord(value) && value.success === true && 'data' in value

const buildApiUrl = (path: string): string => {
	if (/^https?:\/\//i.test(path)) {
		return path
	}

	const normalizedBase = API_BASE_URL.endsWith('/')
		? API_BASE_URL.slice(0, -1)
		: API_BASE_URL
	const normalizedPath = path.startsWith('/') ? path : `/${path}`

	return `${normalizedBase}${normalizedPath}`
}

const parseResponseBody = async (response: Response): Promise<unknown> => {
	if (response.status === 204) {
		return null
	}

	const rawBody = await response.text()
	if (!rawBody) {
		return null
	}

	try {
		return JSON.parse(rawBody)
	} catch {
		throw new ApiError('Invalid JSON response from server', {
			status: response.status,
			details: rawBody,
		})
	}
}

export class ApiError extends Error {
	status: number
	code: string | null
	details: unknown

	constructor(message: string, options: ApiErrorOptions = {}) {
		super(message)
		this.name = 'ApiError'
		this.status = options.status ?? 0
		this.code = options.code ?? null
		this.details = options.details
	}
}

export const apiRequest = async <TData>(
	path: string,
	init: RequestInit = {},
): Promise<TData> => {
	const url = buildApiUrl(path)
	const headers = new Headers(init.headers)

	if (!headers.has('Accept')) {
		headers.set('Accept', 'application/json')
	}

	if (init.body !== undefined && !(init.body instanceof FormData)) {
		if (!headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json')
		}
	}

	let response: Response
	try {
		response = await fetch(url, {
			...init,
			headers,
		})
	} catch (error) {
		throw new ApiError('Unable to reach the server. Please try again.', {
			details: error,
		})
	}

	const parsedBody = await parseResponseBody(response)

	if (!response.ok) {
		if (isFailureEnvelope(parsedBody)) {
			throw new ApiError(parsedBody.error.message, {
				status: response.status,
				code: parsedBody.error.code,
				details: parsedBody,
			})
		}

		const fallbackMessage =
			typeof parsedBody === 'string'
				? parsedBody
				: `Request failed with status ${response.status}`

		throw new ApiError(fallbackMessage, {
			status: response.status,
			details: parsedBody,
		})
	}

	if (isSuccessEnvelope<TData>(parsedBody)) {
		return parsedBody.data
	}

	if (parsedBody === null) {
		return null as TData
	}

	throw new ApiError('Unexpected API response format', {
		status: response.status,
		details: parsedBody as ApiEnvelope<TData>,
	})
}
