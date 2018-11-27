import { combineLatest, from, Observable, Subscribable } from 'rxjs'
import { distinctUntilChanged, map, tap } from 'rxjs/operators'
import {
    ConfiguredExtension,
    getScriptURLFromExtensionManifest,
    isExtensionEnabled,
} from '../../../extensions/extension'
import { SettingsCascadeOrError } from '../../../settings/settings'
import { isErrorLike } from '../../../util/errors'
import { isEqual } from '../../util'
import { Environment } from '../environment'
import { SettingsService } from './settings'

/**
 * The information about an extension necessary to execute and activate it.
 */
export interface ExecutableExtension extends Pick<ConfiguredExtension, 'id'> {
    /** The URL to the JavaScript bundle of the extension. */
    scriptURL: string
}

/**
 * Manages the set of extensions that are available and activated.
 *
 * @internal This is an internal implementation detail and is different from the product feature called the
 * "extension registry" (where users can search for and enable extensions).
 */
export class ExtensionsService {
    public constructor(
        private environment: Subscribable<Pick<Environment, 'extensions' | 'visibleTextDocuments'>>,
        private settingsService: Pick<SettingsService, 'data'>,
        private extensionActivationFilter = extensionsWithMatchedActivationEvent
    ) {}

    /**
     * Returns an observable that emits the set of extensions that should be active, based on the previous and
     * current state and each available extension's activationEvents.
     *
     * An extension is activated when one or more of its activationEvents is true. After an extension has been
     * activated, it remains active for the rest of the session (i.e., for as long as the browser tab remains
     * open).
     *
     * @todo Consider whether extensions should be deactivated if none of their activationEvents are true (or that
     * plus a certain period of inactivity).
     *
     * @param extensionActivationFilter A function that returns the set of extensions that should be activated
     * based on the current environment only. It does not need to account for remembering which extensions were
     * previously activated in prior states.
     */
    public get activeExtensions(): Observable<ExecutableExtension[]> {
        const activeExtensionIDs: string[] = []
        return combineLatest(from(this.environment), from(this.settingsService.data)).pipe(
            tap(([environment, settings]) => {
                const activeExtensions = this.extensionActivationFilter(environment, settings)
                for (const x of activeExtensions) {
                    if (!activeExtensionIDs.includes(x.id)) {
                        activeExtensionIDs.push(x.id)
                    }
                }
            }),
            map(([{ extensions }]) => (extensions ? extensions.filter(x => activeExtensionIDs.includes(x.id)) : [])),
            distinctUntilChanged((a, b) => isEqual(a, b)),
            // TODO!2(sqs): memoize getScriptURLForExtension
            /** Run {@link ControllerHelpers.getScriptURLForExtension} last because it is nondeterministic. */
            map(extensions =>
                extensions.map(x => ({
                    id: x.id,
                    // TODO!2(sqs): log errors but do not throw here
                    //
                    // TODO!2(sqs): also apply
                    // PlatformContext.getScriptURLForExtension here for browser ext
                    scriptURL: getScriptURLFromExtensionManifest(x),
                }))
            )
        )
    }
}

function extensionsWithMatchedActivationEvent(
    environment: Pick<Environment, 'extensions' | 'visibleTextDocuments'>,
    settings: SettingsCascadeOrError
): ConfiguredExtension[] {
    if (!environment.extensions) {
        return []
    }
    return environment.extensions.filter(x => {
        try {
            if (!isExtensionEnabled(settings.final, x.id)) {
                return false
            } else if (!x.manifest) {
                console.warn(`Extension ${x.id} was not found. Remove it from settings to suppress this warning.`)
                return false
            } else if (isErrorLike(x.manifest)) {
                console.warn(x.manifest)
                return false
            } else if (!x.manifest.activationEvents) {
                console.warn(`Extension ${x.id} has no activation events, so it will never be activated.`)
                return false
            }
            const visibleTextDocumentLanguages = environment.visibleTextDocuments
                ? environment.visibleTextDocuments.map(({ languageId }) => languageId)
                : []
            return x.manifest.activationEvents.some(
                e => e === '*' || visibleTextDocumentLanguages.some(l => e === `onLanguage:${l}`)
            )
        } catch (err) {
            console.error(err)
        }
        return false
    })
}
