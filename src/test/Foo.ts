import { Bar } from './index'
import { Base } from '../core'

export default class Foo extends Base {
    test() {
        console.log(Bar.exports)
        return true
    }
}
