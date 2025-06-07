export declare class MigrationManager {
    private static instance;
    private chatDb;
    private memoryDb;
    private isInitialized;
    private constructor();
    static getInstance(): MigrationManager;
    initialize(): Promise<void>;
    private runMigrations;
    private getAppliedMigrations;
    rollback(version: number): Promise<void>;
    cleanup(): Promise<void>;
}
