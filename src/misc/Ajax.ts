import { WebRequest } from './WebRequest'

type Nullable<T> = T | null

export const SetCorsBehavior = (
  url: string | string[],
  element: { crossOrigin: string | null }
): void => {
  if (url && url.indexOf('data:') === 0) {
    return
  }

  element.crossOrigin = 'anonymous'
}
/**
 * Encode a buffer to a base64 string
 * @param buffer defines the buffer to encode
 * @returns the encoded string
 */
export const EncodeArrayBufferToBase64 = (
  buffer: ArrayBuffer | ArrayBufferView
): string => {
  const keyStr =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let output = ''
  let chr1, chr2, chr3, enc1, enc2, enc3, enc4
  let i = 0
  const bytes = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer)

  while (i < bytes.length) {
    chr1 = bytes[i++]
    chr2 = i < bytes.length ? bytes[i++] : Number.NaN
    chr3 = i < bytes.length ? bytes[i++] : Number.NaN

    enc1 = chr1 >> 2
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4)
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6)
    enc4 = chr3 & 63

    if (isNaN(chr2)) {
      enc3 = enc4 = 64
    } else if (isNaN(chr3)) {
      enc4 = 64
    }
    output +=
      keyStr.charAt(enc1) +
      keyStr.charAt(enc2) +
      keyStr.charAt(enc3) +
      keyStr.charAt(enc4)
  }

  return output
}

function RequestFile(
  url: string,
  onSuccess?: (data: string | ArrayBuffer, request?: any) => void,
  onProgress?: (event: ProgressEvent) => void,
  offlineProvider?: any,
  useArrayBuffer?: boolean,
  onError?: (error: any) => void,
  onOpened?: (request: any) => void
) {
  const loadUrl = '' + url
  let aborted = false
  const fileRequest: any = {
    abort: () => (aborted = true)
  }
  const requestFile = () => {
    let request: Nullable<WebRequest> = new WebRequest()
    let retryHandle: Nullable<ReturnType<typeof setTimeout>> = null
    let onReadyStateChange: Nullable<() => void>

    const unbindEvents = () => {
      if (!request) {
        return
      }

      if (onProgress) {
        request.removeEventListener('progress', onProgress)
      }
      if (onReadyStateChange) {
        request.removeEventListener('readystatechange', onReadyStateChange)
      }
      request.removeEventListener('loadend', onLoadEnd!)
    }

    let onLoadEnd: Nullable<() => void> = () => {
      unbindEvents()

      fileRequest.onCompleteObservable.notifyObservers(fileRequest)
      fileRequest.onCompleteObservable.clear()

      onProgress = undefined
      onReadyStateChange = null
      onLoadEnd = null
      onError = undefined
      onOpened = undefined
      onSuccess = undefined
    }

    fileRequest.abort = () => {
      aborted = true

      if (onLoadEnd) {
        onLoadEnd()
      }

      if (request && request.readyState !== (XMLHttpRequest.DONE || 4)) {
        request.abort()
      }

      if (retryHandle !== null) {
        clearTimeout(retryHandle)
        retryHandle = null
      }

      request = null
    }

    const handleError = (error: any) => {
      const message = error.message || 'Unknown error'
      if (onError && request) {
        onError(message)
      }
    }

    const retryLoop = (retryIndex: number) => {
      if (!request) {
        return
      }
      request.open('GET', loadUrl)

      if (onOpened) {
        try {
          onOpened(request)
        } catch (e) {
          handleError(e)
          return
        }
      }

      if (useArrayBuffer) {
        request.responseType = 'arraybuffer'
      }

      if (onProgress) {
        request.addEventListener('progress', onProgress)
      }

      if (onLoadEnd) {
        request.addEventListener('loadend', onLoadEnd)
      }

      onReadyStateChange = () => {
        if (aborted || !request) {
          return
        }

        // In case of undefined state in some browsers.
        if (request.readyState === (XMLHttpRequest.DONE || 4)) {
          // Some browsers have issues where onreadystatechange can be called multiple times with the same value.
          if (onReadyStateChange) {
            request.removeEventListener('readystatechange', onReadyStateChange)
          }

          if (
            (request.status >= 200 && request.status < 300) ||
            request.status === 0
          ) {
            try {
              if (onSuccess) {
                onSuccess(
                  useArrayBuffer ? request.response : request.responseText,
                  request
                )
              }
            } catch (e) {
              handleError(e)
            }
            return
          }
        }
      }

      request.addEventListener('readystatechange', onReadyStateChange)

      request.send()
    }

    retryLoop(0)
  }
}

function loadFile(
  fileOrUrl: File | string,
  onSuccess: (
    data: string | ArrayBuffer,
    responseURL?: string,
    contentType?: Nullable<string>
  ) => void,
  onProgress?: (ev: ProgressEvent) => void,
  offlineProvider?: any,
  useArrayBuffer?: boolean,
  onError?: (request?: any, exception?: any) => void,
  onOpened?: (request: any) => void
) {
  const url = fileOrUrl as string
  return RequestFile(
    url,
    (data: any, request: any) => {
      onSuccess(
        data,
        request?.responseURL,
        request?.getResponseHeader('content-type')
      )
    },
    onProgress,
    offlineProvider,
    useArrayBuffer,
    undefined,
    onOpened
  )
}

export default function loadImage(
  input: string | ArrayBuffer | ArrayBufferView | Blob,
  onLoad: (img: HTMLImageElement | ImageBitmap) => void,
  onError: (message?: string, exception?: any) => void,
  mimeType: string = ''
): Nullable<HTMLImageElement> {
  let url: string
  let usingObjectURL = false
  if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
    if (typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
      url = URL.createObjectURL(new Blob([input], { type: mimeType }))
      usingObjectURL = true
    } else {
      url = `data:${mimeType};base64,` + EncodeArrayBufferToBase64(input)
    }
  } else if (input instanceof Blob) {
    url = URL.createObjectURL(input)
    usingObjectURL = true
  } else {
    url = input
  }

  const onErrorHandler = (exception: any) => {
    if (onError) {
      const inputText = url || input.toString()
      onError(
        `Error while trying to load image: ${
          inputText.indexOf('http') === 0 || inputText.length <= 128
            ? inputText
            : inputText.slice(0, 128) + '...'
        }`,
        exception
      )
    }
  }

  const img = new Image()
  SetCorsBehavior(url, img)

  const loadHandler = () => {
    img.removeEventListener('load', loadHandler)
    img.removeEventListener('error', errorHandler)

    onLoad(img)

    // Must revoke the URL after calling onLoad to avoid security exceptions in
    // certain scenarios (e.g. when hosted in vscode).
    if (usingObjectURL && img.src) {
      URL.revokeObjectURL(img.src)
    }
  }
  const errorHandler = (err: any) => {
    img.removeEventListener('load', loadHandler)
    img.removeEventListener('error', errorHandler)

    onErrorHandler(err)

    if (usingObjectURL && img.src) {
      URL.revokeObjectURL(img.src)
    }
  }
  img.addEventListener('load', loadHandler)
  img.addEventListener('error', errorHandler)

  loadFile(
    url,
    (data: string | ArrayBuffer, _: any, contentType: any) => {
      const type = !mimeType && contentType ? contentType : mimeType
      const blob = new Blob([data], { type })
      const url = URL.createObjectURL(blob)
      usingObjectURL = true
      img.src = url
    },
    undefined,
    undefined,
    true,
    (request: any, exception: any) => {
      onErrorHandler(exception)
    }
  )
  return img
}
