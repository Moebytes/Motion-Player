/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Frame Player - A cute video player ❤                     *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import {app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain, shell} from "electron"
import localShortcut from "electron-localshortcut"
import Store from "electron-store"
import dragAddon from "electron-click-drag-plugin"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import process from "process"
import fs from "fs"
import os from "os"
import functions, {VideoTrack, VideoChapter} from "./structures/functions"
import mainFunctions from "./structures/mainFunctions"
import Youtube from "youtube.ts"
import pack from "./package.json"

process.setMaxListeners(0)
let window: Electron.BrowserWindow | null

let ffmpegPath = undefined as any
if (process.platform === "win32") ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg.exe")
if (process.platform === "darwin") ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg.app")
if (process.platform === "linux") ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg")
if (process.env.DEVELOPMENT === "true") ffmpegPath = "./ffmpeg/ffmpeg.app"
if (!fs.existsSync(ffmpegPath)) ffmpegPath = undefined
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

let ffprobePath = undefined as any
if (process.platform === "win32") ffprobePath = path.join(app.getAppPath(), "../../ffmpeg/ffprobe.exe")
if (process.platform === "darwin") ffprobePath = path.join(app.getAppPath(), "../../ffmpeg/ffprobe.app")
if (process.platform === "linux") ffprobePath = path.join(app.getAppPath(), "../../ffmpeg/ffprobe")
if (process.env.DEVELOPMENT === "true") ffprobePath = "./ffmpeg/ffprobe.app"
if (!fs.existsSync(ffprobePath)) ffprobePath = undefined

const store = new Store()
let initialTransparent = process.platform === "win32" ? store.get("transparent", false) as boolean : true
let windowOpacity = store.get("window-opacity", 100) as number
const youtube = new Youtube()
let filePath = ""

let chapters = [] as VideoChapter[]
let audioTracks = [] as VideoTrack[]
let subtitleTracks = [] as VideoTrack[]

if (process.platform === "darwin") {
  const teamId = "EKBT5ADU6E"
  const groupPath = path.join(os.homedir(), `Library/Group Containers/${teamId}.${pack.build.appId}`)
  if (!fs.existsSync(groupPath)) fs.mkdirSync(groupPath, {recursive: true})
  app.setPath("userData", groupPath)
}

const videoCacheLocation = path.join(app.getPath("userData"), "assets")

ipcMain.handle("close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
})

ipcMain.handle("minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
})

ipcMain.handle("maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
})

ipcMain.on("moveWindow", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const handle = win?.getNativeWindowHandle()
  if (!handle) return
  const windowID = process.platform === "linux" ? handle.readUInt32LE(0) : handle
  dragAddon.startDrag(windowID)
})

ipcMain.handle("app:getPath", (event, path: string) => {
  return app.getPath(path as any)
})

ipcMain.handle("path:basename", (event, pathname: string, suffix?: string) => {
  return path.basename(pathname, suffix)
})

ipcMain.handle("path:extname", (event, pathname: string) => {
  return path.extname(pathname)
})

ipcMain.handle("resize-window", async (event, dim: {width: number, height: number}) => {
  const keepUnlocked = store.get("keep-ratio-unlocked", false)
  if (keepUnlocked) return window?.setAspectRatio(0)

  const {width, height} = functions.constrainDimensions(dim.width, dim.height)
  window?.setAspectRatio(width / height)
  window?.setSize(width, height, true)
})

ipcMain.handle("mov-to-mp4", async (event, videoFile: string) => {
  const baseFlags = ["-pix_fmt", "yuv420p", "-movflags", "+faststart"]
  const ext = path.extname(videoFile)
  const name = path.basename(videoFile, ext)
  const savePath = path.join(videoCacheLocation, `videos/${name}.mp4`)
  if (!fs.existsSync(path.dirname(savePath))) fs.mkdirSync(path.dirname(savePath), {recursive: true})
  if (fs.existsSync(savePath)) return savePath
  await new Promise<void>((resolve) => {
    ffmpeg(path.normalize(videoFile).replaceAll("\\", "/"))
    .outputOptions([...baseFlags, "-vcodec", "libx264", "-preset", "ultrafast", "-crf", "16", "-acodec", "copy"])
    .save(savePath)
    .on("end", () => {
        resolve()
    })
  })
  return savePath
})

