"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseMonitor = void 0;
const logger_1 = require("./logger");
class ResponseMonitor {
    constructor() {
        this.thresholds = {
            maxTokenCount: 4096,
            minConfidence: 0.7,
            minCoherence: 0.6,
            minContextMatch: 0.5,
            maxResponseTime: 30000 // 30 seconds
        };
    }
    static getInstance() {
        if (!ResponseMonitor.instance) {
            ResponseMonitor.instance = new ResponseMonitor();
        }
        return ResponseMonitor.instance;
    }
    async analyzeResponse(response, context, startTime, tokenCount) {
        const responseTime = Date.now() - startTime;
        const isTruncated = this.detectTruncation(response);
        const confidence = this.calculateConfidence(response);
        const coherence = this.calculateCoherence(response);
        const contextMatch = this.calculateContextMatch(response, context);
        const hallucinations = this.detectHallucinations(response, context);
        const metrics = {
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
    detectTruncation(response) {
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
    calculateConfidence(response) {
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
    calculateCoherence(response) {
        // Simple coherence calculation based on sentence structure
        const sentences = response.split(/[.!?]+/).filter(Boolean);
        if (sentences.length === 0)
            return 0;
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
        if (hasTransitions)
            coherence *= 1.1;
        return Math.min(1, coherence);
    }
    calculateContextMatch(response, context) {
        // Calculate how well the response matches the context
        const contextWords = new Set(context.toLowerCase().split(/\W+/));
        const responseWords = response.toLowerCase().split(/\W+/);
        const matchingWords = responseWords.filter(word => contextWords.has(word));
        return matchingWords.length / responseWords.length;
    }
    detectHallucinations(response, context) {
        const hallucinations = [];
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
    checkThresholds(metrics) {
        if (metrics.tokenCount > this.thresholds.maxTokenCount) {
            logger_1.logger.warn(`Response exceeds maximum token count: ${metrics.tokenCount}`);
        }
        if (metrics.confidence < this.thresholds.minConfidence) {
            logger_1.logger.warn(`Response confidence below threshold: ${metrics.confidence}`);
        }
        if (metrics.coherence < this.thresholds.minCoherence) {
            logger_1.logger.warn(`Response coherence below threshold: ${metrics.coherence}`);
        }
        if (metrics.contextMatch < this.thresholds.minContextMatch) {
            logger_1.logger.warn(`Response context match below threshold: ${metrics.contextMatch}`);
        }
        if (metrics.responseTime > this.thresholds.maxResponseTime) {
            logger_1.logger.warn(`Response time exceeds threshold: ${metrics.responseTime}ms`);
        }
    }
}
exports.ResponseMonitor = ResponseMonitor;
//# sourceMappingURL=responseMonitor.js.map