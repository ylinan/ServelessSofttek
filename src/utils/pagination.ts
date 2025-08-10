export interface PaginatedResult<T> {
    items: T[];
    lastKey?: string;
}

export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
    const start = (page - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);
    return {
        items: paginatedItems,
        lastKey: paginatedItems.length ? paginatedItems[paginatedItems.length - 1]['id'] : undefined
    };
}