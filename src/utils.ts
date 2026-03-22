export async function parallelLimit<T>(
    tasks: (() => Promise<T>)[],
    limit: number
): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let nextIndex = 0;

    async function runNext(): Promise<void> {
        while (nextIndex < tasks.length) {
            const index = nextIndex++;
            results[index] = await tasks[index]();
        }
    }

    const workers = Array.from(
        { length: Math.min(limit, tasks.length) },
        () => runNext()
    );

    await Promise.all(workers);
    return results;
}

export function debounce<T extends (...args: any[]) => void>(
    fn: T,
    delayMs: number
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: Parameters<T>) => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => fn(...args), delayMs);
    };
}