ipcMain.handle("read-buffer", async (event, file: string) => {
  if (file.startsWith("http")) {
      const arrayBuffer = await fetch(file).then((r => r.arrayBuffer()))
      return arrayBuffer
  }
  return fs.readFileSync(file)
})

ipcMain.handle("save-buffer", async (event, filePath: string, buffer: ArrayBuffer) => {
  fs.writeFileSync(filePath, Buffer.from(buffer))
  shell.showItemInFolder(path.normalize(filePath))
})

const containsAudio = async (file: string, ffmpegPath?: string) => {
  const str = await mainFunctions.spawn(ffmpegPath ?? "ffmpeg", ["-i", file])
    .then((s: any) => s.stdout).catch((e: any) => e.stderr)

  return /Stream #.*Audio:/i.test(str)
}

ipcMain.handle("export-video", async (event, videoFile: string, savePath: string, options: any) => {
  let {reverse, speed, preservesPitch, abloop, loopStart, loopEnd, duration, audioTracks} = options
  if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")

  const overwrite = path.resolve(videoFile) === path.resolve(savePath)

  const tempOutput = overwrite
    ? path.join(videoCacheLocation, `videos/temp_${path.basename(savePath)}`)
    : savePath

  const baseFlags = ["-pix_fmt", "yuv420p", "-movflags", "+faststart"]
  let sampleRate = audioTracks[0]?.sampleRate || 44100
  let audioSpeed = preservesPitch ? `atempo=${speed}` : `asetrate=${sampleRate}*${speed},aresample=${sampleRate}`

  const videoBlock = `[0:v:0]setpts=${1.0/speed}*PTS${reverse ? ",reverse": ""}[v]`

  let filterParts = [videoBlock]
  let maps = ["-map", "[v]"]
  let metadata = [] as string[]

  for (let i = 0; i < audioTracks.length; i++) {
    const label = `a${i}`
    filterParts.push(`[0:a:${i}]${audioSpeed}${reverse ? ",areverse" : ""}[${label}]`)
    maps.push("-map", `[${label}]`)

    const track = audioTracks[i] as VideoTrack

    if (track.language) {
      metadata.push(`-metadata:s:a:${i}`, `language=${track.language}`)
    }

    if (track.title) {
      metadata.push(`-metadata:s:a:${i}`, `title=${track.title}`)
    }
  }

  let filter = ["-filter_complex", filterParts.join(";"), ...maps, ...metadata]

  let segment = [] as string[]
  duration /= speed
  if (abloop) {
    const start = reverse ? (duration / 100) * (100 - loopStart) : (duration / 100) * loopStart
    const end = reverse ? (duration / 100) * (100 - loopEnd) : (duration / 100) * loopEnd
    segment = ["-ss", `${reverse ? functions.formatSeconds(end) : functions.formatSeconds(start)}`, 
      "-to", `${reverse ? functions.formatSeconds(start) : functions.formatSeconds(end)}`]
    duration = reverse ? start - end : end - start
  }

  await new Promise<void>((resolve, reject) => {
    ffmpeg(path.normalize(videoFile).replaceAll("\\", "/"))
    .outputOptions([...baseFlags, ...segment, ...filter])
    .save(tempOutput)
    .on("end", () => resolve())
    .on("error", () => reject())
    .on("progress", (progress) => {
      window?.webContents.send("export-progress", {...progress, duration})
    })
  })

  if (overwrite) {
    fs.unlinkSync(savePath)
    fs.renameSync(tempOutput, savePath)
  }
  shell.showItemInFolder(savePath)
})

