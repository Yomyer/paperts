import { Base, PaperScope, Runtime, View, DomEvent } from '../'

export type ModifiersType = {
    shift?: boolean
    control?: boolean
    alt?: boolean
    option?: boolean
    meta?: boolean
    command?: boolean
    capsLock?: boolean
    space?: boolean
}

@Runtime(() => {
    Key.registerEvents()
})
export class Key {
    static keyLookup = {
        '\t': 'tab',
        ' ': 'space',
        '\b': 'backspace',
        '\x7f': 'delete',
        Spacebar: 'space',
        Del: 'delete',
        Win: 'meta',
        Esc: 'escape'
    }

    static charLookup = {
        tab: '\t',
        space: ' ',
        enter: '\r'
    }

    static keyMap = {}
    static charMap = {}
    static metaFixMap: { [key: string]: string }
    static downKey: (event?: any, ...args: any) => void

    static modifiers = new Base({
        shift: false,
        control: false,
        alt: false, // WAS: option
        meta: false, // WAS: command
        capsLock: false,
        space: false
    }).inject({
        option: {
            get: function (): boolean {
                return this.alt
            }
        } as ModifiersType,
        command: {
            get: function (): boolean {
                const agent = PaperScope.paper && PaperScope.paper.agent
                return agent && agent.mac ? this.meta : this.control
            }
        } as ModifiersType
    }) as ModifiersType & Base

    static getKey(event: KeyboardEvent) {
        let key = event.key || (event as any).keyIdentifier
        key = /^U\+/.test(key)
            ? String.fromCharCode(parseInt(key.substr(2), 16))
            : /^Arrow[A-Z]/.test(key)
            ? key.substr(5)
            : key === 'Unidentified' || key === undefined
            ? String.fromCharCode(event.keyCode)
            : key
        return (
            Key.keyLookup[key] ||
            (key.length > 1 ? Base.hyphenate(key) : key.toLowerCase())
        )
    }

    static handleKey(
        down: boolean,
        key: string,
        character: string,
        event: KeyboardEvent
    ) {
        // const type = down ? 'keydown' : 'keyup'
        const view = View._focused
        let name

        Key.keyMap[key] = down
        if (down) {
            Key.charMap[key] = character
        } else {
            delete Key.charMap[key]
        }
        if (key.length > 1 && (name = Base.camelize(key)) in Key.modifiers) {
            Key.modifiers[name] = down
            const agent = PaperScope.paper && PaperScope.paper.agent
            if (name === 'meta' && agent && agent.mac) {
                if (down) {
                    Key.metaFixMap = {}
                } else {
                    for (const k in Key.metaFixMap) {
                        if (k in Key.charMap)
                            Key.handleKey(false, k, Key.metaFixMap[k], event)
                    }
                    Key.metaFixMap = null
                }
            }
        } else if (down && Key.metaFixMap) {
            // A normal key, add it to metaFixMap if that's defined.
            Key.metaFixMap[key] = character
        }
        if (view) {
            view._handleKeyEvent(
                down ? 'keydown' : 'keyup',
                event,
                key,
                character
            )
        }
    }

    static isDown(key: string) {
        return !!Key.keyMap[key]
    }

    static registerEvents() {
        DomEvent.add(document, {
            keydown: function (event) {
                const key = Key.getKey(event)
                const agent = PaperScope.paper && PaperScope.paper.agent

                if (
                    key.length > 1 ||
                    (agent &&
                        agent.chrome &&
                        (event.altKey ||
                            (agent.mac && event.metaKey) ||
                            (!agent.mac && event.ctrlKey)))
                ) {
                    Key.handleKey(
                        true,
                        key,
                        Key.charLookup[key] || (key.length > 1 ? '' : key),
                        event
                    )
                } else {
                    Key.downKey = key
                }
            },

            keypress: function (event) {
                if (Key.downKey) {
                    let key = Key.getKey(event)
                    const code = event.charCode
                    const character =
                        code >= 32
                            ? String.fromCharCode(code)
                            : key.length > 1
                            ? ''
                            : key
                    if (key !== Key.downKey) {
                        key = character.toLowerCase()
                    }
                    Key.handleKey(true, key, character, event)
                    Key.downKey = null
                }
            },

            keyup: function (event) {
                const key = Key.getKey(event)
                if (key in Key.charMap)
                    Key.handleKey(false, key, Key.charMap[key], event)
            }
        })

        DomEvent.add(window, {
            blur: function (event) {
                // Emit key-up events for all currently pressed keys.
                for (const key in Key.charMap)
                    Key.handleKey(false, key, Key.charMap[key], event)
            }
        })
    }
}
