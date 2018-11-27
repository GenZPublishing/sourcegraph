import { ConfiguredExtension } from '../../extensions/extension'
import { WorkspaceRoot } from '../protocol/plainTypes'
import { TextDocumentItem } from './types/textDocument'

/**
 * A description of the environment represented by the Sourcegraph extension client application.
 *
 * This models the state of editor-like tools that display documents, allow selections and scrolling
 * in documents, and support extension configuration.
 *
 * @template X the extension type, to support storing additional properties on extensions (e.g., using {@link ConfiguredRegistryExtension})
 */
export interface Environment<X extends ConfiguredExtension = ConfiguredExtension> {
    /**
     * The currently open workspace roots (typically a single repository).
     */
    readonly roots: WorkspaceRoot[] | null

    /**
     * The text documents that are currently visible. Each text document is represented to extensions as being
     * in its own visible CodeEditor.
     */
    readonly visibleTextDocuments: TextDocumentItem[] | null

    /** The enabled extensions, or null if there are none. */
    readonly extensions: X[] | null
}

/** An empty Sourcegraph extension client environment. */
export const EMPTY_ENVIRONMENT: Environment<any> = {
    roots: null,
    visibleTextDocuments: null,
    extensions: null,
}
