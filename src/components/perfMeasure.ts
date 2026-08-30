interface FrameStats {
    elapsedMs: number;
    frameCount: number;
    maxFrameGapMs: number;
    averageFrameGapMs: number;
    p50FrameGapMs: number | undefined;
    p95FrameGapMs: number | undefined;
    p99FrameGapMs: number | undefined;
    framesOver50Ms: number;
    framesOver100Ms: number;
    unaccountedFrameTime: number;
    unaccountedCallbackTime: number;

    maxCallbackGapMs: number;
    averageCallbackGapMs: number;
    p50CallbackGapMs: number | undefined;
    p95CallbackGapMs: number | undefined;
    p99CallbackGapMs: number | undefined;
    callbacksOver50Ms: number;
    callbacksOver100Ms: number;
}

function percentile(values: number[], fraction: number): number | undefined{
    if (values.length === 0) {
        return 0;
    }

    const sorted = values.toSorted((a, b) => a - b);
    const index = Math.ceil(sorted.length * fraction) - 1;

    return sorted[Math.max(0, index)];
}




export function startFrameMonitor(): {
    stop(): FrameStats;
} {
    let frameId = 0;
    const startMs = performance.now();

    let previousFrameTime = startMs;
    let previousCallbackTime = startMs;

    let frameCount = 0;
    let totalFrameGap = 0;
    let totalCallbackGap = 0;
    let maxFrameGap = 0;
    let framesOver50Ms = 0;
    let framesOver100Ms = 0;

    const frameGaps: number[] = [];
    const callbackGaps: number[] = [];




    const measureFrame = (frameTime: number) => {
        const callbackTime = performance.now();

        const frameGap = frameTime - previousFrameTime;
        const callbackGap = callbackTime - previousCallbackTime;

        previousFrameTime = frameTime;
        previousCallbackTime = callbackTime;
        
        frameGaps.push(frameGap);
        callbackGaps.push(callbackGap);

        frameCount++;
        totalFrameGap += frameGap;
        totalCallbackGap += callbackGap;
        maxFrameGap = Math.max(maxFrameGap, frameGap);

        if (frameGap > 50) {
            framesOver50Ms++;
        }

        if (frameGap > 100) {
            framesOver100Ms++;
        }

        frameId = requestAnimationFrame(measureFrame);
    };

    frameId = requestAnimationFrame(measureFrame);

    return {
        stop(): FrameStats {
            cancelAnimationFrame(frameId);

            const endTime = performance.now();
            const elapsedMs = endTime - startMs;
            
            const unaccountedFrameTime = elapsedMs - totalFrameGap;
            const unaccountedCallbackTime = elapsedMs - totalCallbackGap;

            return {
                elapsedMs,
                unaccountedFrameTime,
                unaccountedCallbackTime,
                frameCount,
                maxFrameGapMs: maxFrameGap,
                averageFrameGapMs:
                    frameCount === 0 ? 0 : totalFrameGap / frameCount,
                p50FrameGapMs: percentile(frameGaps, 0.50),
                p95FrameGapMs: percentile(frameGaps, 0.95),
                p99FrameGapMs: percentile(frameGaps, 0.99),
                framesOver50Ms,
                framesOver100Ms,              
                maxCallbackGapMs:
                    callbackGaps.length === 0
                        ? 0
                        : Math.max(...callbackGaps),
                averageCallbackGapMs:
                    frameCount === 0
                        ? 0
                        : totalCallbackGap / frameCount,
                p50CallbackGapMs: percentile(callbackGaps, 0.50),
                p95CallbackGapMs: percentile(callbackGaps, 0.95),
                p99CallbackGapMs: percentile(callbackGaps, 0.99),
                callbacksOver50Ms:
                    callbackGaps.filter(gap => gap > 50).length,

                callbacksOver100Ms:
                    callbackGaps.filter(gap => gap > 100).length,
            };
        },
    };
}

export function waitForAnimationFrame(): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => resolve());
    });
}