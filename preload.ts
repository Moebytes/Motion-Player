import {contextBridge, ipcRenderer, clipboard, app, IpcRendererEvent} from "electron"

type SystemPath = "home" | "appData" | "userData" | "cache" | "temp" | "exe" | "module" 
  | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos" | "recent" 
  | "logs" | "pepperFlashSystemPlugin" | "crashDumps"

declare global {
  interface Window {
    platform: "mac" | "windows",
    ipcRenderer: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
      send: (channel: string, ...args: any[]) => void
      on: (channel: string, listener: (...args: any[]) => void) => any
      removeListener: (channel: string, listener: (...args: any[]) => void) => void
    },
    clipboard: {
        readText: () => string
        writeText: (text: string) => void
        clear: () => void
    },
    app: {
      getPath: (location: SystemPath) => string
    }
  }
}

contextBridge.exposeInMainWorld("ipcRenderer", {
    invoke: async (channel: string, ...args: any[]) => {
            return ipcRenderer.invoke(channel, ...args)
    },
    send: (channel: string, ...args: any[]) => {
        ipcRenderer.send(channel, ...args)
    },
    on: (channel: string, listener: (...args: any[]) => void) => {
        const subscription = (_event: IpcRendererEvent, ...args: any[]) =>
        listener(...args)

        ipcRenderer.on(channel, subscription)

        return subscription
    },
    removeListener: (channel: string, listener: (...args: any[]) => void) => {
        ipcRenderer.removeListener(channel, listener)
    }
})

contextBridge.exposeInMainWorld("clipboard", {
    readText: () => clipboard.readText(),
    writeText: (text: string) => clipboard.writeText(text),
    clear: () => clipboard.clear()
})

contextBridge.exposeInMainWorld("app", {
    getPath: (location: SystemPath) => app.getPath(location)
})

contextBridge.exposeInMainWorld("platform", process.platform === "darwin" ? "mac" : "windows")