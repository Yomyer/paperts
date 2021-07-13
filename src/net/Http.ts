import Base from '../core/Base'

type HttpOptions = {
    method?: 'get' | 'post' | 'put' | 'delete' | 'patch'
    url?: string
    async?: boolean
    mimeType?: string
    onLoad?: (xhr: XMLHttpRequest, message: string) => void
    onError?: (message: string, status: number) => void
}

export default class Http {
    static request(options: HttpOptions) {
        const xhr = new self.XMLHttpRequest()
        xhr.open(
            (options.method || 'get').toUpperCase(),
            options.url,
            Base.pick(options.async, true)
        )
        if (options.mimeType) xhr.overrideMimeType(options.mimeType)

        xhr.onload = function () {
            const status = xhr.status
            if (status === 0 || status === 200) {
                if (options.onLoad) {
                    options.onLoad(xhr, xhr.responseText)
                }
            } else {
                xhr.onerror(null)
            }
        }

        xhr.onerror = function () {
            const status = xhr.status
            const message =
                'Could not load "' + options.url + '" (Status: ' + status + ')'
            if (options.onError) {
                options.onError(message, status)
            } else {
                throw new Error(message)
            }
        }

        return xhr.send(null)
    }
}
