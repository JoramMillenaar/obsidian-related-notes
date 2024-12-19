// Based on the original code from vectra (https://github.com/Stevenic/vectra).

export interface IndexData {
    version: number;
    metadata_config: {
        indexed?: string[];
    };
    items: IndexItem[];
}

export interface IndexStats {
    version: number;
    metadata_config: {
        indexed?: string[];
    };
    items: number;
}

export interface IndexItem<TMetadata = Record<string, MetadataTypes>> {
    id: string;
    metadata: TMetadata;
    vector: number[];
    norm: number;
    metadataFile?: string;
}

export interface IframeMessage {
    requestId: number;
    payload: string;
}

export type IframeResponse = {
    data: Float32Array,
    dims: number[],
    type: string,
}

export interface MetadataFilter {

    /**
     * Equal to (number, string, boolean)
     */
    '$eq'?: number | string | boolean;

    /**
     * Not equal to (number, string, boolean)
     */
    '$ne'?: number | string | boolean;

    /**
     * Greater than (number)
     */
    '$gt'?: number;

    /**
     * Greater than or equal to (number)
     */
    '$gte'?: number;

    /**
     * Less than (number)
     */
    '$lt'?: number;

    /**
     * Less than or equal to (number)
     */
    '$lte'?: number;

    /**
     * In array (string or number)
     */
    '$in'?: (number | string)[];

    /**
     * Not in array (string or number)
     */
    '$nin'?: (number | string)[];

    /**
     * AND (MetadataFilter[])
     */
    '$and'?: MetadataFilter[];

    /**
     * OR (MetadataFilter[])
     */
    '$or'?: MetadataFilter[];

    [key: string]: unknown;
}

export type MetadataTypes = number | string | boolean;