ipcMain.handle("save-video-dialog", async (event, defaultPath: string) => {
  if (!window) return
  const save = await dialog.showSaveDialog(window, {
    defaultPath,
    filters: [
      {name: "All Files", extensions: ["*"]},
      {name: "MP4", extensions: ["mp4"]},
      {name: "MKV", extensions: ["mkv"]},
      {name: "MOV", extensions: ["mov"]},
      {name: "AVI", extensions: ["avi"]},
      {name: "WEBM", extensions: ["webm"]}
    ],
    properties: ["createDirectory"]
  })
  return save.filePath ? save.filePath : null
})

ipcMain.handle("save-gif-dialog", async (event, defaultPath: string) => {
  if (!window) return
  const save = await dialog.showSaveDialog(window, {
    defaultPath,
    filters: [
      {name: "All Files", extensions: ["*"]},
      {name: "GIF", extensions: ["gif"]}
    ],
    properties: ["createDirectory"]
  })
  return save.filePath ? save.filePath : null
})

ipcMain.handle("trigger-download", async (event, link: string) => {
  window?.webContents.send("trigger-download", link)
})

ipcMain.handle("download-yt-video", async (event, url: string) => {
  const name = await youtube.util.getTitle(url)
  const savePath = path.join(videoCacheLocation, `videos/${name}.mp4`)
  if (fs.existsSync(savePath)) return savePath

  // not implemented
  return null
})

ipcMain.handle("open-link", async (event, link: string) => {
  window?.webContents.send("open-link", link)
})

ipcMain.handle("show-fx-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "fx")
  window?.webContents.send("show-fx-dialog")
})

ipcMain.handle("show-link-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "link")
  window?.webContents.send("show-link-dialog")
})

ipcMain.handle("next", async (event, videoFile: string) => {
  if (!videoFile) return
  if (videoFile.startsWith("http")) return
  if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
  const directory = path.dirname(videoFile)
  const files = await mainFunctions.getSortedFiles(directory)
  const index = files.findIndex((f) => f === path.basename(videoFile))
  if (index !== -1) {
    if (files[index + 1]) return `file:///${directory}/${files[index + 1]}`
  }
  return null
})

ipcMain.handle("previous", async (event, videoFile: string) => {
  if (!videoFile) return
  if (videoFile.startsWith("http")) return
  if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
  const directory = path.dirname(videoFile)
  const files = await mainFunctions.getSortedFiles(directory)
  const index = files.findIndex((f) => f === path.basename(videoFile))
  if (index !== -1) {
    if (files[index - 1]) return `file:///${directory}/${files[index - 1]}`
  }
  return null
})

ipcMain.handle("export-dialog", async (event, visible: boolean, type: string) => {
  window?.webContents.send("close-all-dialogs", "export")
  window?.webContents.send("show-export-dialog", visible, type)
})

ipcMain.handle("reverse-dialog", async (event, visible: boolean, type: string) => {
  window?.webContents.send("close-all-dialogs", "reverse")
  window?.webContents.send("show-reverse-dialog", visible, type)
})

ipcMain.handle("get-state", () => {
  return store.get("state", {})
})

ipcMain.handle("save-state", (event, newState: any) => {
  let state = store.get("state", {}) as object
  state = {...state, ...newState}
  store.set("state", state)
})

ipcMain.handle("upload-file", () => {
  window?.webContents.send("upload-file")
})

