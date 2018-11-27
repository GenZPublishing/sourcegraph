import { BehaviorSubject, NextObserver, Subscribable } from 'rxjs'
import { Context } from './context'

/**
 * The context service owns the context data for the context, which consists of arbitrary key-value pairs that
 * describe application state.
 */
export interface ContextService {
    /**
     * The context data.
     */
    readonly context: Subscribable<Context> & { value: Context } & NextObserver<Context>
}

/** Create a {@link ContextService} instance. */
export function createContextService(): ContextService {
    return {
        context: new BehaviorSubject<Context>({}),
    }
}