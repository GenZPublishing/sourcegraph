import { BehaviorSubject, Observable } from 'rxjs'
import { map, startWith, switchMap } from 'rxjs/operators'
import ExtensionHostWorker from 'worker-loader!../../../shared/src/api/extension/main.worker.ts'
import { EMPTY_ENVIRONMENT, Environment } from '../../../shared/src/api/client/environment'
import { createWebWorkerMessageTransports } from '../../../shared/src/api/protocol/jsonrpc2/transports/webWorker'
import { gql } from '../../../shared/src/graphql/graphql'
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
    // TODO!(sqs): clean up, remove redundant settingsCascade and environment
    const environment = new BehaviorSubject<Environment>(EMPTY_ENVIRONMENT)
    settingsRefreshes
        .pipe(
            startWith(null),
            switchMap(() => fetchViewerSettings()),
            map(gqlToCascade)
        )
        .subscribe(configuration => environment.next({ ...environment.value, configuration }))

    const context: PlatformContext = {
        environment,
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

            try {
                await updateSettings(context, subject, edit, mutateSettings)
            } finally {
                settingsRefreshes.next()
            }
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
