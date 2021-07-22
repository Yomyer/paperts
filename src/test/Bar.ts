import { Exportable } from '../utils/Decorators'
import { Foo } from './index'

@Exportable()
export default class Bar extends Foo {}
