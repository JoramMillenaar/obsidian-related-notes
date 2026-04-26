import { formatWikilink } from "../domain/wikilink";
import { ActiveEditor, NoteSource } from "../ports";

export type InsertWikilinkAtCursorResult = "inserted" | "no-editor";

export type InsertWikilinkAtCursorUseCase = (noteId: string) => InsertWikilinkAtCursorResult;

export function makeInsertWikilinkAtCursor(deps: {
  activeEditor: ActiveEditor;
  noteSource: NoteSource;
}): InsertWikilinkAtCursorUseCase {
  return function insertWikilinkAtCursor(noteId: string): InsertWikilinkAtCursorResult {
    const inserted = deps.activeEditor.insertTextAtCursor(
      formatWikilink(noteId, deps.noteSource.listIds())
    );
    return inserted ? "inserted" : "no-editor";
  };
}
