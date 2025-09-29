import { useState, useEffect, useMemo } from 'react';

interface UseVirtualScrollProps<T> {
  items: T[];
  containerHeight: number;
  itemHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>({
  items,
  containerHeight,
  itemHeight,
  overscan = 5
}: UseVirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      items: items.slice(
        Math.max(0, startIndex - overscan),
        endIndex
      )
    };
  }, [items, scrollTop, containerHeight, itemHeight, overscan]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    startIndex: visibleItems.startIndex
  };
}

// Simple performance monitoring hook
export function usePerformanceMonitor(name: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      if (endTime - startTime > 100) { // Log if operation takes > 100ms
        console.log(`⚡ Performance: ${name} took ${(endTime - startTime).toFixed(2)}ms`);
      }
    };
  }, [name]);
}