import React, {useEffect, useState} from "react"
import functions from "../structures/functions"
import "./styles/exportdialog.less"

const ExportDialog: React.FunctionComponent = (props) => {
    const [visible, setVisible] = useState(false)
    const [percent, setPercent] = useState(0)
    const [timemark, setTimemark] = useState(0)
    const [duration, setDuration] = useState(0)

    useEffect(() => {
        const showExportDialog = (event: any, visible: boolean) => {
            setVisible(visible)
            setPercent(0)
            setTimemark(0)
            setDuration(0)
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            // if (ignore !== "export") setVisible(false)
        }
        const exportProgress = (event: any, progress: any) => {
            setPercent((functions.parseSeconds(progress.timemark) / progress.duration) * 100)
            setTimemark(functions.parseSeconds(progress.timemark))
            setDuration(progress.duration)
        }
        window.ipcRenderer.on("show-export-dialog", showExportDialog)
        window.ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        window.ipcRenderer.on("export-progress", exportProgress)
        return () => {
            window.ipcRenderer.removeListener("show-export-dialog", showExportDialog)
            window.ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
            window.ipcRenderer.removeListener("export-progress", exportProgress)
        }
    }, [])

    if (visible) {
        return (
            <section className="export-dialog">
                <div className="export-dialog-box">
                    <div className="export-container">
                        <p className="export-dialog-text">Exporting video... {percent.toFixed(0)}%</p>
                        {timemark ?
                        <p className="export-dialog-text">{functions.formatSeconds(timemark)}/{functions.formatSeconds(duration)}</p> 
                        : null}
                    </div>
                </div>
            </section>
        )
    }
    return null
}

export default ExportDialog