import { BehaviorSubject, NEVER } from 'rxjs'
import { EMPTY_ENVIRONMENT } from './environment'
import { Services } from './services'

describe('Services', () => {
    it('initializes empty services', () => {
        // tslint:disable-next-line:no-unused-expression
        new Services({
            environment: new BehaviorSubject(EMPTY_ENVIRONMENT),
            settings: NEVER,
            updateSettings: () => Promise.reject(new Error('not implemented')),
            queryGraphQL: () => NEVER,
        })
    })
})
