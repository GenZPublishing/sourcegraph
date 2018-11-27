import { BehaviorSubject, NEVER, of, throwError } from 'rxjs'
import { switchMap } from 'rxjs/operators'
import * as sourcegraph from 'sourcegraph'
import { PlatformContext } from '../../platform/context'
import { createExtensionHostClient, ExtensionHostClient } from '../client/client'
import { Environment } from '../client/environment'
import { Services } from '../client/services'
import { InitData, startExtensionHost } from '../extension/extensionHost'
import { createConnection } from '../protocol/jsonrpc2/connection'
import { createMessageTransports } from '../protocol/jsonrpc2/helpers.test'

const FIXTURE_ENVIRONMENT: Environment = {
    roots: [{ uri: 'file:///' }],
    visibleTextDocuments: [
        {
            uri: 'file:///f',
            languageId: 'l',
            text: 't',
        },
    ],
}

interface TestContext {
    client: ExtensionHostClient
    extensionHost: typeof sourcegraph
}

interface Mocks extends Pick<PlatformContext, 'settings' | 'updateSettings' | 'queryGraphQL'> {}

const NOOP_MOCKS: Mocks = {
    settings: NEVER,
    updateSettings: () => Promise.reject(new Error('Mocks#updateSettings not implemented')),
    queryGraphQL: () => throwError(new Error('Mocks#queryGraphQL not implemented')),
}

/**
 * Set up a new client-extension integration test.
 *
 * @internal
 */
export async function integrationTestContext(
    partialMocks: Partial<Mocks> = NOOP_MOCKS
): Promise<
    TestContext & {
        environment: BehaviorSubject<Environment>
        services: Services
    }
> {
    const mocks = partialMocks ? { ...NOOP_MOCKS, ...partialMocks } : NOOP_MOCKS

    const [clientTransports, serverTransports] = createMessageTransports()

    const extensionHost = startExtensionHost(serverTransports)

    const environment = new BehaviorSubject<Environment>(FIXTURE_ENVIRONMENT)
    const services = new Services({ ...mocks, environment })
    const client = createExtensionHostClient(
        environment,
        services,
        of(clientTransports).pipe(
            switchMap(async clientTransports => {
                const connection = createConnection(clientTransports)
                connection.listen()

                const initData: InitData = {
                    sourcegraphURL: 'https://example.com',
                    clientApplication: 'sourcegraph',
                }
                await connection.sendRequest('initialize', [initData])
                return connection
            })
        )
    )

    await (await extensionHost.__testAPI).internal.sync()
    return {
        client,
        extensionHost: await extensionHost.__testAPI,
        services,
        environment,
    }
}

/**
 * Returns a {@link Promise} and a function. The {@link Promise} blocks until the returned function is called.
 *
 * @internal
 */
export function createBarrier(): { wait: Promise<void>; done: () => void } {
    let done!: () => void
    const wait = new Promise<void>(resolve => (done = resolve))
    return { wait, done }
}

export function collectSubscribableValues<T>(subscribable: sourcegraph.Subscribable<T>): T[] {
    const values: T[] = []
    subscribable.subscribe(value => values.push(value))
    return values
}
