/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Motion Player - A cute video player ❤                     *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import MP4Demuxer from "./MP4Demuxer"
// @ts-ignore
import {JsWebm} from "jswebm"
import fileType from "magic-bytes.js"
import JSZip from "jszip"
import GifEncoder from "gif-encoder"
// @ts-ignore
import pixels from "image-pixels"

export interface VideoTrack {
    index: number
    type: "video" | "audio" | "subtitle"
    codec: string
    language?: string
    title?: string
}

export interface VideoChapter {
    id: number
    start: number
    end: number
    title: string
}

export type CanvasDrawable =
    | HTMLCanvasElement 
    | HTMLImageElement 
    | HTMLVideoElement 
    | ImageBitmap

export interface BitmapFrame {
    frame: ImageBitmap
}

export interface AnimationFrame {
    frame: HTMLCanvasElement
    delay: number
}

const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"]
const animationExtensions = [".gif", ".webp", ".apng", ".png"]
    
export default class Functions {
    public static extractMP4Frames = async (videoFile: string) => {
        let frames = [] as BitmapFrame[]
        await new Promise<void>(async (resolve) => {
            let demuxer = new MP4Demuxer(videoFile)
            let timeout = null as any
            let decoder = new VideoDecoder({
                output: async (frame: VideoFrame) => {
                    clearTimeout(timeout)
                    const bitmap = await createImageBitmap(frame)
                    frames.push({frame: bitmap})
                    frame.close()
                    timeout = setTimeout(() => {
                        resolve()
                    }, 500)
                },
                error: (e: any) => console.error(e)
            })
            const config = await demuxer.getConfig()
            decoder.configure(config)
            demuxer.start((chunk: EncodedVideoChunk) => decoder.decode(chunk))
        })
        return Promise.all(frames)
    }

    public static extractWebMFrames = async (videoFile: string, vp9?: boolean) => {
        const videoBuffer = await window.ipcRenderer.invoke("read-buffer", videoFile)
        let frames = [] as BitmapFrame[]
        await new Promise<void>(async (resolve) => {
            let demuxer = new JsWebm()
            demuxer.queueData(videoBuffer)
            let timeout = null as any
            let decoder = new VideoDecoder({
                output: async (frame: VideoFrame) => {
                    clearTimeout(timeout)
                    const bitmap = await createImageBitmap(frame)
                    frames.push({frame: bitmap})
                    frame.close()
                    timeout = setTimeout(() => {
                        resolve()
                    }, 500)
                },
                error: (e: any) => console.error(e)
            })
            while (!demuxer.eof) {
                demuxer.demux()
            }
            decoder.configure({
                codec: vp9 ? "vp09.00.10.08" : "vp8",
                codedWidth: demuxer.videoTrack.width,
                codedHeight: demuxer.videoTrack.height,
                displayAspectWidth: demuxer.videoTrack.width,
                displayAspectHeight: demuxer.videoTrack.height,
                colorSpace: {
                    primaries: "bt709",
                    transfer: "bt709",
                    matrix: "rgb"
                },
                hardwareAcceleration: "no-preference",
                optimizeForLatency: true
            })
            let foundKeyframe = false
            for (let i = 0; i < demuxer.videoPackets.length; i++) {
                const packet = demuxer.videoPackets[i]
                if (packet.isKeyframe) foundKeyframe = true 
                if (!foundKeyframe) continue
                const chunk = new EncodedVideoChunk({type: packet.isKeyframe ? "key" : "delta", 
                data: packet.data, timestamp: packet.timestamp * demuxer.segmentInfo.timecodeScale / 1000})
                decoder.decode(chunk)
            }
        })
        return Promise.all(frames)
    }

    public static videoSpeed = (data: BitmapFrame[], speed: number) => {
        if (speed === 1) return data 
        const constraint = speed > 1 ? data.length / speed : data.length
        let step = Math.ceil(data.length / constraint)
        let newData = [] as BitmapFrame[] 
        for (let i = 0; i < data.length; i += step) {
            const frame = data[i]
            newData.push(frame)
            if (speed < 1) {
                const amount = (1 / speed) - 1 
                for (let i = 0; i < amount; i++) {
                    newData.push(frame)
                }
            }
        }
        return newData
    }

