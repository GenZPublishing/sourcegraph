import assert from 'assert'
import { TestScheduler } from 'rxjs/testing'
import { ConfiguredExtension } from '../../../extensions/extension'
import { EMPTY_SETTINGS_CASCADE, SettingsCascadeOrError } from '../../../settings/settings'
import { isErrorLike } from '../../../util/errors'
import { Environment } from '../environment'
import { ExecutableExtension, ExtensionsService } from './extensionsService'

const scheduler = () => new TestScheduler((a, b) => assert.deepStrictEqual(a, b))

function noopExtensionActivationFilter(environment: Pick<Environment, 'extensions'>): ConfiguredExtension[] {
    return environment.extensions || []
}

describe('activeExtensions', () => {
    it('emits an empty set', () =>
        scheduler().run(({ cold, expectObservable }) =>
            expectObservable(
                new ExtensionsService(
                    cold<Pick<Environment, 'extensions' | 'visibleTextDocuments'>>('-a-|', {
                        a: { extensions: [], visibleTextDocuments: [] },
                    }),
                    { data: cold<SettingsCascadeOrError>('-a-|', { a: EMPTY_SETTINGS_CASCADE }) },
                    noopExtensionActivationFilter
                ).activeExtensions
            ).toBe('-a-|', {
                a: [],
            })
        ))

    it('previously activated extensions remain activated when their activationEvents no longer match', () =>
        scheduler().run(({ cold, expectObservable }) =>
            expectObservable(
                new ExtensionsService(
                    cold<Pick<Environment, 'extensions' | 'visibleTextDocuments'>>('-a-b-|', {
                        a: {
                            extensions: [{ id: 'x', manifest: { url: 'u', activationEvents: [] }, rawManifest: null }],
                            visibleTextDocuments: [],
                        },
                        b: {
                            extensions: [
                                { id: 'x', manifest: { url: 'u', activationEvents: [] }, rawManifest: null },
                                { id: 'y', manifest: { url: 'u', activationEvents: [] }, rawManifest: null },
                            ],
                            visibleTextDocuments: [],
                        },
                    }),
                    {
                        data: cold<SettingsCascadeOrError>('-a-b-|', {
                            a: { final: { extensions: { x: true } }, subjects: [] },
                            b: { final: { extensions: { y: true } }, subjects: [] },
                        }),
                    },
                    (environment, settings) =>
                        (environment.extensions || []).filter(
                            x =>
                                settings.final &&
                                !isErrorLike(settings.final) &&
                                settings.final.extensions &&
                                settings.final.extensions[x.id]
                        )
                ).activeExtensions
            ).toBe('-a-b-|', {
                a: [{ id: 'x', scriptURL: 'u' }],
                b: [{ id: 'x', scriptURL: 'u' }, { id: 'y', scriptURL: 'u' }],
            } as Record<string, ExecutableExtension[]>)
        ))
})
