import { formatWikilink } from "../domain/wikilink";
import { ActiveEditor } from "../types";

export type InsertWikilinkAtCursorResult = "inserted" | "no-editor";

export type InsertWikilinkAtCursorUseCase = (noteId: string) => Promise<InsertWikilinkAtCursorResult>;

export function makeInsertWikilinkAtCursor(deps: {
  activeEditor: ActiveEditor;
}): InsertWikilinkAtCursorUseCase {
  return async function insertWikilinkAtCursor(noteId: string): Promise<InsertWikilinkAtCursorResult> {
    const inserted = await deps.activeEditor.insertTextAtCursor(formatWikilink(noteId));
    return inserted ? "inserted" : "no-editor";
  };
}
