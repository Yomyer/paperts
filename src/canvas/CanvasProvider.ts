type CanvasProviderType = {
    canvases: any[]
    getCanvas: any
    getContext: any
    release: any
}
export const CanvasProvider: CanvasProviderType = {
    canvases: [],

    getCanvas: function (width: any, height: any) {
        if (!window) return null
        let canvas
        let clear = true
        if (typeof width === 'object') {
            height = width.height
            width = width.width
        }
        if (this.canvases.length) {
            canvas = this.canvases.pop()
        } else {
            canvas = document.createElement('canvas')
            clear = false
        }
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            throw new Error(
                'Canvas ' + canvas + ' is unable to provide a 2D context.'
            )
        }

        if (canvas.width === width && canvas.height === height) {
            if (clear) ctx.clearRect(0, 0, width + 1, height + 1)
        } else {
            canvas.width = width
            canvas.height = height
        }

        ctx.save()
        return canvas
    },

    getContext: function (width: number, height: number) {
        const canvas = this.getCanvas(width, height)
        return canvas ? canvas.getContext('2d') : null
    },

    release: function (obj: any) {
        const canvas = obj && obj.canvas ? obj.canvas : obj
        if (canvas && canvas.getContext) {
            // We restore contexts on release(), see getCanvas()
            canvas.getContext('2d').restore()
            this.canvases.push(canvas)
        }
    }
}
