import {app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain, shell} from "electron"
import localShortcut from "electron-localshortcut"
import Store from "electron-store"
import dragAddon from "electron-click-drag-plugin"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import process from "process"
import fs from "fs"
import functions, {VideoTrack, VideoChapter} from "./structures/functions"
import mainFunctions from "./structures/mainFunctions"
import Youtube from "youtube.ts"
import pack from "./package.json"

process.setMaxListeners(0)
let window: Electron.BrowserWindow | null

let ffmpegPath = undefined as any
if (process.platform === "darwin") ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg.app")
if (process.platform === "win32") ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg.exe")
if (process.platform === "linux") ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg")
if (process.env.DEVELOPMENT === "true") ffmpegPath = "./ffmpeg/ffmpeg.app"
if (!fs.existsSync(ffmpegPath)) ffmpegPath = undefined
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

let ffprobePath = undefined as any
if (process.platform === "darwin") ffprobePath = path.join(app.getAppPath(), "../../ffmpeg/ffprobe.app")
if (process.platform === "win32") ffprobePath = path.join(app.getAppPath(), "../../ffmpeg/ffprobe.exe")
if (process.platform === "linux") ffprobePath = path.join(app.getAppPath(), "../../ffmpeg/ffprobe")
if (process.env.DEVELOPMENT === "true") ffprobePath = "./ffmpeg/ffprobe.app"
if (!fs.existsSync(ffprobePath)) ffprobePath = undefined

let ytdlPath = undefined as any
if (process.platform === "darwin") ytdlPath = path.join(app.getAppPath(), "../../ytdl/yt-dlp.app")
if (process.platform === "win32") ytdlPath = path.join(app.getAppPath(), "../../ytdl/yt-dlp.exe")
if (process.platform === "linux") ytdlPath = path.join(app.getAppPath(), "../../ytdl/yt-dlp")
if (process.env.DEVELOPMENT === "true") ytdlPath = "./ytdl/yt-dlp.app"
if (!fs.existsSync(ytdlPath)) ytdlPath = "yt-dlp"

const store = new Store()
let initialTransparent = process.platform === "win32" ? store.get("transparent", false) as boolean : true
const youtube = new Youtube()
let filePath = ""

let chapters = [] as VideoChapter[]
let audioTracks = [] as VideoTrack[]
let subtitleTracks = [] as VideoTrack[]

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

ipcMain.handle("resize-window", async (event, dim: {width: number, height: number}) => {
  const {width, height} = functions.constrainDimensions(dim.width, dim.height)
  window?.setAspectRatio(width / height)
  window?.setSize(width, height, true)
})

