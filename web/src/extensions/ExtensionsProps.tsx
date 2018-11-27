import { TextDocumentItem } from '../../../shared/src/api/client/types/textDocument'
import { WorkspaceRoot } from '../../../shared/src/api/protocol/plainTypes'

/** React props for components that participate in the Sourcegraph extensions model. */
export interface ExtensionsDocumentsProps {
    /**
     * Called when the Sourcegraph extensions model's workspace roots change.
     */
    extensionsOnRootsChange: (roots: WorkspaceRoot[] | null) => void

    /**
     * Called when the Sourcegraph extensions model's set of visible text documents changes.
     */
    extensionsOnVisibleTextDocumentsChange: (visibleTextDocuments: TextDocumentItem[] | null) => void
}
