import { CanvasProvider } from '@paperts'

export type BlendModesKeys =
    | 'normal'
    | 'multiply'
    | 'screen'
    | 'overlay'
    | 'soft-light'
    | 'hard-light'
    | 'color-dodge'
    | 'color-burn'
    | 'darken'
    | 'lighten'
    | 'difference'
    | 'exclusion'
    | 'hue'
    | 'saturation'
    | 'luminosity'
    | 'color'
    | 'add'
    | 'subtract'
    | 'average'
    | 'pin-light'
    | 'negation'
    | 'source-over'
    | 'source-in'
    | 'source-out'
    | 'source-atop'
    | 'destination-over'
    | 'destination-in'
    | 'destination-out'
    | 'destination-atop'
    | 'lighter'
    | 'darker'
    | 'copy'
    | 'xor'

export type BlendModes = {
    'source-over': boolean
    'source-in': boolean
    'source-out': boolean
    'source-atop': boolean
    'destination-over': boolean
    'destination-in': boolean
    'destination-out': boolean
    'destination-atop': boolean
    lighter: boolean
    darker: boolean
    copy: boolean
    xor: boolean
}

export class BlendModeClass {
    private min = Math.min
    private max = Math.max
    private abs = Math.abs
    private sr: number
    private sg: number
    private sb: number
    private sa: number
    private br: number
    private bg: number
    private bb: number
    private ba: number
    private dr: number
    private dg: number
    private db: number

    private getLum(r: number, g: number, b: number) {
        return 0.2989 * r + 0.587 * g + 0.114 * b
    }

    private setLum(r: number, g: number, b: number, l: number) {
        const d = l - this.getLum(r, g, b)
        this.dr = r + d
        this.dg = g + d
        this.db = b + d
        l = this.getLum(this.dr, this.dg, this.db)
        const mn = this.min(this.dr, this.dg, this.db)
        const mx = this.max(this.dr, this.dg, this.db)
        if (mn < 0) {
            const lmn = l - mn
            this.dr = l + ((this.dr - l) * l) / lmn
            this.dg = l + ((this.dg - l) * l) / lmn
            this.db = l + ((this.db - l) * l) / lmn
        }
        if (mx > 255) {
            const ln = 255 - l
            const mxl = mx - l
            this.dr = l + ((this.dr - l) * ln) / mxl
            this.dg = l + ((this.dg - l) * ln) / mxl
            this.db = l + ((this.db - l) * ln) / mxl
        }
    }

    private getSat(r: number, g: number, b: number) {
        return this.max(r, g, b) - this.min(r, g, b)
    }

    private setSat(r: number, g: number, b: number, s: number) {
        const col = [r, g, b]
        let mx = this.max(r, g, b)
        let mn = this.min(r, g, b)

        mn = mn === r ? 0 : mn === g ? 1 : 2
        mx = mx === r ? 0 : mx === g ? 1 : 2
        const md = this.min(mn, mx) === 0 ? (this.max(mn, mx) === 1 ? 2 : 1) : 0
        if (col[mx] > col[mn]) {
            col[md] = ((col[md] - col[mn]) * s) / (col[mx] - col[mn])
            col[mx] = s
        } else {
            col[md] = col[mx] = 0
        }
        col[mn] = 0
        this.dr = col[0]
        this.dg = col[1]
        this.db = col[2]
    }

