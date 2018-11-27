import assert from 'assert'
import { EMPTY_SETTINGS_CASCADE, SettingsCascadeOrError } from '../../../settings/settings'
import { EMPTY_ENVIRONMENT, Environment } from '../environment'
import { applyContextUpdate, Context, getComputedContextProperty } from './context'

describe('applyContextUpdate', () => {
    it('merges properties', () =>
        assert.deepStrictEqual(applyContextUpdate({ a: 1, b: null, c: 2, d: 3, e: null }, { a: null, b: 1, c: 3 }), {
            b: 1,
            c: 3,
            d: 3,
            e: null,
        } as Context))
})

describe('getComputedContextProperty', () => {
    it('provides config', () => {
        const settings: SettingsCascadeOrError = {
            final: {
                a: 1,
                'a.b': 2,
                'c.d': 3,
            },
            subjects: [],
        }
        assert.strictEqual(getComputedContextProperty(EMPTY_ENVIRONMENT, settings, {}, 'config.a'), 1)
        assert.strictEqual(getComputedContextProperty(EMPTY_ENVIRONMENT, settings, {}, 'config.a.b'), 2)
        assert.strictEqual(getComputedContextProperty(EMPTY_ENVIRONMENT, settings, {}, 'config.c.d'), 3)
        assert.strictEqual(getComputedContextProperty(EMPTY_ENVIRONMENT, settings, {}, 'config.x'), null)
    })

    describe('environment with component', () => {
        const env: Environment = {
            ...EMPTY_ENVIRONMENT,
            visibleTextDocuments: [
                {
                    uri: 'file:///a/b.c',
                    languageId: 'l',
                    text: 't',
                },
            ],
        }

        describe('resource', () => {
            it('provides resource.uri', () =>
                assert.strictEqual(
                    getComputedContextProperty(env, EMPTY_SETTINGS_CASCADE, {}, 'resource.uri'),
                    'file:///a/b.c'
                ))
            it('provides resource.basename', () =>
                assert.strictEqual(
                    getComputedContextProperty(env, EMPTY_SETTINGS_CASCADE, {}, 'resource.basename'),
                    'b.c'
                ))
            it('provides resource.dirname', () =>
                assert.strictEqual(
                    getComputedContextProperty(env, EMPTY_SETTINGS_CASCADE, {}, 'resource.dirname'),
                    'file:///a'
                ))
            it('provides resource.extname', () =>
                assert.strictEqual(
                    getComputedContextProperty(env, EMPTY_SETTINGS_CASCADE, {}, 'resource.extname'),
                    '.c'
                ))
            it('provides resource.language', () =>
                assert.strictEqual(
                    getComputedContextProperty(env, EMPTY_SETTINGS_CASCADE, {}, 'resource.language'),
                    'l'
                ))
            it('provides resource.textContent', () =>
                assert.strictEqual(
                    getComputedContextProperty(env, EMPTY_SETTINGS_CASCADE, {}, 'resource.textContent'),
                    't'
                ))
            it('provides resource.type', () =>
                assert.strictEqual(
                    getComputedContextProperty(env, EMPTY_SETTINGS_CASCADE, {}, 'resource.type'),
                    'textDocument'
                ))

            it('returns undefined when the environment has no component', () =>
                assert.strictEqual(
                    getComputedContextProperty(EMPTY_ENVIRONMENT, EMPTY_SETTINGS_CASCADE, {}, 'resource.uri'),
                    undefined
                ))
        })

        describe('component', () => {
            it('provides component.type', () =>
                assert.strictEqual(
                    getComputedContextProperty(env, EMPTY_SETTINGS_CASCADE, {}, 'component.type'),
                    'textEditor'
                ))

            it('returns undefined when the environment has no component', () =>
                assert.strictEqual(
                    getComputedContextProperty(EMPTY_ENVIRONMENT, EMPTY_SETTINGS_CASCADE, {}, 'component.type'),
                    undefined
                ))
        })
    })

    it('falls back to the environment context', () => {
        assert.strictEqual(getComputedContextProperty(EMPTY_ENVIRONMENT, EMPTY_SETTINGS_CASCADE, { x: 1 }, 'x'), 1)
        assert.strictEqual(getComputedContextProperty(EMPTY_ENVIRONMENT, EMPTY_SETTINGS_CASCADE, {}, 'y'), undefined)
    })
})