    public static videoThumbnail = async (link: string) => {
        return new Promise<string>((resolve) => {
            const video = document.createElement("video")
            video.src = link
            video.addEventListener("loadedmetadata", (event) => {
                video.currentTime = video.duration / 2
            })
            video.addEventListener("seeked", () => {
                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")!
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
                resolve(canvas.toDataURL())
            })
            video.load()
        })
    }

    public static extractAnimationFrames = async (data: ArrayBuffer, format = "gif") => {
        let index = 0
        let imageDecoder = new ImageDecoder({data, type: `image/${format}`, preferAnimation: true})
        let result = [] as AnimationFrame[]
        while (true) {
            try {
                const decoded = await imageDecoder.decode({frameIndex: index++})
                const canvas = document.createElement("canvas")
                canvas.width = decoded.image.codedWidth
                canvas.height = decoded.image.codedHeight
                const canvasContext = canvas.getContext("2d")!
                const image = await createImageBitmap(decoded.image)
                canvasContext.drawImage(image, 0, 0)
                const duration = decoded.image.duration || 0
                result.push({frame: canvas, delay: duration / 1000.0})
            } catch {
                break
            }
        }

        return result
    }

    public static extractUgoiraFrames = async (zipBuffer: ArrayBuffer, firstOnly?: boolean) => {
        const zip = await JSZip.loadAsync(zipBuffer)
        let frames = [] as AnimationFrame[]
        let animations = [] as {file: string, delay: number}[]
        const animationFile = zip.file("animation.json")
        if (animationFile) {
            const jsonText = await animationFile.async("text")
            const json = JSON.parse(jsonText)
            animations = json.frames || json
        }
        for (const frameInfo of animations) {
            const {file, delay} = frameInfo
            const fileObject = zip.file(file)
            if (!fileObject) continue

            const blob = await fileObject.async("blob")
            const url = URL.createObjectURL(blob)
            const image = await Functions.createImage(url)
            const canvas = document.createElement("canvas")
            canvas.width = image.width
            canvas.height = image.height
            const ctx = canvas.getContext("2d")!
            ctx.drawImage(image, 0, 0)
            URL.revokeObjectURL(url)
            frames.push({frame: canvas, delay})
            if (firstOnly) return frames
        }
        return frames
    }

    public static animationSpeed = (data: AnimationFrame[], speed: number) => {
        if (speed === 1) return data 
        const constraint = speed > 1 ? data.length / speed : data.length
        let step = Math.ceil(data.length / constraint)
        let newData = [] as AnimationFrame[] 
        for (let i = 0; i < data.length; i += step) {
            const frame = data[i].frame 
            let delay = data[i].delay 
            if (speed < 1) delay = delay / speed 
            newData.push({frame, delay})
        }
        return newData
    }

    public static yieldToUI = () => {
        return new Promise<void>((resolve) => setTimeout(resolve, 0))
    }

    public static encodeGIF = async (frames: ArrayBuffer[], delays: number[], width: number, height: number) => {
        const gif = new GifEncoder(width, height, {highWaterMark: 5 * 1024 * 1024})
        gif.setQuality(10)
        gif.setRepeat(0)
        gif.writeHeader()

        const chunks: Buffer[] = []

        gif.on("data", (chunk: Buffer) => {
            chunks.push(chunk)
        })

        const finished = new Promise<Buffer>((resolve, reject) => {
            gif.on("end", () => {
                resolve(Buffer.concat(chunks))
            })
            gif.on("error", reject)
        })

        for (let i = 0; i < frames.length; i++) {
            const {data} = await pixels(frames[i], {width, height})
            gif.setDelay(delays[i])
            gif.addFrame(data)

            if (i % 2 === 0) {
                await Functions.yieldToUI()
            }
        }

        gif.finish()

        return finished
    }

    public static arrayIncludes = (str: string, arr: string[]) => {
        for (let i = 0; i < arr.length; i++) {
            if (str.includes(arr[i])) return true
        }
        return false
    }

    public static arrayRemove = <T>(arr: T[], val: T) => {
        return arr.filter((item) => item !== val)
    }