ipcMain.handle("show-info-dialog", async (event: any, videoFile: string) => {
  if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
  let args = ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", videoFile]

  const str = await mainFunctions.spawn(ffprobePath ?? "ffprobe", args).then((s: any) => s.stdout).catch((e: any) => e.stderr)
  const json = JSON.parse(str)

  const stream = json.streams[0]
  const format = json.format

  const parseFps = (rate: string | undefined) => {
    if (!rate) return "?"
    const [num, den] = rate.split("/").map(Number)
    if (!num || !den) return "?"
    return (num / den).toFixed(2)
  }

  const detail = [
    `Name: ${format.filename}`,
    `Width: ${stream.width}`,
    `Height: ${stream.height}`,
    `Duration: ${functions.formatSeconds(Number(format.duration))}`,
    `Size: ${functions.readableFileSize(Number(format.size))}`,
    `Format: ${format.format_name}`,
    `Codec: ${stream.codec_name}`,
    `Bitrate: ${functions.formatBitrate(Number(format.bit_rate))}`,
    `Framerate: ${parseFps(stream.r_frame_rate)}`,
    `Frames: ${stream.nb_frames ?? "?"}`,
    `Streams: ${format.nb_streams}`,
    `Pixel Format: ${stream.pix_fmt}`
  ].join("\n")

  await dialog.showMessageBox(window!, {
    type: "info",
    title: "Video Info",
    message: "Video Info",
    detail,
    buttons: ["Ok"],
    noLink: true
  })
})

ipcMain.handle("get-tracks", async (event, videoFile: string) => {
  if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
  let args = ["-v", "error", "-print_format", "json", "-show_streams", "-show_chapters", videoFile]

  const str = await mainFunctions.spawn(ffprobePath ?? "ffprobe", args).then((s: any) => s.stdout).catch((e: any) => e.stderr)
  const json = JSON.parse(str)

  let tracks = [] as VideoTrack[]
  chapters = []
  audioTracks = []
  subtitleTracks = []
  let subtitleCount = 0
  let audioCount = 0
  let videoCount = 0

  for (const stream of json.streams) {
    if (!["video", "audio", "subtitle"].includes(stream.codec_type)) continue

    let relativeIndex = 0

    if (stream.codec_type === "video") {
      relativeIndex = videoCount++
    }

    if (stream.codec_type === "audio") {
      relativeIndex = audioCount++
    }

    if (stream.codec_type === "subtitle") {
      relativeIndex = subtitleCount++
    }

    let track = {
      index: relativeIndex,
      type: stream.codec_type,
      codec: stream.codec_name,
      language: stream.tags?.language,
      title: stream.tags?.title,
      sampleRate: stream.codec_type === "audio" ? Number(stream.sample_rate) : undefined
    } as VideoTrack

    tracks.push(track)
    if (stream.codec_type === "audio") audioTracks.push(track)
    if (stream.codec_type === "subtitle") subtitleTracks.push(track)
  }

  for (const chapter of json.chapters ?? []) {
    chapters.push({
      id: chapter.id,
      start: Number(chapter.start_time),
      end: Number(chapter.end_time),
      title: chapter.tags?.title ?? `Chapter ${chapter.id + 1}`
    })
  }

  applicationMenu()

  return {tracks, chapters}
})

ipcMain.handle("extract-subtitle-track", async (event, videoFile: string, streamIndex: number, format = "vtt") => {
    if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
    const name = path.basename(videoFile, path.extname(videoFile))

    const vidDest = path.join(videoCacheLocation, `subtitles`)
    if (!fs.existsSync(vidDest)) fs.mkdirSync(vidDest, {recursive: true})

    const newDest = path.join(vidDest, `./${name}_${streamIndex}.${format}`)
    if (fs.existsSync(newDest)) return newDest

    return new Promise<string>((resolve, reject) => {
        ffmpeg(path.normalize(videoFile).replaceAll("\\", "/"))
        .outputOptions([
          "-map", `0:s:${streamIndex}`,
          "-c:s", format === "ass" ? "copy" : "webvtt"
        ])
        .save(newDest)
        .on("end", () => resolve(newDest))
        .on("error", (err) => reject(err))
    }).catch(() => null)
})