ipcMain.handle("mov-to-mp4", async (event, videoFile: string) => {
  const baseFlags = ["-pix_fmt", "yuv420p", "-movflags", "+faststart"]
  const ext = path.extname(videoFile)
  const name = path.basename(videoFile, ext)
  const savePath = path.join(app.getPath("documents"), `Motion Player/videos/${name}.mp4`)
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

const containsAudio = async (file: string, ffmpegPath?: string) => {
  const str = await mainFunctions.spawn(ffmpegPath ?? "ffmpeg", ["-i", file])
    .then((s: any) => s.stdout).catch((e: any) => e.stderr)

  return /Stream #.*Audio:/i.test(str)
}

ipcMain.handle("export-video", async (event, videoFile: string, savePath: string, options: any) => {
  let {reverse, speed, preservesPitch, abloop, loopStart, loopEnd, duration} = options
  if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
  const audio = await containsAudio(videoFile, ffmpegPath)

  const overwrite = path.resolve(videoFile) === path.resolve(savePath)

  const tempOutput = overwrite
    ? path.join(app.getPath("documents"), `Motion Player/videos/temp_${path.basename(savePath)}`)
    : savePath

  const baseFlags = ["-pix_fmt", "yuv420p", "-movflags", "+faststart"]
  let audioSpeed = preservesPitch ? `atempo=${speed}` : `asetrate=44100*${speed},aresample=44100`

  const videoBlock = `[0:v]setpts=${1.0/speed}*PTS${reverse ? ",reverse": ""}[v]`
  let audioBlock =`[0:a]${audioSpeed}${reverse ? ",areverse" : ""}[a]`

  let audioFilter = ["-filter_complex", `${videoBlock};${audioBlock}`, "-map", "[v]",  "-map", "[a]"]
  let noAudioFilter = ["-filter_complex", `${videoBlock}`, "-map", "[v]"]
  let filter = audio ? audioFilter : noAudioFilter

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

ipcMain.handle("save-dialog", async (event, defaultPath: string) => {
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

ipcMain.handle("trigger-download", async (event, link: string) => {
  window?.webContents.send("trigger-download", link)
})

ipcMain.handle("download-yt-video", async (event, url: string) => {
  const name = await youtube.util.getTitle(url)
  const savePath = path.join(app.getPath("documents"), `Motion Player/videos/${name}.mp4`)

  let args = [
    `--js-runtimes node:"${mainFunctions.getNodePath()}"`, `--ffmpeg-location "${ffmpegPath ?? "ffmpeg"}"`,
    "-t", "mp4", url, "-o", savePath
  ]
  const str = await mainFunctions.spawn(ytdlPath ?? "yt-dlp", args)
    .then((s: any) => s.stdout).catch((e: any) => e.stderr)

  window?.webContents.send("debug", str)
  return savePath
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

ipcMain.handle("export-dialog", async (event, visible: boolean) => {
  window?.webContents.send("close-all-dialogs", "export")
  window?.webContents.send("show-export-dialog", visible)
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
      title: stream.tags?.title
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

ipcMain.handle("extract-subtitle-track", async (event, videoFile: string, streamIndex: number) => {
    if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
    const name = path.basename(videoFile, path.extname(videoFile))

    const vidDest = path.join(app.getPath("documents"), `Motion Player/subtitles`)
    if (!fs.existsSync(vidDest)) fs.mkdirSync(vidDest, {recursive: true})

    const newDest = path.join(vidDest, `./${name}_${streamIndex}.vtt`)
    if (fs.existsSync(newDest)) return newDest

    return new Promise<string>((resolve, reject) => {
        ffmpeg(path.normalize(videoFile).replaceAll("\\", "/"))
        .outputOptions([
          "-map", `0:s:${streamIndex}`,
          "-c:s", "webvtt"
        ])
        .save(newDest)
        .on("end", () => resolve(newDest))
        .on("error", (err) => reject(err))
    }).catch((err) => console.log(err))
})

ipcMain.handle("extract-audio-track", async (event, videoFile: string, streamIndex: number) => {
  if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
  const name = path.basename(videoFile, path.extname(videoFile))

  const vidDest = path.join(app.getPath("documents"), `Motion Player/audio`)
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

ipcMain.handle("get-reverse-src", async (event, videoFile: string) => {
  const ext = path.extname(videoFile)
  const name = path.basename(videoFile, ext)
  const vidDest = path.join(app.getPath("documents"), `Motion Player/audio`)
  const newDest = path.join(vidDest, `./${name}_reverse${ext}`)
  if (fs.existsSync(newDest)) return newDest
  return null
})

ipcMain.handle("reverse-audio", async (event, videoFile: string) => {
    if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
    const ext = path.extname(videoFile)
    const name = path.basename(videoFile, ext)
    const vidDest = path.join(app.getPath("documents"), `Motion Player/audio`)
    if (!fs.existsSync(vidDest)) fs.mkdirSync(vidDest, {recursive: true})

    const newDest = path.join(vidDest, `./${name}_reverse${ext}`)

    const baseFlags = ["-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    const flags = ["-map", "0:v", "-c:v", "copy", "-map", "0:a", "-af", "areverse", "-c:a aac"]

    await new Promise<void>((resolve) => {
      ffmpeg(path.normalize(videoFile).replaceAll("\\", "/"))
      .outputOptions([...baseFlags, ...flags])
      .save(newDest)
      .on("end", () => {
          resolve()
      })
    })
    
    return newDest
})

ipcMain.handle("select-file", async () => {
  if (!window) return
  const files = await dialog.showOpenDialog(window, {
    filters: [
      {name: "All Files", extensions: ["*"]},
      {name: "Video", extensions: ["mp4", "webm", "mkv", "mov", "avi", "m4v"]}
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

ipcMain.handle("context-menu", (event, {hasSelection}) => {
  const template: MenuItemConstructorOptions[] = [
    {label: "Copy", enabled: hasSelection, role: "copy"},
    {label: "Paste", role: "paste"},
    {type: "separator"},
    {label: "Lock Aspect Ratio", click: () => event.sender.send("trigger-resize")},
    {label: "Unlock Aspect Ratio", click: () => window?.setAspectRatio(0)},
    {type: "separator"},
    {label: "Copy Loop", click: () => event.sender.send("copy-loop")},
    {label: "Paste Loop", click: () => event.sender.send("paste-loop")},
    {type: "separator"},
    {label: "Clear Video Cache", click: () => {
      const videoPath = path.join(app.getPath("documents"), `Motion Player/videos`)
      const subtitlePath = path.join(app.getPath("documents"), `Motion Player/subtitles`)
      const audioPath = path.join(app.getPath("documents"), `Motion Player/audio`)
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
        {label: "Online Support", click: () => shell.openExternal(pack.repository.url)}
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
    openFile()
    if (ffmpegPath && process.platform === "darwin") fs.chmodSync(ffmpegPath, "777")
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