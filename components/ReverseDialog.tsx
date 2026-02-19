import React, {useEffect, useState} from "react"
import "./styles/reversedialog.less"

const ReverseDialog: React.FunctionComponent = (props) => {
    const [visible, setVisible] = useState(false)
    const [current, setCurrent] = useState(0)
    const [total, setTotal] = useState(0)

    useEffect(() => {
        const showReverseDialog = (event: any, visible: boolean) => {
            setVisible(visible)
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            // if (ignore !== "reverse") setVisible(false)
        }
        const reverseProgress = (event: any, progress: any) => {
            setCurrent(progress.current)
            setTotal(progress.total)
        }
        window.ipcRenderer.on("show-reverse-dialog", showReverseDialog)
        window.ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        window.ipcRenderer.on("reverse-progress", reverseProgress)
        return () => {
            window.ipcRenderer.removeListener("show-reverse-dialog", showReverseDialog)
            window.ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
            window.ipcRenderer.removeListener("reverse-progress", reverseProgress)
        }
    }, [])

    if (visible) {
        return (
            <section className="reverse-dialog">
                <div className="reverse-dialog-box">
                    <div className="reverse-container">
                        <p className="reverse-dialog-text">Reversing video...</p>
                        {total ?
                        <p className="reverse-dialog-text">{current}/{total}</p>
                         : null}
                    </div>
                </div>
            </section>
        )
    }
    return null
}

export default ReverseDialog