ipcMain.handle("extract-audio-track", async (event, videoFile: string, streamIndex: number) => {
  if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
  const name = path.basename(videoFile, path.extname(videoFile))

  const vidDest = path.join(videoCacheLocation, `audio`)
  if (!fs.existsSync(vidDest)) fs.mkdirSync(vidDest, {recursive: true})

  const newDest = path.join(vidDest, `${name}_${streamIndex}${path.extname(videoFile)}`)
  if (fs.existsSync(newDest)) return newDest

  return new Promise<string>((resolve, reject) => {
      ffmpeg(path.normalize(videoFile).replaceAll("\\", "/"))
      .outputOptions([
        "-map", "0:v:0",
        "-map", `0:a:${streamIndex}`,
        "-c", "copy"
      ])
      .save(newDest)
      .on("end", () => resolve(newDest))
      .on("error", (err) => reject(err))
    }).catch((err) => console.log(err))
})

ipcMain.handle("get-reverse-src", async (event, videoFile: string, index: number) => {
  const ext = path.extname(videoFile)
  const name = path.basename(videoFile, ext)
  const vidDest = path.join(videoCacheLocation, `audio`)
  const newDest = path.join(vidDest, `./${name}_reverse${index}${ext}`)
  if (fs.existsSync(newDest)) return newDest
  return null
})

ipcMain.handle("reverse-audio-track", async (event, videoFile: string, index: number) => {
    if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
    const ext = path.extname(videoFile)
    const name = path.basename(videoFile, ext)
    const audioDest = path.join(videoCacheLocation, `audio`)
    if (!fs.existsSync(audioDest)) fs.mkdirSync(audioDest, {recursive: true})

    const vidDest = path.join(audioDest, `${name}_reverse_${index}${ext}`)
    if (fs.existsSync(vidDest)) return vidDest
    
    const reversedAudio = path.join(audioDest, `${name}_reverse_${index}.m4a`)

    await new Promise<void>((resolve, reject) => {
      ffmpeg(path.normalize(videoFile).replaceAll("\\", "/"))
        .outputOptions([
          "-map", `0:a:${index}`, "-vn",
          "-af", "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,areverse",
          "-c:a", "aac", 
          "-b:a", "192k"
        ])
        .save(reversedAudio)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
    })

    await new Promise<void>((resolve, reject) => {
      ffmpeg(path.normalize(videoFile).replaceAll("\\", "/"))
        .input(reversedAudio)
        .outputOptions([
          "-map", "0:v:0",
          "-map", "1:a:0",
          "-c:v", "copy",
          "-c:a", "aac",
          "-map_metadata", "0"
        ])
        .save(vidDest)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
    })

    fs.unlinkSync(reversedAudio)
    return vidDest
})

ipcMain.handle("select-file", async () => {
  if (!window) return
  const files = await dialog.showOpenDialog(window, {
    filters: [
      {name: "All Files", extensions: ["*"]},
      {name: "Video", extensions: ["mp4", "webm", "mkv", "mov", "avi", "m4v"]},
      {name: "Animation", extensions: ["gif", "webp", "png", "apng", "zip"]}
    ],
    properties: ["openFile"]
  })
  return files.filePaths[0] ? files.filePaths[0] : null
})

ipcMain.handle("get-theme", () => {
  return store.get("theme", "light")
})

ipcMain.handle("save-theme", (event, theme: string) => {
  store.set("theme", theme)
})

ipcMain.handle("get-os", () => {
  return store.get("os", process.platform === "darwin" ? "mac" : "windows")
})

ipcMain.handle("save-os", (event, os: string) => {
  store.set("os", os)
})

ipcMain.handle("get-transparent", () => {
  return store.get("transparent", false)
})

ipcMain.handle("save-transparent", (event, transparent: boolean) => {
  store.set("transparent", transparent)
})

ipcMain.handle("get-pinned", () => {
  return store.get("pinned", false)
})

ipcMain.handle("save-pinned", (event, pinned: boolean) => {
  store.set("pinned", pinned)
  window?.setAlwaysOnTop(pinned)
})

