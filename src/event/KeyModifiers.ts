import { PaperScope } from '../';

export class KeyModifiers {
    shift = false
    control = false
    alt = false
    meta = false
    capsLock = false
    space = false

    get option(): boolean {
        return this.alt
    }

    get command(): boolean {
        const agent = PaperScope.paper && PaperScope.paper.agent
        return agent && agent.mac ? this.meta : this.control
    }
}