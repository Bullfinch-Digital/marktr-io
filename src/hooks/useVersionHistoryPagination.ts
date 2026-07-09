import { useEffect, useState } from "react";

export const VERSION_HISTORY_PAGE_SIZE = 10;

export function useVersionHistoryPagination<T>(
  items: T[],
  pageSize = VERSION_HISTORY_PAGE_SIZE
) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items.length, pageSize]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  const remaining = items.length - visibleCount;

  const showMore = () => {
    setVisibleCount((count) => Math.min(count + pageSize, items.length));
  };

  return { visibleItems, hasMore, showMore, remaining, total: items.length };
}