ipcMain.handle("get-vid-drag", () => {
  return store.get("vid-drag", true)
})

ipcMain.handle("save-vid-drag", (event, videoDrag: string) => {
  store.set("vid-drag", videoDrag)
})

ipcMain.handle("get-opened-file", () => {
  if (process.platform !== "darwin") {
    return process.argv[1]
  } else {
    return filePath
  }
})

const openFile = (argv?: any) => {
  if (process.platform !== "darwin") {
    let file = argv ? argv[2] : process.argv[1]
    window?.webContents.send("open-file", file)
  }
}

app.on("open-file", (event, file) => {
  filePath = file
  event.preventDefault()
  window?.webContents.send("open-file", file)
})

const setWindowOpacity = (percent: number) => {
  windowOpacity = Math.max(10, Math.min(100, percent))
  store.set("window-opacity", windowOpacity)

  window?.setOpacity(windowOpacity / 100)

  applicationMenu()
}

const opacitySubmenu = (): MenuItemConstructorOptions[] => {
  const values = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]

  return values.map(value => ({
    label: `${value}%`,
    type: "radio",
    checked: windowOpacity === value,
    click: () => setWindowOpacity(value)
  }))
}

ipcMain.handle("context-menu", (event, {hasSelection}) => {
  const template: MenuItemConstructorOptions[] = [
    {label: "Copy", enabled: hasSelection, role: "copy"},
    {label: "Paste", role: "paste"},
    {type: "separator"},
    {label: "Get Info", click: () => event.sender.send("show-info-dialog")},
    {label: `Opacity (${windowOpacity}%)`, submenu: opacitySubmenu()},
    {label: "Toggle Fullscreen", click: () => event.sender.send("toggle-fullscreen")},
    {label: "Toggle Pinned", click: () => event.sender.send("toggle-pinned")},
    {type: "separator"},
    {label: "Lock Aspect Ratio", click: () => event.sender.send("trigger-resize")},
    {label: "Unlock Aspect Ratio", click: () => window?.setAspectRatio(0)},
    {label: "Keep Ratio Unlocked", type: "checkbox",
      checked: store.get("keep-ratio-unlocked", false) as boolean,
      click: (menuItem) => {
        store.set("keep-ratio-unlocked", menuItem.checked)
        if (menuItem.checked) window?.setAspectRatio(0)
    }},
    {type: "separator"},
    {label: "Copy Loop", click: () => event.sender.send("copy-loop")},
    {label: "Paste Loop", click: () => event.sender.send("paste-loop")},
    {type: "separator"},
    {label: "Open Video Cache", click: () => shell.openPath(videoCacheLocation)},
    {label: "Clear Video Cache", click: () => {
      const videoPath = path.join(videoCacheLocation, `videos`)
      const subtitlePath = path.join(videoCacheLocation, `subtitles`)
      const audioPath = path.join(videoCacheLocation, `audio`)
      mainFunctions.removeDirectory(videoPath)
      mainFunctions.removeDirectory(subtitlePath)
      mainFunctions.removeDirectory(audioPath)
      event.sender.send("cache-cleared")
    }}
  ]

  const menu = Menu.buildFromTemplate(template)
  const window = BrowserWindow.fromWebContents(event.sender)
  if (window) menu.popup({window})
})

