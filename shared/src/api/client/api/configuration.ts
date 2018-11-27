import { Observable, Subscription } from 'rxjs'
import { switchMap } from 'rxjs/operators'
import { isSettingsValid, SettingsCascadeOrError } from '../../../settings/settings'
import { createProxyAndHandleRequests } from '../../common/proxy'
import { ExtConfigurationAPI } from '../../extension/api/configuration'
import { SettingsEdit } from '../../protocol/configuration'
import { Connection } from '../../protocol/jsonrpc2/connection'

/** @internal */
// TODO!3(sqs): rename to settings
export interface ClientConfigurationAPI {
    $acceptConfigurationUpdate(params: SettingsEdit): Promise<void>
}

/**
 * @internal
 * @template C - The configuration schema.
 */
export class ClientConfiguration<C> implements ClientConfigurationAPI {
    private subscriptions = new Subscription()
    private proxy: ExtConfigurationAPI<C>

    constructor(
        connection: Connection,
        environmentConfiguration: Observable<SettingsCascadeOrError<C>>,
        private updateConfiguration: (params: SettingsEdit) => Promise<void>
    ) {
        this.proxy = createProxyAndHandleRequests('configuration', connection, this)

        this.subscriptions.add(
            environmentConfiguration
                .pipe(
                    switchMap(settings => {
                        // Only send valid settings.
                        //
                        // TODO(sqs): This could cause problems where the settings seen by extensions will lag behind
                        // settings seen by the client.
                        if (isSettingsValid(settings)) {
                            return this.proxy.$acceptConfigurationData(settings)
                        }
                        return []
                    })
                )
                .subscribe()
        )
    }

    public async $acceptConfigurationUpdate(params: SettingsEdit): Promise<void> {
        await this.updateConfiguration(params)
    }

    public unsubscribe(): void {
        this.subscriptions.unsubscribe()
    }
}
