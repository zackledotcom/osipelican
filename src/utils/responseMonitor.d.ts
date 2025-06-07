export interface ResponseMetrics {
    tokenCount: number;
    responseTime: number;
    confidence: number;
    coherence: number;
    contextMatch: number;
    isTruncated: boolean;
    potentialHallucinations: string[];
}
export interface ResponseThresholds {
    maxTokenCount: number;
    minConfidence: number;
    minCoherence: number;
    minContextMatch: number;
    maxResponseTime: number;
}
export declare class ResponseMonitor {
    private static instance;
    private thresholds;
    private constructor();
    static getInstance(): ResponseMonitor;
    analyzeResponse(response: string, context: string, startTime: number, tokenCount: number): Promise<ResponseMetrics>;
    private detectTruncation;
    private calculateConfidence;
    private calculateCoherence;
    private calculateContextMatch;
    private detectHallucinations;
    private checkThresholds;
}
