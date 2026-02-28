import path from "path"
import MP4Demuxer from "./MP4Demuxer"
// @ts-ignore
import {JsWebm} from "jswebm"

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
    
export default class Functions {
    public static extractMP4Frames = async (videoFile: string) => {
        let frames = [] as ImageBitmap[]
        await new Promise<void>(async (resolve) => {
            let demuxer = new MP4Demuxer(videoFile)
            let timeout = null as any
            let decoder = new VideoDecoder({
                output: async (frame: VideoFrame) => {
                    clearTimeout(timeout)
                    const bitmap = await createImageBitmap(frame)
                    frames.push(bitmap)
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
        let frames = [] as ImageBitmap[]
        await new Promise<void>(async (resolve) => {
            let demuxer = new JsWebm()
            demuxer.queueData(videoBuffer)
            let timeout = null as any
            let decoder = new VideoDecoder({
                output: async (frame: VideoFrame) => {
                    clearTimeout(timeout)
                    const bitmap = await createImageBitmap(frame)
                    frames.push(bitmap)
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

    public static videoSpeed = (data: ImageBitmap[], speed: number) => {
        if (speed === 1) return data 
        const constraint = speed > 1 ? data.length / speed : data.length
        let step = Math.ceil(data.length / constraint)
        let newData = [] as ImageBitmap[] 
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
        return arr.buffer
    }

    public static getFile = async (filepath: string) => {
        const blob = await fetch(filepath).then((r) => r.blob())
        const name = path.basename(filepath).replace(".mp3", "").replace(".wav", "").replace(".flac", "").replace(".ogg", "")
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
        const ext = file.startsWith(".") ? file : path.extname(file)
        return ext === ".mp4"
    }

    public static isWebM = (file?: string | null) => {
        if (!file) return false
        file = file.replace(/\?.*$/, "")
        if (file?.startsWith("blob:")) {
            const ext = file.split("#")?.[1] || ""
            return ext === ".webm"
        }
        const ext = file.startsWith(".") ? file : path.extname(file)
        return ext === ".webm"
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
}