    public static timeout = async (ms: number) => {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    public static logSlider = (position: number) => {
        const minPos = 0
        const maxPos = 1
        const minValue = Math.log(60)
        const maxValue = Math.log(100)
        const scale = (maxValue - minValue) / (maxPos - minPos)
        const value = Math.exp(minValue + scale * (position - minPos))
        let adjusted = value - 100
        if (adjusted > 0) adjusted = 0
        return adjusted
      }

      public static parseSeconds = (str: string) => {
        const split = str.split(":")
        let seconds = 0
        if (split.length === 3) {
            seconds += Number(split[0]) * 3600
            seconds += Number(split[1]) * 60
            seconds += Number(split[2])
        } else if (split.length === 2) {
            seconds += Number(split[0]) * 60
            seconds += Number(split[1])
        } else if (split.length === 1) {
            seconds += Number(split[0])
        }
        return seconds
    }

    public static formatSeconds = (duration: number) => {
        let seconds = Math.floor(duration % 60) as any
        let minutes = Math.floor((duration / 60) % 60) as any
        let hours = Math.floor((duration / (60 * 60)) % 24) as any
        if (Number.isNaN(seconds) || seconds < 0) seconds = 0
        if (Number.isNaN(minutes) || minutes < 0) minutes = 0
        if (Number.isNaN(hours) || hours < 0) hours = 0

        hours = (hours === 0) ? "" : ((hours < 10) ? "0" + hours + ":" : hours + ":")
        minutes = hours && (minutes < 10) ? "0" + minutes : minutes
        seconds = (seconds < 10) ? "0" + seconds : seconds
        return `${hours}${minutes}:${seconds}`
    }

    public static decodeEntities(encodedString: string) {
        const regex = /&(nbsp|amp|quot|lt|gt);/g
        const translate = {
            nbsp:" ",
            amp : "&",
            quot: "\"",
            lt  : "<",
            gt  : ">"
        } as any
        return encodedString.replace(regex, function(match, entity) {
            return translate[entity]
        }).replace(/&#(\d+);/gi, function(match, numStr) {
            const num = parseInt(numStr, 10)
            return String.fromCharCode(num)
        })
    }

    public static cleanHTML = (str: string) => {
        return Functions.decodeEntities(str).replace(/<\/?[^>]+(>|$)/g, "")
    }

    public static round = (value: number, step?: number) => {
        if (!step) step = 1.0
        const inverse = 1.0 / step
        return Math.round(value * inverse) / inverse
    }

    public static streamToBuffer = async (stream: NodeJS.ReadableStream) => {
        const chunks: any[] = []
        const arr = await new Promise<Buffer>((resolve, reject) => {
          stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
          stream.on("error", (err) => reject(err))
          stream.on("end", () => resolve(Buffer.concat(chunks)))
        })
        return arr.buffer as ArrayBuffer
    }

    public static getFile = async (filepath: string) => {
        const blob = await fetch(filepath).then((r) => r.blob())
        let name = await window.path.basename(filepath)
        name = name.replace(".mp3", "").replace(".wav", "").replace(".flac", "").replace(".ogg", "")
        // @ts-ignore
        blob.lastModifiedDate = new Date()
        // @ts-ignore
        blob.name = name
        return blob as File
    }

    public static constrainDimensions = (width: number, height: number) => {
        const maxWidth = 1450
        const maxHeight = 942
        const minWidth = 520
        const minHeight = 250

        let newWidth = width
        let newHeight = height

        if (newWidth > maxWidth || newHeight > maxHeight) {
            const scale = Math.min(
                maxWidth / newWidth,
                maxHeight / newHeight
            )
            newWidth *= scale
            newHeight *= scale
        }

        if (newWidth < minWidth || newHeight < minHeight) {
            const scale = Math.max(
                minWidth / newWidth,
                minHeight / newHeight
            )
            newWidth *= scale
            newHeight *= scale
        }
        
        return {width: Math.floor(newWidth), height: Math.floor(newHeight)}
    }

