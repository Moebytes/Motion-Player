import {app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain, shell} from "electron"
import Store from "electron-store"
import dragAddon from "electron-click-drag-plugin"
import util from "util"
import child_process from "child_process"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import process from "process"
import fs from "fs"
import functions from "./structures/functions"
import mainFunctions from "./structures/mainFunctions"
import Youtube from "youtube.ts"
import pack from "./package.json"

const exec = util.promisify(child_process.exec)
process.setMaxListeners(0)
let window: Electron.BrowserWindow | null

let ffmpegPath = undefined as any
if (process.platform === "darwin") ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg.app")
if (process.platform === "win32") ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg.exe")
if (process.platform === "linux") ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg")
if (!fs.existsSync(ffmpegPath)) ffmpegPath = undefined
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

const store = new Store()
const youtube = new Youtube()
let filePath = ""

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

const parseResolution = async (file: string, ffmpegPath?: string) => {
  let command = `"${ffmpegPath ? ffmpegPath : "ffmpeg"}" -i "${functions.escapeQuotes(file)}"`
  const str = await exec(command).then((s: any) => s.stdout).catch((e: any) => e.stderr)
  const dim = str.match(/(?<= )\d+x\d+(?= |,)/)[0].split("x")
  return {width: Number(dim[0]), height: Number(dim[1])}
}

ipcMain.handle("resize-window", async (event, videoFile: string) => {
  const dim = await parseResolution(videoFile, ffmpegPath)
  const {width, height} = functions.constrainDimensions(dim.width, dim.height)
  window?.setAspectRatio(width / height)
  window?.setSize(width, height, true)
})

ipcMain.handle("mov-to-mp4", async (event, videoFile: string) => {
  const baseFlags = ["-pix_fmt", "yuv420p", "-movflags", "+faststart"]
  const ext = path.extname(videoFile)
  const name = path.basename(videoFile, ext)
  const savePath = path.join(app.getAppPath(), `../assets/videos/${name}.mp4`)
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
  let command = `"${ffmpegPath ? ffmpegPath : "ffmpeg"}" -i "${functions.escapeQuotes(file)}"`
  const str = await exec(command).then((s: any) => s.stdout).catch((e: any) => e.stderr)
  return /Stream #.*Audio:/i.test(str)
}

ipcMain.handle("export-video", async (event, videoFile: string, savePath: string, options: any) => {
  let {reverse, speed, preservesPitch, abloop, loopStart, loopEnd, duration} = options
  if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
  const audio = await containsAudio(videoFile, ffmpegPath)

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
    .save(savePath)
    .on("end", () => resolve())
    .on("error", () => reject())
    .on("progress", (progress) => {
      window?.webContents.send("export-progress", {...progress, duration})
    })
  })
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

ipcMain.handle("download-yt-video", async (event, link: string) => {
  return youtube.util.downloadVideo(link, path.join(app.getAppPath(), "../assets/videos"), {format: "mp4"})
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

ipcMain.handle("extract-subtitles", async (event, videoFile) => {
    if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
    const name = path.basename(videoFile, path.extname(videoFile))
    const vidDest = path.join(app.getAppPath(), `../assets/subtitles`)
    if (!fs.existsSync(vidDest)) fs.mkdirSync(vidDest, {recursive: true})
    const newDest = path.join(vidDest, `./${name}.vtt`)
    return new Promise<string>((resolve, reject) => {
        ffmpeg(path.normalize(videoFile).replaceAll("\\", "/"))
        .save(newDest)
        .on("end", () => {
            resolve(newDest)
        })
        .on("error", () => reject())
    }).catch(() => "")
})

ipcMain.handle("get-reverse-src", async (event, videoFile: string) => {
  const ext = path.extname(videoFile)
  const name = path.basename(videoFile, ext)
  const vidDest = path.join(app.getAppPath(), `../assets/videos/`)
  const newDest = path.join(vidDest, `./${name}_reverse${ext}`)
  if (fs.existsSync(newDest)) return newDest
  return null
})

ipcMain.handle("reverse-audio", async (event, videoFile: string) => {
    if (videoFile.startsWith("file:///")) videoFile = videoFile.replace("file:///", "")
    const ext = path.extname(videoFile)
    const name = path.basename(videoFile, ext)
    const vidDest = path.join(app.getAppPath(), `../assets/videos/`)
    const newDest = path.join(vidDest, `./${name}_reverse${ext}`)

    if (!fs.existsSync(vidDest)) fs.mkdirSync(vidDest, {recursive: true})

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
      {name: "Video", extensions: ["mp4", "webm", "mkv", "mov", "avi", "m4v"]},
      {name: "Audio", extensions: ["mp3", "wav", "ogg"]}
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
  return store.get("os", "mac")
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
    {label: "Unlock Aspect Ratio", click: () => window.setAspectRatio(0)},
    {type: "separator"},
    {label: "Copy Loop", click: () => event.sender.send("copy-loop")},
    {label: "Paste Loop", click: () => event.sender.send("paste-loop")},
    {type: "separator"},
    {label: "Clear Cache", click: () => {
      const videoPath = path.join(app.getAppPath(), `../assets/videos`)
      const subtitlePath = path.join(app.getAppPath(), `../assets/subtitles`)
      mainFunctions.removeDirectory(videoPath)
      mainFunctions.removeDirectory(subtitlePath)
      event.sender.send("cache-cleared")
    }}
  ]

  const menu = Menu.buildFromTemplate(template)
  const window = BrowserWindow.fromWebContents(event.sender)
  if (window) menu.popup({window})
})

const applicationMenu = () =>  {
  const template: MenuItemConstructorOptions[] = [
    {role: "appMenu"},
    {
      label: "File",
      submenu: [
        {
          label: "Open", 
          accelerator: "CmdOrCtrl+O",
          click: (item, window) => {
            const win = window as BrowserWindow
            win.webContents.send("upload-file")
          }
        },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: (item, window) => {
            const win = window as BrowserWindow
            win?.webContents.send("trigger-download")
          }
        }
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
        {
          label: "Lock Aspect Ratio",
          click: (item, window) => {
            const win = window as BrowserWindow
            win?.webContents.send("trigger-resize")
          }
        },
        {
          label: "Unlock Aspect Ratio",
          click: (item, window) => {
            const win = window as BrowserWindow
            win.setAspectRatio(0)
          }
        }
      ]
    },
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
    window = new BrowserWindow({width: 900, height: 650, minWidth: 520, minHeight: 250, transparent: true, hasShadow: false, 
      frame: false, show: false, backgroundColor: "#00000000", center: true, webPreferences: {
      preload: path.join(__dirname, "../preload/index.js")}})
    window.loadFile(path.join(__dirname, "../renderer/index.html"))
    applicationMenu()
    window.removeMenu()
    openFile()
    //if (ffmpegPath && process.platform !== "win32") fs.chmodSync(ffmpegPath, "777")
    window.webContents.on("did-finish-load", () => {
      window?.show()
    })
    window.on("closed", () => {
      window = null
    })
  })
}