    private modes = {
        multiply: () => {
            this.dr = (this.br * this.sr) / 255
            this.dg = (this.bg * this.sg) / 255
            this.db = (this.bb * this.sb) / 255
        },

        screen: () => {
            this.dr = this.br + this.sr - (this.br * this.sr) / 255
            this.dg = this.bg + this.sg - (this.bg * this.sg) / 255
            this.db = this.bb + this.sb - (this.bb * this.sb) / 255
        },

        overlay: () => {
            this.dr =
                this.br < 128
                    ? (2 * this.br * this.sr) / 255
                    : 255 - (2 * (255 - this.br) * (255 - this.sr)) / 255
            this.dg =
                this.bg < 128
                    ? (2 * this.bg * this.sg) / 255
                    : 255 - (2 * (255 - this.bg) * (255 - this.sg)) / 255
            this.db =
                this.bb < 128
                    ? (2 * this.bb * this.sb) / 255
                    : 255 - (2 * (255 - this.bb) * (255 - this.sb)) / 255
        },

        'soft-light': () => {
            let t = (this.sr * this.br) / 255
            this.dr =
                t +
                (this.br *
                    (255 - ((255 - this.br) * (255 - this.sr)) / 255 - t)) /
                    255
            t = (this.sg * this.bg) / 255
            this.dg =
                t +
                (this.bg *
                    (255 - ((255 - this.bg) * (255 - this.sg)) / 255 - t)) /
                    255
            t = (this.sb * this.bb) / 255
            this.db =
                t +
                (this.bb *
                    (255 - ((255 - this.bb) * (255 - this.sb)) / 255 - t)) /
                    255
        },

        'hard-light': () => {
            this.dr =
                this.sr < 128
                    ? (2 * this.sr * this.br) / 255
                    : 255 - (2 * (255 - this.sr) * (255 - this.br)) / 255
            this.dg =
                this.sg < 128
                    ? (2 * this.sg * this.bg) / 255
                    : 255 - (2 * (255 - this.sg) * (255 - this.bg)) / 255
            this.db =
                this.sb < 128
                    ? (2 * this.sb * this.bb) / 255
                    : 255 - (2 * (255 - this.sb) * (255 - this.bb)) / 255
        },

        'color-dodge': () => {
            this.dr =
                this.br === 0
                    ? 0
                    : this.sr === 255
                    ? 255
                    : this.min(255, (255 * this.br) / (255 - this.sr))
            this.dg =
                this.bg === 0
                    ? 0
                    : this.sg === 255
                    ? 255
                    : this.min(255, (255 * this.bg) / (255 - this.sg))
            this.db =
                this.bb === 0
                    ? 0
                    : this.sb === 255
                    ? 255
                    : this.min(255, (255 * this.bb) / (255 - this.sb))
        },

        'color-burn': () => {
            this.dr =
                this.br === 255
                    ? 255
                    : this.sr === 0
                    ? 0
                    : this.max(0, 255 - ((255 - this.br) * 255) / this.sr)
            this.dg =
                this.bg === 255
                    ? 255
                    : this.sg === 0
                    ? 0
                    : this.max(0, 255 - ((255 - this.bg) * 255) / this.sg)
            this.db =
                this.bb === 255
                    ? 255
                    : this.sb === 0
                    ? 0
                    : this.max(0, 255 - ((255 - this.bb) * 255) / this.sb)
        },

        darken: () => {
            this.dr = this.br < this.sr ? this.br : this.sr
            this.dg = this.bg < this.sg ? this.bg : this.sg
            this.db = this.bb < this.sb ? this.bb : this.sb
        },

        lighten: () => {
            this.dr = this.br > this.sr ? this.br : this.sr
            this.dg = this.bg > this.sg ? this.bg : this.sg
            this.db = this.bb > this.sb ? this.bb : this.sb
        },

        difference: () => {
            this.dr = this.br - this.sr
            if (this.dr < 0) this.dr = -this.dr
            this.dg = this.bg - this.sg
            if (this.dg < 0) this.dg = -this.dg
            this.db = this.bb - this.sb
            if (this.db < 0) this.db = -this.db
        },

        exclusion: () => {
            this.dr = this.br + (this.sr * (255 - this.br - this.br)) / 255
            this.dg = this.bg + (this.sg * (255 - this.bg - this.bg)) / 255
            this.db = this.bb + (this.sb * (255 - this.bb - this.bb)) / 255
        },

        hue: () => {
            this.setSat(
                this.sr,
                this.sg,
                this.sb,
                this.getSat(this.br, this.bg, this.bb)
            )
            this.setLum(
                this.dr,
                this.dg,
                this.db,
                this.getLum(this.br, this.bg, this.bb)
            )
        },

        saturation: () => {
            this.setSat(
                this.br,
                this.bg,
                this.bb,
                this.getSat(this.sr, this.sg, this.sb)
            )
            this.setLum(
                this.dr,
                this.dg,
                this.db,
                this.getLum(this.br, this.bg, this.bb)
            )
        },

        luminosity: () => {
            this.setLum(
                this.br,
                this.bg,
                this.bb,
                this.getLum(this.sr, this.sg, this.sb)
            )
        },

        color: () => {
            this.setLum(
                this.sr,
                this.sg,
                this.sb,
                this.getLum(this.br, this.bg, this.bb)
            )
        },

        add: () => {
            this.dr = this.min(this.br + this.sr, 255)
            this.dg = this.min(this.bg + this.sg, 255)
            this.db = this.min(this.bb + this.sb, 255)
        },

        subtract: () => {
            this.dr = this.max(this.br - this.sr, 0)
            this.dg = this.max(this.bg - this.sg, 0)
            this.db = this.max(this.bb - this.sb, 0)
        },

        average: () => {
            this.dr = (this.br + this.sr) / 2
            this.dg = (this.bg + this.sg) / 2
            this.db = (this.bb + this.sb) / 2
        },

        negation: () => {
            this.dr = 255 - this.abs(255 - this.sr - this.br)
            this.dg = 255 - this.abs(255 - this.sg - this.bg)
            this.db = 255 - this.abs(255 - this.sb - this.bb)
        }
    }

