export type Embedding = number[];

export type IndexedNote = {
	id: string;
	embedding: number[];
	contentHash: string,
	updatedAt: string,
};

export type RelatedNote = {
	id: string;
	score: number;
};


export type GetIndex = () => Promise<IndexedNote[]>;
export type ComputeEmbedding = (text: string) => Promise<number[] | null>;
export type GetNoteText = (noteId: string) => Promise<string | null>;
export type SaveIndex = (index: IndexedNote[]) => Promise<void>;
export type ListNoteIds = () => string[];


export interface IframeMessage {
	requestId: number;
	payload: string;
}
