import fs from "fs"
import path from "path"
import child_process from "child_process"

const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"]

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

    public static getSortedFiles = async (dir: string) => {
        const files = await fs.promises.readdir(dir)
        return files
            .filter((f) => videoExtensions.includes(path.extname(f)))
            .map(fileName => ({
                name: fileName,
                time: fs.statSync(`${dir}/${fileName}`).mtime.getTime(),
            }))
            .sort((a, b) => b.time - a.time)
            .map(file => file.name)
    }

    public static getNodePath = () => {
        const exists = (path: string) => fs.existsSync(path)

        if (process.platform === "win32") {
            const winPaths = [
                "C:\\Program Files\\nodejs\\node.exe",
                "C:\\Program Files (x86)\\nodejs\\node.exe"
            ]
            return winPaths.find(exists) ?? "node"
        } else if (process.platform === "darwin") {
            const macPaths = [
                "/opt/homebrew/bin/node",
                "/usr/local/bin/node"
            ]
            return macPaths.find(exists) ?? "node"
        } else {
            const linuxPaths = [
                "/usr/bin/node",
                "/usr/local/bin/node"
            ]
            return linuxPaths.find(exists) ?? "node"
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