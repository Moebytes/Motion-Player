/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Frame Player - A cute video player ❤                     *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import fs from "fs"
import path from "path"
import child_process from "child_process"
import {dialog} from "electron"

const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"]
const animationExtensions = [".gif", ".webp", ".apng", ".png", ".zip"]

export default class MainFunctions {
    public static spawn = async (file: string, args: string[]): 
        Promise<{stdout: string, stderr: string, code?: number}> => {
            return new Promise((resolve, reject) => {
                const child = child_process.spawn(file, args, {windowsHide: true})

                let stdout = ""
                let stderr = ""

                child.stdout.on("data", (data) => {
                    stdout += data.toString()
                })

                child.stderr.on("data", (data) => {
                    stderr += data.toString()
                })

                child.on("error", (err) => {
                    reject(err)
                })

                child.on("close", (code) => {
                    if (code === 0) {
                        resolve({stdout, stderr})
                    } else {
                        reject({stdout, stderr, code})
                    }
                })
        })
    }

    public static getSortedFiles = async (dir: string, window: Electron.BrowserWindow) => {
        const accepted = [...videoExtensions, ".gif", ".apng"]

        let files = [] as string[]
        try {
            files = await fs.promises.readdir(dir)
        } catch {
            const result = await dialog.showOpenDialog(window, {
                defaultPath: dir,
                properties: ["createDirectory", "openDirectory"]
            })
            dir = result.filePaths[0]
            if (!dir) return []
            files = await fs.promises.readdir(dir)
        }

        const validFiles = await Promise.all(files.map(async (fileName: string) => {
            const ext = path.extname(fileName)
            if (!accepted.includes(ext)) return null

            const filePath = path.join(dir, fileName)

            const stats = await fs.promises.stat(filePath)
            return {name: fileName, time: stats.mtime.getTime()}
        }))

        return validFiles
            .filter((file): file is {name: string; time: number} => file !== null)
            .sort((a, b) => b.time - a.time)
            .map(file => file.name)
    }

    public static copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, {recursive: true})

        for (const file of fs.readdirSync(src)) {
            const srcFile = path.join(src, file)
            const destFile = path.join(dest, file)

            if (fs.statSync(srcFile).isDirectory()) {
                MainFunctions.copyRecursive(srcFile, destFile)
            } else {
                fs.copyFileSync(srcFile, destFile)
            }
        }
    }

    public static removeDirectory = (dir: string) => {
        if (!fs.existsSync(dir)) return
        fs.readdirSync(dir).forEach((file: string) => {
            const current = path.join(dir, file)
            if (fs.lstatSync(current).isDirectory()) {
                MainFunctions.removeDirectory(current)
            } else {
                fs.unlinkSync(current)
            }
        })
        try {
            fs.rmdirSync(dir)
        } catch (e) {
            console.log(e)
        }
    }
}