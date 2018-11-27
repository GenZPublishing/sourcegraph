import { BehaviorSubject, NEVER } from 'rxjs'
import { EMPTY_MODEL } from './model'
import { Services } from './services'

describe('Services', () => {
    it('initializes empty services', () => {
        // tslint:disable-next-line:no-unused-expression
        new Services({
            model: new BehaviorSubject(EMPTY_MODEL),
            settings: NEVER,
            updateSettings: () => Promise.reject(new Error('not implemented')),
            queryGraphQL: () => NEVER,
        })
    })
})
