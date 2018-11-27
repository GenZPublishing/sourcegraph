import * as assert from 'assert'
import { of } from 'rxjs'
import { map } from 'rxjs/operators'
import { SettingsUpdate } from '../client/services/settings'
import { assertToJSON } from '../extension/types/common.test'
import { collectSubscribableValues, integrationTestContext } from './helpers.test'

describe('Configuration (integration)', () => {
    it('is synchronously available', async () => {
        const { extensionHost } = await integrationTestContext({ settings: of({ final: {}, subjects: [] }) })
        assert.doesNotThrow(() => extensionHost.configuration.subscribe(() => void 0))
        assert.doesNotThrow(() => extensionHost.configuration.get())
    })

    describe('Configuration#get', () => {
        it('gets configuration', async () => {
            const { extensionHost } = await integrationTestContext()
            assertToJSON(extensionHost.configuration.get(), { a: 1 })
            assert.deepStrictEqual(extensionHost.configuration.get().value, { a: 1 })
        })
    })

    describe('Configuration#update', () => {
        it('updates configuration', async () => {
            const calls: SettingsUpdate[] = []
            const { extensionHost } = await integrationTestContext({
                updateSettings: (_subject, args) => calls.push(args),
            })

            await extensionHost.configuration.get().update('a', 2)
            await extensionHost.internal.sync()
            assert.deepStrictEqual(calls, [{ path: ['a'], value: 2 }] as SettingsUpdate[])
            calls.length = 0 // clear

            await extensionHost.configuration.get().update('a', 3)
            await extensionHost.internal.sync()
            assert.deepStrictEqual(calls, [{ path: ['a'], value: 3 }] as SettingsUpdate[])
        })
    })

    describe('configuration.subscribe', () => {
        it('subscribes to changes', async () => {
            const { environment, extensionHost } = await integrationTestContext()

            let calls = 0
            extensionHost.configuration.subscribe(() => calls++)
            assert.strictEqual(calls, 1) // called initially

            environment.next({
                ...environment.value,
                configuration: { final: { a: 3 }, subjects: [] },
            })
            await extensionHost.internal.sync()
            assert.strictEqual(calls, 2)
        })
    })
})