    public nativeModes: BlendModes = {
        'source-over': true,
        'source-in': true,
        'source-out': true,
        'source-atop': true,
        'destination-over': true,
        'destination-in': true,
        'destination-out': true,
        'destination-atop': true,
        lighter: true,
        darker: true,
        copy: true,
        xor: true
    }

    private ctx = CanvasProvider.getContext(1, 1)

    public constructor() {
        if (this.ctx) {
            Object.keys(this.modes).forEach((mode) => {
                const darken = mode === 'darken'
                let ok = 0

                this.ctx.save()
                try {
                    this.ctx.fillStyle = darken ? '#300' : '#a00'
                    this.ctx.fillRect(0, 0, 1, 1)
                    this.ctx.globalCompositeOperation = mode

                    if (this.ctx.globalCompositeOperation === mode) {
                        this.ctx.fillStyle = darken ? '#a00' : '#300'
                        this.ctx.fillRect(0, 0, 1, 1)
                        ok =
                            this.ctx.getImageData(0, 0, 1, 1).data[0] !== darken
                                ? 170
                                : 51
                    }
                } catch (e) {}
                this.ctx.restore()
                this.nativeModes[mode] = ok
            })
            CanvasProvider.release(this.ctx)
        }
    }

    public process(
        mode: string,
        srcContext: any,
        dstContext: any,
        alpha: any,
        offset: any
    ) {
        const srcCanvas = srcContext.canvas
        const normal = mode === 'normal'

        if (normal || this.nativeModes[mode]) {
            dstContext.save()
            dstContext.setTransform(1, 0, 0, 1, 0, 0)
            dstContext.globalAlpha = alpha
            if (!normal) dstContext.globalCompositeOperation = mode
            dstContext.drawImage(srcCanvas, offset.x, offset.y)
            dstContext.restore()
        } else {
            const process = this.modes[mode]
            if (!process) return
            const dstData = dstContext.getImageData(
                offset.x,
                offset.y,
                srcCanvas.width,
                srcCanvas.height
            )
            const dst = dstData.data
            const src = srcContext.getImageData(
                0,
                0,
                srcCanvas.width,
                srcCanvas.height
            ).data
            for (let i = 0, l = dst.length; i < l; i += 4) {
                this.sr = src[i]
                this.br = dst[i]
                this.sg = src[i + 1]
                this.bg = dst[i + 1]
                this.sb = src[i + 2]
                this.bb = dst[i + 2]
                this.sa = src[i + 3]
                this.ba = dst[i + 3]
                process()
                const a1 = (this.sa * alpha) / 255
                const a2 = 1 - a1
                dst[i] = a1 * this.dr + a2 * this.br
                dst[i + 1] = a1 * this.dg + a2 * this.bg
                dst[i + 2] = a1 * this.db + a2 * this.bb
                dst[i + 3] = this.sa * alpha + a2 * this.ba
            }
            dstContext.putImageData(dstData, offset.x, offset.y)
        }
    }
}

export const BlendMode = new BlendModeClass()
