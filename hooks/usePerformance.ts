import React, { useCallback, useMemo, useRef, useEffect } from 'react';

// Performance optimization hooks

// Debounced callback hook
export function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): T {
    const timeoutRef = useRef<NodeJS.Timeout>();
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useCallback((...args: any[]) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]) as T;
}

// Throttled callback hook
export function useThrottle<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): T {
    const timeoutRef = useRef<NodeJS.Timeout>();
    const lastCallRef = useRef(0);

    return useCallback((...args: any[]) => {
        const now = Date.now();
        if (now - lastCallRef.current >= delay) {
            callback(...args);
            lastCallRef.current = now;
        } else if (!timeoutRef.current) {
            timeoutRef.current = setTimeout(() => {
                callback(...args);
                lastCallRef.current = Date.now();
                timeoutRef.current = undefined;
            }, delay - (now - lastCallRef.current));
        }
    }, [callback, delay]) as T;
}

// Memoized callback
export function useMemoizedCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList
): T {
    return useMemo(() => callback, deps);
}

// Intersection Observer hook for virtual scrolling
export function useIntersectionObserver(
    ref: React.RefObject<Element>,
    options: IntersectionObserverInit = {}
) {
    const [isIntersecting, setIsIntersecting] = React.useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
            },
            options
        );

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [ref, options]);

    return isIntersecting;
}

// Lazy loading image hook
export function useLazyImage(src: string) {
    const [loaded, setLoaded] = React.useState(false);
    const [error, setError] = React.useState(false);

    useEffect(() => {
        const img = new Image();
        img.onload = () => setLoaded(true);
        img.onerror = () => setError(true);
        img.src = src;
    }, [src]);

    return { loaded, error };
}

// Performance monitoring hook
export function usePerformanceLogging(componentName: string) {
    const startTimeRef = useRef<number>();

    useEffect(() => {
        startTimeRef.current = performance.now();
        console.log(`🔄 ${componentName} mounted`);

        return () => {
            if (startTimeRef.current) {
                const duration = performance.now() - startTimeRef.current;
                console.log(`🗑️ ${componentName} unmounted after ${duration.toFixed(2)}ms`);
            }
        };
    }, [componentName]);

    const logRender = useCallback(() => {
        if (startTimeRef.current) {
            const renderTime = performance.now() - startTimeRef.current;
            console.log(`🎨 ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
        }
    }, [componentName]);

    return { logRender };
}

// Batch state updates hook
export function useBatchState<T extends Record<string, any>>(
    initialState: T
): [T, (updates: Partial<T>) => void] {
    const [state, setState] = React.useState(initialState);
    const updatesRef = React.useRef<Partial<T>>({});

    const batchUpdate = React.useCallback((updates: Partial<T>) => {
        updatesRef.current = { ...updatesRef.current, ...updates };

        // Debounce the actual update
        setTimeout(() => {
            setState(prev => ({ ...prev, ...updatesRef.current }));
            updatesRef.current = {};
        }, 0);
    }, []);

    return [state, batchUpdate];
}

// Web Vitals hook
export function useWebVitals() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'web-vitals' in window) {
            // Import web-vitals dynamically
            import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
                getCLS(console.log);
                getFID(console.log);
                getFCP(console.log);
                getLCP(console.log);
                getTTFB(console.log);
            }).catch(console.error);
        }
    }, []);
}

// Resize observer hook
export function useResizeObserver<T extends HTMLElement>(
    ref: React.RefObject<T>,
    callback: (entry: ResizeObserverEntry) => void
) {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            entries.forEach(callback);
        });

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [ref, callback]);
}

// Idle callback hook for low-priority updates
export function useIdleCallback(callback: () => void, timeout = 1) {
    useEffect(() => {
        if ('requestIdleCallback' in window) {
            const id = requestIdleCallback(callback, { timeout });
            return () => cancelIdleCallback(id);
        } else {
            // Fallback for browsers without requestIdleCallback
            const id = setTimeout(callback, timeout);
            return () => clearTimeout(id);
        }
    }, [callback, timeout]);
}

// Preload hook
export function usePreload(href: string, as: string = 'fetch') {
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = as;
        link.href = href;
        document.head.appendChild(link);

        return () => {
            document.head.removeChild(link);
        };
    }, [href, as]);
}

// Resource hints hook
export function useResourceHints(resources: Array<{ href: string; rel: string; as?: string }>) {
    useEffect(() => {
        const links = resources.map(({ href, rel, as }) => {
            const link = document.createElement('link');
            link.rel = rel;
            link.href = href;
            if (as) link.as = as;
            document.head.appendChild(link);
            return link;
        });

        return () => {
            links.forEach(link => {
                if (document.head.contains(link)) {
                    document.head.removeChild(link);
                }
            });
        };
    }, [resources]);
}
