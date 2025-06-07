export interface Document {
    id: string;
    content: string;
    metadata: {
        [key: string]: any;
    };
}
