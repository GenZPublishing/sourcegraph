import { BehaviorSubject, merge, Observable, ReplaySubject } from 'rxjs'
import { map, startWith, switchMap } from 'rxjs/operators'
import ExtensionHostWorker from 'worker-loader!../../../shared/src/api/extension/main.worker.ts'
import { EMPTY_MODEL, Model } from '../../../shared/src/api/client/model'
import { createWebWorkerMessageTransports } from '../../../shared/src/api/protocol/jsonrpc2/transports/webWorker'
import { gql } from '../../../shared/src/graphql/graphql'
import * as GQL from '../../../shared/src/graphql/schema'
import { PlatformContext } from '../../../shared/src/platform/context'
import { mutateSettings, updateSettings } from '../../../shared/src/settings/edit'
import { gqlToCascade } from '../../../shared/src/settings/settings'
import { requestGraphQL } from '../backend/graphql'
import { sendLSPHTTPRequests } from '../backend/lsp'
import { Tooltip } from '../components/tooltip/Tooltip'
import { fetchViewerSettings, settingsRefreshes } from '../user/settings/backend'
import { LocalStorageSubject } from '../util/LocalStorageSubject'

/**
 * Creates the {@link PlatformContext} for the web app.
 */
export function createPlatformContext(): PlatformContext {
    const updatedSettings = new ReplaySubject<GQL.ISettingsCascade>(1)
    const context: PlatformContext = {
        model: new BehaviorSubject<Model>(EMPTY_MODEL),
        settings: merge(
            settingsRefreshes.pipe(
                startWith(void 0),
                switchMap(() => fetchViewerSettings())
            ),
            updatedSettings
        ).pipe(map(gqlToCascade)),
        updateSettings: async (subject, edit) => {
            // Unauthenticated users can't update settings. (In the browser extension, they can update client
            // settings even when not authenticated. The difference in behavior in the web app vs. browser
            // extension is why this logic lives here and not in shared/.)
            if (!window.context.isAuthenticatedUser) {
                const editDescription = `update user setting` + '`' + edit.path.join('.') + '`'
                const u = new URL(window.context.externalURL)
                throw new Error(
                    `Unable to ${editDescription} because you are not signed in.` +
                        '\n\n' +
                        `[**Sign into Sourcegraph${
                            u.hostname === 'sourcegraph.com' ? '' : ` on ${u.host}`
                        }**](${`${u.href.replace(/\/$/, '')}/sign-in`})`
                )
            }

            await updateSettings(context, subject, edit, mutateSettings)
            updatedSettings.next(await fetchViewerSettings().toPromise())
        },
        queryGraphQL: (request, variables) =>
            requestGraphQL(
                gql`
                    ${request}
                `,
                variables
            ),
        queryLSP: requests => sendLSPHTTPRequests(requests),
        forceUpdateTooltip: () => Tooltip.forceUpdate(),
        createExtensionHost: () => {
            const worker = new ExtensionHostWorker()
            const messageTransports = createWebWorkerMessageTransports(worker)
            return new Observable(sub => {
                sub.next(messageTransports)
                return () => worker.terminate()
            })
        },
        getScriptURLForExtension: bundleURL => bundleURL,
        sourcegraphURL: window.context.externalURL,
        clientApplication: 'sourcegraph',
        traceExtensionHostCommunication: new LocalStorageSubject<boolean>('traceExtensionHostCommunication', false),
    }
    return context
}