    public static escapeQuotes = (str: string) => {
        return str.replace(/"/g, `"\\""`).replace(/'/g, `'\\''`)
    }

    public static isMP4 = (file?: string | null) => {
        if (!file) return false
        file = file.replace(/\?.*$/, "")
        if (file?.startsWith("blob:")) {
            const ext = file.split("#")?.[1] || ""
            return ext === ".mp4"
        }
        const ext = file.startsWith(".") ? file : file.slice(-4)
        return ext === ".mp4"
    }

    public static isWebM = (file?: string | null) => {
        if (!file) return false
        file = file.replace(/\?.*$/, "")
        if (file?.startsWith("blob:")) {
            const ext = file.split("#")?.[1] || ""
            return ext === ".webm"
        }
        const ext = file.startsWith(".") ? file : file.slice(-5)
        return ext === ".webm"
    }
    
    public static isVideo = (file?: string | null) => {
        if (!file) return false
        file = file.replace(/\?.*$/, "")
        if (file?.startsWith("blob:")) {
            const ext = file.split("#")?.[1] || ""
            return Functions.arrayIncludes(ext, videoExtensions)
        }
        if (file.startsWith("data:video")) {
            return true
        }
        const ext = file.startsWith(".") ? file : `.${file.split(".").pop()}`
        return Functions.arrayIncludes(ext, videoExtensions)
    }

    public static isAnimation = (file?: string | null) => {
        if (!file) return false
        file = file.replace(/\?.*$/, "")
        if (file?.startsWith("blob:")) {
            const ext = file.split("#")?.[1] || ""
            return Functions.arrayIncludes(ext, animationExtensions)
        }
        if (file.startsWith("data:image")) {
            return true
        }
        const ext = file.startsWith(".") ? file : `.${file.split(".").pop()}`
        return Functions.arrayIncludes(ext, animationExtensions)
    }

    public static isAnimatedWebp = (buffer: ArrayBuffer) => {
        let str = ""
        const byteArray = new Uint8Array(Buffer.from(buffer))
        for (let i = 0; i < byteArray.length; i++) {
            str += String.fromCharCode(byteArray[i])
        }
        return str.indexOf("ANMF") !== -1
    }

    public static isAnimatedPng = (buffer: ArrayBuffer) => {
        let str = ""
        const byteArray = new Uint8Array(Buffer.from(buffer))
        for (let i = 0; i < byteArray.length; i++) {
            str += String.fromCharCode(byteArray[i])
        }
        return str.indexOf("acTL") !== -1
    }

    public static isZip = (file?: string | null) => {
        if (!file) return false
        file = file.replace(/\?.*$/, "")
        if (file?.startsWith("blob:")) {
            const ext = file.split("#")?.[1] || ""
            return ext === ".zip"
        }
        const ext = file.startsWith(".") ? file : file.slice(-4)
        return ext === ".zip"
    }

    public static isUgoiraZip = async (buffer: ArrayBuffer) => {
        let isZip = false
        const result = fileType(new Uint8Array(buffer))?.[0] || {mime: ""}
        if (result.mime === "application/zip") isZip = true
        if (!isZip) return false
        
        const zip = await JSZip.loadAsync(buffer)
        
        let hasImage = false
        let hasAnimation = false

        for (const [relativePath, file] of Object.entries(zip.files)) {
            if (relativePath.startsWith("__MACOSX") || file.dir) continue
            if (relativePath.endsWith("animation.json")) hasAnimation = true
            if (relativePath.match(/\.(png|jpg|webp|avif)$/)) hasImage = true
        }
        
        return hasImage && hasAnimation
    }

    public static createImage = async (image: string) => {
        const img = new window.Image()
        img.src = image
        return new Promise<HTMLImageElement>((resolve) => {
            img.onload = () => resolve(img)
        })
    }

    public static getLanguageName = (code?: string) => {
        if (!code) return "Unknown"

        try {
            const display = new Intl.DisplayNames(["en"], {type: "language"})
            return display.of(code.toLowerCase()) ?? code
        } catch {
            return code
        }
    }

    public static filtersOn = (filters: {brightness: number, contrast: number, hue: number, saturation: number,
        lightness: number, blur: number, sharpen: number, pixelate: number}) => {
        let {brightness, contrast, hue, saturation, lightness, blur, sharpen, pixelate} = filters
        if ((brightness !== 100) ||
            (contrast !== 100) ||
            (hue !== 180) ||
            (saturation !== 100) ||
            (lightness !== 100) ||
            (blur !== 0) ||
            (sharpen !== 0) ||
            (pixelate !== 1)) {
                return true 
            } else {
                return false
            }
    }

    public static rateOn = (effects: {speed: number, reverse: boolean}) => {
        let {speed, reverse} = effects
        if ((speed !== 1) || (reverse !== false)) return true 
        return false
    }

    public static render = <T extends boolean>(image: HTMLCanvasElement, filters: {brightness: number, 
        contrast: number, hue: number, saturation: number, lightness: number, blur: number, sharpen: number, 
        pixelate: number}, opt?: {clientWidth?: number, clientHeight?: number}) => {
        let {brightness, contrast, hue, saturation, lightness, blur, sharpen, pixelate} = filters
        let naturalWidth = image.width
        let naturalHeight = image.height
        let clientWidth = opt?.clientWidth || image.width
        let clientHeight = opt?.clientHeight || image.height
        const canvas = document.createElement("canvas") as HTMLCanvasElement
        canvas.width = naturalWidth
        canvas.height = naturalHeight
        const ctx = canvas.getContext("2d")!
        let newContrast = contrast
        ctx.filter = `brightness(${brightness}%) contrast(${newContrast}%) hue-rotate(${hue - 180}deg) saturate(${saturation}%) blur(${blur}px)`
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        if (pixelate !== 1) {
            const pixelateCanvas = document.createElement("canvas")
            const pixelateCtx = pixelateCanvas.getContext("2d")!

            const pixelWidth = clientWidth / pixelate 
            const pixelHeight = clientHeight / pixelate
            pixelateCanvas.width = pixelWidth
            pixelateCanvas.height = pixelHeight

            pixelateCtx.drawImage(image, 0, 0, pixelWidth, pixelHeight)

            ctx.imageSmoothingEnabled = false
            ctx.drawImage(pixelateCanvas, 0, 0, canvas.width, canvas.height)
            ctx.imageSmoothingEnabled = true
        }

        if (sharpen !== 0) {
            const sharpnessCanvas = document.createElement("canvas")
            sharpnessCanvas.width = naturalWidth
            sharpnessCanvas.height = naturalHeight
            const sharpnessCtx = sharpnessCanvas.getContext("2d")
            sharpnessCtx?.drawImage(image, 0, 0, sharpnessCanvas.width, sharpnessCanvas.height)
            const sharpenOpacity = sharpen / 5
            newContrast += 25 * sharpenOpacity
            const filter = `blur(4px) invert(1) contrast(75%)`
            ctx.filter = filter 
            ctx.globalAlpha = sharpenOpacity
            ctx.globalCompositeOperation = "overlay"
            ctx.drawImage(sharpnessCanvas, 0, 0, canvas.width, canvas.height)
        }

        if (lightness !== 100) {
            const lightnessCanvas = document.createElement("canvas")
            lightnessCanvas.width = naturalWidth
            lightnessCanvas.height = naturalHeight
            const lightnessCtx = lightnessCanvas.getContext("2d")
            lightnessCtx?.drawImage(image, 0, 0, lightnessCanvas.width, lightnessCanvas.height)
            const filter = lightness < 100 ? "brightness(0)" : "brightness(0) invert(1)"
            ctx.filter = filter
            ctx.globalAlpha = Math.abs((lightness - 100) / 100)
            ctx.drawImage(lightnessCanvas, 0, 0, canvas.width, canvas.height)
        }

        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        return img.data.buffer as ArrayBuffer 
    }

    public static readableFileSize = (bytes: number) => {
        const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024))
        return `${Number((bytes / Math.pow(1024, i)).toFixed(2))} ${["B", "KB", "MB", "GB", "TB"][i]}`
    }

    public static formatBitrate = (bitrate: number) => {
        if (bitrate < 1000) return bitrate + " bps"
        if (bitrate < 1000000) return (bitrate / 1_000).toFixed(2) + " kbps"
        if (bitrate < 1000000000) return (bitrate / 1_000_000).toFixed(2) + " Mbps"
        return (bitrate / 1000000000).toFixed(2) + " Gbps"
    }
}
