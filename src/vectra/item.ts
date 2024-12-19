// Based on the original code from vectra (https://github.com/Stevenic/vectra).

import { MetadataFilter, MetadataTypes } from './types';

export class ItemSelector {
    public static cosineSimilarity(vector1: number[], vector2: number[]) {
        return this.dotProduct(vector1, vector2) / (this.normalize(vector1) * this.normalize(vector2));
    }

    public static normalize(vector: number[]) {
        let sum = 0;
        for (let i = 0; i < vector.length; i++) {
            sum += vector[i] * vector[i];
        }
        return Math.sqrt(sum);
    }

    public static normalizedCosineSimilarity(vector1: number[], norm1: number, vector2: number[], norm2: number) {
        return this.dotProduct(vector1, vector2) / (norm1 * norm2);
    }

    public static select(metadata: Record<string, MetadataTypes>, filter: MetadataFilter): boolean {
        if (filter === undefined || filter === null) {
            return true;
        }

        for (const key in filter) {
            switch (key) {
                case '$and':
                    if (!filter[key]!.every((f: MetadataFilter) => this.select(metadata, f))) {
                        return false;
                    }
                    break;
                case '$or':
                    if (!filter[key]!.some((f: MetadataFilter) => this.select(metadata, f))) {
                        return false;
                    }
                    break;
                default: {
                    const value = filter[key];
                    if (value === undefined || value === null) {
                        return false;
                    } else if (typeof value == 'object') {
                        if (!this.metadataFilter(metadata[key], value as MetadataFilter)) {
                            return false;
                        }
                    } else {
                        if (metadata[key] !== value) {
                            return false;
                        }
                    }
                    break;
                }
            }
        }
        return true;
    }

    private static dotProduct(arr1: number[], arr2: number[]) {
        let sum = 0;
        for (let i = 0; i < arr1.length; i++) {
            sum += arr1[i] * arr2[i];
        }
        return sum;
    }

    private static metadataFilter(value: MetadataTypes, filter: MetadataFilter): boolean {
        if (value === undefined || value === null) {
            return false;
        }

        for (const key in filter) {
            switch (key) {
                case '$eq':
                    if (value !== filter[key]) {
                        return false;
                    }
                    break;
                case '$ne':
                    if (value === filter[key]) {
                        return false;
                    }
                    break;
                case '$gt':
                    if (typeof value != 'number' || value <= filter[key]!) {
                        return false;
                    }
                    break;
                case '$gte':
                    if (typeof value != 'number' || value < filter[key]!) {
                        return false;
                    }
                    break;
                case '$lt':
                    if (typeof value != 'number' || value >= filter[key]!) {
                        return false;
                    }
                    break;
                case '$lte':
                    if (typeof value != 'number' || value > filter[key]!) {
                        return false;
                    }
                    break;
                case '$in':
                    if (typeof value == 'boolean') {
                        return false;
                    } else if (typeof value == 'string' && !filter[key]!.includes(value)) {
                        return false
                    } else if (!filter[key]!.some(val => typeof val == 'string' && val.includes(value as string))) {
                        return false
                    }
                    break;
                case '$nin':
                    if (typeof value == 'boolean' || filter[key]!.includes(value)) {
                        return false;
                    }
                    break;
                default:
                    return value === filter[key];
            }
        }
        return true;
    }
}

