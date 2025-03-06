import React from "react"


export const EMPTY_OBJECT = {}
export const EMPTY_ARRAY = []


export const delay = (time = 0) => new Promise(resolve => setTimeout(resolve, time))

export const clearCache = async () => {
  try {
    const names = await caches.keys()
    for (const name of names) {
      await caches.delete(name)
    }
  } catch {
    // do nothing
  }
}

export const clearCacheUrl = async (url) => {
  try {
    const names = await caches.keys()
    for (const name of names) {
      const cache = await caches.open(name)
      const match = await cache.match(new URL(url, window.location.origin).toString())
      if (match) {
        await cache.delete(url)
        break
      }
    }
  } catch {
    // do nothing
  }
}


export const setVisibleInterval = (fn, number) => {
  let interval = setInterval(fn, number)
  const handler = () => {
    clearInterval(interval)
    if (document.visibilityState === "visible") {
      interval = setInterval(fn, number)
    } else {
      clearInterval(interval)
    }
  }

  document.addEventListener("visibilitychange", handler)
  return () => {
    document.removeEventListener("visibilitychange", handler)
    clearInterval(interval)
  }
}


export const useVisibleEffect = (fn) => {
  const ref = React.useRef(fn)
  ref.current = fn

  const handler = React.useCallback(() => {
    if (document.visibilityState === "visible") {
      ref.current?.()
    }
  }, [])

  document.addEventListener("visibilitychange", handler)
  return () => {
    document.removeEventListener("visibilitychange", handler)
  }
}