const applicationMenu = () =>  {
  const chapterSubmenu: MenuItemConstructorOptions[] =
    chapters.length === 0
      ? [{label: "No Chapters", enabled: false}]
      : chapters.map((chapter) => ({
          label: chapter.title,
          click: () => {
            window?.webContents.send("select-chapter", chapter)
          }
        }))

  const audioSubmenu: MenuItemConstructorOptions[] =
    audioTracks.length === 0
      ? [{label: "No Audio Tracks", enabled: false}]
      : audioTracks.map((track) => ({
          label: `${functions.getLanguageName(track.language)}`,
          type: "radio",
          click: () => {
            window?.webContents.send("select-audio-track", track)
          }
        }))

  const subtitleSubmenu: MenuItemConstructorOptions[] =
    subtitleTracks.length === 0
      ? [{ label: "No Subtitle Tracks", enabled: false }]
      : subtitleTracks.map((track) => ({
          label: `${functions.getLanguageName(track.language)}`,
          type: "radio",
          click: () => {
            window?.webContents.send("select-subtitle-track", track)
          }
        }))

  const template: MenuItemConstructorOptions[] = [
    {role: "appMenu"},
    {
      label: "File",
      submenu: [
        {label: "Open", accelerator: "CmdOrCtrl+O",
          click: (item, window) => {
            const win = window as BrowserWindow
            win.webContents.send("upload-file")
        }},
        {label: "Save", accelerator: "CmdOrCtrl+S",
          click: (item, window) => {
            const win = window as BrowserWindow
            win?.webContents.send("trigger-download")
        }}
      ]
    },
    {
      label: "Edit",
      submenu: [
        {role: "copy"},
        {role: "paste"}
      ]
    },
    {
      label: "View",
      submenu: [
        {label: "Lock Aspect Ratio",
          click: (item, window) => {
            const win = window as BrowserWindow
            win?.webContents.send("trigger-resize")
        }},
        {label: "Unlock Aspect Ratio",
          click: (item, window) => {
            const win = window as BrowserWindow
            win.setAspectRatio(0)
        }},
        {label: "Keep Ratio Unlocked", type: "checkbox",
          checked: store.get("keep-ratio-unlocked", false) as boolean,
          click: (menuItem) => {
            store.set("keep-ratio-unlocked", menuItem.checked)
            if (menuItem.checked) window?.setAspectRatio(0)
        }},
        {type: "separator"},
        {label: `Opacity (${windowOpacity}%)`, submenu: opacitySubmenu()},
        {label: "Toggle Fullscreen",
          click: (item, window) => {
            const win = window as BrowserWindow
            win?.webContents.send("toggle-fullscreen")
        }},
        {label: "Toggle Pinned",
          click: (item, window) => {
            const win = window as BrowserWindow
            win?.webContents.send("toggle-pinned")
        }}
      ]
    },
    {label: "Chapter", submenu: chapterSubmenu},
    {label: "Audio", submenu: audioSubmenu},
    {label: "Subtitles", submenu: subtitleSubmenu},
    {role: "windowMenu"},
    {
      role: "help",
      submenu: [
        {role: "reload"},
        {role: "forceReload"},
        {role: "toggleDevTools"},
        {type: "separator"},
        {label: "Online Support", click: () => shell.openExternal(pack.repository)},
        {label: "Privacy Policy", click: () => shell.openExternal(pack.privacyPolicy)}
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

const singleLock = app.requestSingleInstanceLock()

if (!singleLock) {
  app.quit()
} else {
  app.on("second-instance", (event, argv) => {
    if (window) {
      if (window.isMinimized()) window.restore()
      window.focus()
    }
    openFile(argv)
  })

  app.on("ready", () => {
    window = new BrowserWindow({width: 900, height: 650, minWidth: 520, minHeight: 250, transparent: initialTransparent, hasShadow: false, 
      frame: false, show: false, resizable: true, backgroundColor: "#00000000", center: true, webPreferences: {
      preload: path.join(__dirname, "../preload/index.js")}})
    window.loadFile(path.join(__dirname, "../renderer/index.html"))
    applicationMenu()
    window.removeMenu()
    window.setOpacity(windowOpacity / 100)
    openFile()
    localShortcut.register(window, "Control+Shift+I", () => {
      window?.webContents.openDevTools()
    })
    window.webContents.on("did-finish-load", () => {
      window?.show()
    })
    window.on("closed", () => {
      window = null
    })
  })
}