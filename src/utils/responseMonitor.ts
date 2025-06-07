import { logger } from './logger';

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

export class ResponseMonitor {
  private static instance: ResponseMonitor;
  private thresholds: ResponseThresholds;

  private constructor() {
    this.thresholds = {
      maxTokenCount: 4096,
      minConfidence: 0.7,
      minCoherence: 0.6,
      minContextMatch: 0.5,
      maxResponseTime: 30000 // 30 seconds
    };
  }

  public static getInstance(): ResponseMonitor {
    if (!ResponseMonitor.instance) {
      ResponseMonitor.instance = new ResponseMonitor();
    }
    return ResponseMonitor.instance;
  }

  public async analyzeResponse(
    response: string,
    context: string,
    startTime: number,
    tokenCount: number
  ): Promise<ResponseMetrics> {
    const responseTime = Date.now() - startTime;
    const isTruncated = this.detectTruncation(response);
    const confidence = this.calculateConfidence(response);
    const coherence = this.calculateCoherence(response);
    const contextMatch = this.calculateContextMatch(response, context);
    const hallucinations = this.detectHallucinations(response, context);

    const metrics: ResponseMetrics = {
      tokenCount,
      responseTime,
      confidence,
      coherence,
      contextMatch,
      isTruncated,
      potentialHallucinations: hallucinations
    };

    this.checkThresholds(metrics);
    return metrics;
  }

  private detectTruncation(response: string): boolean {
    // Check for common truncation indicators
    const truncationIndicators = [
      /\.\.\.$/,
      /…$/,
      /\[truncated\]/i,
      /\[cut off\]/i,
      /\[incomplete\]/i
    ];

    return truncationIndicators.some(pattern => pattern.test(response));
  }

  private calculateConfidence(response: string): number {
    // Simple confidence calculation based on response characteristics
    let confidence = 1.0;

    // Reduce confidence for short responses
    if (response.length < 50) {
      confidence *= 0.8;
    }

    // Reduce confidence for responses with many uncertain phrases
    const uncertainPhrases = [
      /i think/i,
      /maybe/i,
      /perhaps/i,
      /possibly/i,
      /not sure/i,
      /i'm not certain/i
    ];

    const uncertainCount = uncertainPhrases.filter(phrase => phrase.test(response)).length;
    confidence *= Math.max(0.5, 1 - (uncertainCount * 0.1));

    return confidence;
  }

  private calculateCoherence(response: string): number {
    // Simple coherence calculation based on sentence structure
    const sentences = response.split(/[.!?]+/).filter(Boolean);
    if (sentences.length === 0) return 0;

    let coherence = 1.0;

    // Check for sentence length consistency
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    const lengthVariation = sentences.reduce((sum, s) => sum + Math.abs(s.length - avgLength), 0) / sentences.length;
    coherence *= Math.max(0.5, 1 - (lengthVariation / avgLength));

    // Check for transition words
    const transitionWords = [
      'however', 'therefore', 'furthermore', 'moreover',
      'consequently', 'thus', 'hence', 'accordingly'
    ];
    const hasTransitions = transitionWords.some(word => response.toLowerCase().includes(word));
    if (hasTransitions) coherence *= 1.1;

    return Math.min(1, coherence);
  }

  private calculateContextMatch(response: string, context: string): number {
    // Calculate how well the response matches the context
    const contextWords = new Set(context.toLowerCase().split(/\W+/));
    const responseWords = response.toLowerCase().split(/\W+/);
    
    const matchingWords = responseWords.filter(word => contextWords.has(word));
    return matchingWords.length / responseWords.length;
  }

  private detectHallucinations(response: string, context: string): string[] {
    const hallucinations: string[] = [];
    const contextWords = new Set(context.toLowerCase().split(/\W+/));
    
    // Split response into sentences
    const sentences = response.split(/[.!?]+/).filter(Boolean);
    
    sentences.forEach(sentence => {
      const words = sentence.toLowerCase().split(/\W+/);
      const contextMatchCount = words.filter(word => contextWords.has(word)).length;
      
      // If a sentence has very few context words, it might be a hallucination
      if (words.length > 5 && contextMatchCount / words.length < 0.2) {
        hallucinations.push(sentence.trim());
      }
    });
    
    return hallucinations;
  }

  private checkThresholds(metrics: ResponseMetrics): void {
    if (metrics.tokenCount > this.thresholds.maxTokenCount) {
      logger.warn(`Response exceeds maximum token count: ${metrics.tokenCount}`);
    }
    
    if (metrics.confidence < this.thresholds.minConfidence) {
      logger.warn(`Response confidence below threshold: ${metrics.confidence}`);
    }
    
    if (metrics.coherence < this.thresholds.minCoherence) {
      logger.warn(`Response coherence below threshold: ${metrics.coherence}`);
    }
    
    if (metrics.contextMatch < this.thresholds.minContextMatch) {
      logger.warn(`Response context match below threshold: ${metrics.contextMatch}`);
    }
    
    if (metrics.responseTime > this.thresholds.maxResponseTime) {
      logger.warn(`Response time exceeds threshold: ${metrics.responseTime}ms`);
    }
  }
} 