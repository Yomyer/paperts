import Foo from './Foo'
import Bar from './Bar'

export default class Base {
    test() {
        const a = 'Bar'
        return true
    }

    foo(): Foo {
        return null
    }

    bar(): Bar {
        return null
    }
}
