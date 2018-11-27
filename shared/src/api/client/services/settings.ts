import { BehaviorSubject, Subscribable } from 'rxjs'
import { PlatformContext } from '../../../platform/context'
import { isSettingsValid, Settings, SettingsCascadeOrError } from '../../../settings/settings'

/**
 * A key path that refers to a location in a JSON document.
 *
 * Each successive array element specifies an index in an object or array to descend into. For example, in the
 * object `{"a": ["x", "y"]}`, the key path `["a", 1]` refers to the value `"y"`.
 */
export type KeyPath = (string | number)[]

export interface SettingsUpdate {
    /** The key path to the value. */
    path: KeyPath

    /** The new value to insert at the key path. */
    value: any
}

/**
 * The settings service manages the settings cascade for the viewer.
 *
 * @template S The settings type.
 */
export interface SettingsService<S extends Settings = Settings> {
    /**
     * The settings cascade.
     */
    data: Subscribable<SettingsCascadeOrError<S>>

    /**
     * Update the settings for the settings subject with the highest precedence.
     *
     * @todo Support specifying which settings subject whose settings to update.
     */
    update(edit: SettingsUpdate): Promise<void>

    /**
     * Refresh the settings cascade.
     *
     * This should be called when the settings change by any means other than a call to
     * {@link SettingsService#update}.
     */
    refresh(): Promise<void>
}

/**
 * Create a {@link SettingsService} instance.
 *
 * @template S The settings type.
 */
export function createSettingsService<S extends Settings = Settings>({
    querySettings,
    updateSettings,
}: Pick<PlatformContext, 'querySettings' | 'updateSettings'>): SettingsService<S> {
    // TODO!(sqs): weird behavior if this is null when it's attempted to be used?
    const data = new BehaviorSubject<SettingsCascadeOrError<S>>({ subjects: null, final: null })
    return {
        data,
        update: async edit => {
            const settings = data.value
            if (!isSettingsValid(settings)) {
                throw new Error('invalid settings')
            }
            const subject = settings.subjects[settings.subjects.length - 1]
            await updateSettings(subject.subject.id, { edit })
            data.next(await querySettings<S>())
        },
        refresh: async () => data.next(await querySettings<S>()),
    }
}
