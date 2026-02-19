import React, {useEffect, useRef, useState} from "react"
import {useFilterSelector} from "../store"
import Slider from "react-slider"
import functions from "../structures/functions"
import playButton from "../assets/icons/play.png"
import playButtonHover from "../assets/icons/play-hover.png"
import pauseButton from "../assets/icons/pause.png"
import pauseButtonHover from "../assets/icons/pause-hover.png"
import nextButton from "../assets/icons/next.png"
import nextButtonHover from "../assets/icons/next-hover.png"
import previousButton from "../assets/icons/previous.png"
import previousButtonHover from "../assets/icons/previous-hover.png"
import reverseButton from "../assets/icons/reverse.png"
import reverseButtonHover from "../assets/icons/reverse-hover.png"
import reverseActiveButton from "../assets/icons/reverse-active.png"
import speedButton from "../assets/icons/speed.png"
import speedButtonHover from "../assets/icons/speed-hover.png"
import speedActiveButton from "../assets/icons/speed-active.png"
import loopButton from "../assets/icons/loop.png"
import loopButtonHover from "../assets/icons/loop-hover.png"
import loopActiveButton from "../assets/icons/loop-active.png"
import abloopButton from "../assets/icons/abloop.png"
import abloopButtonHover from "../assets/icons/abloop-hover.png"
import abloopActiveButton from "../assets/icons/abloop-active.png"
import resetButton from "../assets/icons/clear.png"
import resetButtonHover from "../assets/icons/clear-hover.png"
import subtitleButton from "../assets/icons/sub.png"
import subtitleButtonHover from "../assets/icons/sub-hover.png"
import subtitleButtonActive from "../assets/icons/sub-active.png"
import fullscreenButton from "../assets/icons/fullscreen.png"
import fullscreenButtonHover from "../assets/icons/fullscreen-hover.png"
import volumeButton from "../assets/icons/volume.png"
import volumeButtonHover from "../assets/icons/volume-hover.png"
import volumeLowButton from "../assets/icons/volume-low.png"
import volumeLowButtonHover from "../assets/icons/volume-low-hover.png"
import muteButton from "../assets/icons/mute.png"
import muteButtonHover from "../assets/icons/mute-hover.png"
import rewindButton from "../assets/icons/rewind.png"
import rewindButtonHover from "../assets/icons/rewind-hover.png"
import fastForwardButton from "../assets/icons/fastforward.png"
import fastForwardButtonHover from "../assets/icons/fastforward-hover.png"
import {useDropzone} from "react-dropzone"
import placeholder from "../assets/images/placeholder.png"
import path from "path"
import "./styles/videoplayer.less"

const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"]
const audioExtensions = [".mp3", ".wav", ".ogg"]

const VideoPlayer: React.FunctionComponent = (props) => {
    const playerRef = useRef(null) as React.RefObject<HTMLDivElement>
    const videoRef = useRef(null) as React.RefObject<HTMLVideoElement>
    const speedBar = useRef(null) as React.RefObject<HTMLInputElement>
    const speedPopup = useRef(null) as React.RefObject<HTMLDivElement>
    const speedImg = useRef(null) as React.RefObject<HTMLImageElement>
    const videoFilterRef = useRef(null) as React.RefObject<HTMLDivElement>
    const videoLightnessRef = useRef(null) as React.RefObject<HTMLImageElement>
    const videoSharpnessRef = useRef(null) as React.RefObject<HTMLCanvasElement>
    const videoPixelateRef = useRef(null) as React.RefObject<HTMLCanvasElement>
    const {brightness, contrast, hue, saturation, lightness, blur, sharpen, pixelate} = useFilterSelector()
    const [hover, setHover] = useState(false)
    const [hoverBar, setHoverBar] = useState(false)
    const [playHover, setPlayHover] = useState(false)
    const [fastForwardHover, setFastforwardHover] = useState(false)
    const [rewindHover, setRewindHover] = useState(false)
    const [reverseHover, setReverseHover] = useState(false)
    const [speedHover, setSpeedHover] = useState(false)
    const [loopHover, setLoopHover] = useState(false)
    const [abloopHover, setABLoopHover] = useState(false)
    const [resetHover, setResetHover] = useState(false)
    const [subtitleHover, setSubtitleHover] = useState(false)
    const [volumeHover, setVolumeHover] = useState(false)
    const [fullscreenHover, setFullscreenHover] = useState(false)
    const [nextHover, setNextHover] = useState(false)
    const [previousHover, setPreviousHover] = useState(false)
    const [backFrame, setBackFrame] = useState(null) as any
    const [videoLoaded, setVideoLoaded] = useState(false)
    const [subtitlesLoaded, setSubtitlesLoaded] = useState(false)
    const [subtitleText, setSubtitleText] = useState("")
    const abSlider = useRef(null) as any

    const initialState = {
        forwardSrc: null as any,
        reverseSrc: null as any,
        subtitleSrc: null as any,
        reverse: false,
        speed: 1,
        preservesPitch: true,
        progress: 0,
        duration: 0,
        prevVolume: 1,
        volume: 1,
        paused: false,
        subtitles: false,
        loop: false,
        abloop: false,
        loopStart: 0,
        loopEnd: 100,
        savedLoop: [0, 100],
        dragging: false,
        dragProgress: 0,
        audio: false
    }

    const [state, setState] = useState(initialState)

    useEffect(() => {
        const getOpenedFile = async () => {
            const file = await window.ipcRenderer.invoke("get-opened-file")
            if (file) upload(file)
        }
        getOpenedFile()
        const openFile = (event: any, file: string) => {
            if (file) upload(file)
        }
        const uploadFile = () => {
            upload()
        }
        const onClick = (event: any) => {
            if (speedPopup.current?.style.display === "flex") {
                if (!(speedPopup.current?.contains(event.target) || speedImg.current?.contains(event.target))) {
                    if (event.target !== speedPopup.current) speedPopup.current!.style.display = "none"
                }
            }
        }
        const openLink = async (event: any, link: string) => {
            if (link) {
                let video = link
                if (link.includes("youtube.com") || link.includes("youtu.be")) {
                    video = await window.ipcRenderer.invoke("download-yt-video", link)
                }
                upload(video)
            }
        }
        abSlider.current.slider.style.display = "none"
        initState()
        window.ipcRenderer.on("open-file", openFile)
        window.ipcRenderer.on("upload-file", uploadFile)
        window.ipcRenderer.on("open-link", openLink)
        window.addEventListener("click", onClick)
        return () => {
            window.ipcRenderer.removeListener("open-file", openFile)
            window.ipcRenderer.removeListener("upload-file", uploadFile)
            window.ipcRenderer.removeListener("open-link", openLink)
            window.removeEventListener("click", onClick)
            window.clearInterval(undefined)
        }
    }, [])

    const initState = async () => {
        let newState = {}
        const saved = await window.ipcRenderer.invoke("get-state")
        if (saved.speed !== undefined) {
            newState = {...newState, speed: saved.speed}
            videoRef.current!.playbackRate = saved.speed
        }
        if (saved.preservesPitch !== undefined) {
            newState = {...newState, preservesPitch: saved.preservesPitch}
            // @ts-ignore
            videoRef.current!.preservesPitch = saved.preservesPitch
        }
        if (saved.loop !== undefined) {
            newState = {...newState, loop: saved.loop}
            videoRef.current!.loop = saved.loop
        }
        setState((prev) => {
            return {...prev, ...newState}
        })
    }

    useEffect(() => {
        const timeUpdate = () => {
            let progress = 0
            let duration = 0
            if (videoRef.current) {
                progress = videoRef.current.currentTime / videoRef.current.playbackRate
                duration = videoRef.current.duration / videoRef.current.playbackRate
                if (state.abloop) {
                    const current = videoRef.current.currentTime
                    const start = state.reverse ? (videoRef.current.duration / 100) * (100 - state.loopStart) : (videoRef.current.duration / 100) * state.loopStart
                    const end = state.reverse ? (videoRef.current.duration / 100) * (100 - state.loopEnd) : (videoRef.current.duration / 100) * state.loopEnd
                    if (state.reverse) {
                        if (current > start || current < end) {
                            videoRef.current.currentTime = end
                            if (!state.dragging) {
                                setState((prev) => {
                                    return {...prev, progress: end}
                                })
                            }
                        }
                    } else {
                        if (current < start || current > end) {
                            videoRef.current.currentTime = start
                            if (!state.dragging) {
                                setState((prev) => {
                                    return {...prev, progress: start}
                                })
                            }
                        }
                    }
                }
            }
            if (!state.dragging) {
                setState((prev) => {
                    return {...prev, progress, duration}
                })
            }
        }
        if (state.subtitles) {
            videoRef.current!.textTracks[0].mode = "showing"
        } else {
            videoRef.current!.textTracks[0].mode = "hidden"
        }
        if (hover) {
            document.documentElement.style.setProperty("--subtitle-transform", "translateY(-80px)")
        } else {
            document.documentElement.style.setProperty("--subtitle-transform", "translateY(0)")
        }
        const onEnd = () => {
            setState((prev) => {
                return {...prev, paused: true}
            })
        }
        const triggerDownload = () => {
            download()
        }
        const keyDown = (event: KeyboardEvent) => {
            if (event.shiftKey) {
                event.preventDefault()
                speedBar.current!.step = "0.01"
            }
            if (event.code === "Space") {
                event.preventDefault()
                play()
            }
            if (event.key === "ArrowLeft") {
                event.preventDefault()
                rewind(1)
            }
            if (event.key === "ArrowRight") {
                event.preventDefault()
                fastforward(1)
            }
            if (event.key === "ArrowUp") {
                event.preventDefault()
                volume(state.volume + 0.05)
            }
            if (event.key === "ArrowDown") {
                event.preventDefault()
                volume(state.volume - 0.05)
            }
        }
        const keyUp = (event: KeyboardEvent) => {
            if (!event.shiftKey) {
                if (Number(speedBar.current!.value) % 0.5 !== 0) speedBar.current!.value = String(functions.round(Number(speedBar.current!.value), 0.5))
                speedBar.current!.step = "0.5"
            }
        }
        const wheel = (event: WheelEvent) => {
            event.preventDefault()
            const delta = Math.sign(event.deltaY)
            volume(state.volume - delta * 0.05)
        }
        const copyLoop = () => {
            if (state.abloop && state.loopEnd) {
                setState((prev) => {
                    return {...prev, savedLoop: [state.loopStart, state.loopEnd]}
                })
            }
        }
        const pasteLoop = () => {
            if (!state.abloop) toggleAB(true)
            abloop(state.savedLoop)
            setState((prev) => {
                return {...prev, loopStart: state.savedLoop[0], loopEnd: state.savedLoop[1]}
            })
        }
        saveState()
        videoRef.current!.addEventListener("timeupdate", timeUpdate)
        videoRef.current!.addEventListener("ended", onEnd)
        window.ipcRenderer.on("trigger-download", triggerDownload)
        window.ipcRenderer.on("copy-loop", copyLoop)
        window.ipcRenderer.on("paste-loop", pasteLoop)
        window.addEventListener("keydown", keyDown)
        window.addEventListener("keyup", keyUp)
        window.addEventListener("wheel", wheel)
        return () => {
            videoRef.current!.removeEventListener("timeupdate", timeUpdate)
            videoRef.current!.removeEventListener("ended", onEnd)
            window.ipcRenderer.removeListener("trigger-download", triggerDownload)
            window.ipcRenderer.removeListener("copy-loop", copyLoop)
            window.ipcRenderer.removeListener("paste-loop", pasteLoop)
            window.removeEventListener("keydown", keyDown)
            window.removeEventListener("keyup", keyUp)
            window.removeEventListener("wheel", wheel)
        }
    })

    useEffect(() => {
        if (!abSlider.current) return
        if (state.abloop) {
            abSlider.current.slider.style.display = "flex"
        } else {
            abSlider.current.slider.style.display = "none"
        }
    }, [state.abloop])

    useEffect(() => {
        const parseVideo = async () => {
            if (backFrame) return 
            const thumb = await functions.videoThumbnail(state.forwardSrc)
            setBackFrame(thumb)
        }
        if (videoLoaded) parseVideo()
    }, [videoLoaded])

    useEffect(() => {
        const element = videoFilterRef.current
        let newContrast = contrast
        const video = videoRef.current
        const sharpenOverlay = videoSharpnessRef.current
        const lightnessOverlay = videoLightnessRef.current
        if (!element || !video || !lightnessOverlay || !sharpenOverlay) return
        if (sharpen !== 0) {
            const sharpenOpacity = sharpen / 5
            newContrast += 25 * sharpenOpacity
            sharpenOverlay.style.backgroundImage = `url(${video.src})`
            sharpenOverlay.style.filter = `blur(4px) invert(1) contrast(75%)`
            sharpenOverlay.style.mixBlendMode = "overlay"
            sharpenOverlay.style.opacity = `${sharpenOpacity}`
        } else {
            sharpenOverlay.style.backgroundImage = "none"
            sharpenOverlay.style.filter = "none"
            sharpenOverlay.style.mixBlendMode = "normal"
            sharpenOverlay.style.opacity = "0"
        }
        if (lightness !== 100) {
            const filter = lightness < 100 ? "brightness(0)" : "brightness(0) invert(1)"
            lightnessOverlay.style.filter = filter
            lightnessOverlay.style.opacity = `${Math.abs((lightness - 100) / 100)}`
        } else {
            lightnessOverlay.style.filter = "none"
            lightnessOverlay.style.opacity = "0"
        }
        element.style.filter = `brightness(${brightness}%) contrast(${newContrast}%) hue-rotate(${hue - 180}deg) saturate(${saturation}%) blur(${blur}px)`
    }, [brightness, contrast, hue, saturation, lightness, blur, sharpen])



    useEffect(() => {
        let id = 0
        let timeout = null as any
        const animationLoop = async () => {
            if (videoLoaded && videoRef.current) {
                videoRef.current.style.opacity = "0"
                videoRef.current.playbackRate = state.speed 
                const pixelateCanvas = videoPixelateRef.current
                if (pixelateCanvas) pixelateCanvas.style.opacity = "1"
                const pixelateCtx = pixelateCanvas?.getContext("2d")
                const sharpenOverlay = videoSharpnessRef.current
                let sharpenCtx = sharpenOverlay?.getContext("2d")
                let frame = videoRef.current
    
                const draw = () => {
                    if (videoRef.current && sharpenOverlay && pixelateCanvas && videoLightnessRef.current) {
                        const landscape = videoRef.current.videoWidth > videoRef.current.videoHeight
                        if (landscape) {
                            const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight
                            videoSharpnessRef.current.width = videoRef.current.clientWidth
                            videoSharpnessRef.current.height = Math.floor(videoRef.current.clientWidth / aspectRatio)
                            videoPixelateRef.current.width = videoRef.current.clientWidth
                            videoPixelateRef.current.height = Math.floor(videoRef.current.clientWidth / aspectRatio)
                            videoLightnessRef.current.width = videoRef.current.clientWidth
                            videoLightnessRef.current.height = Math.floor(videoRef.current.clientWidth / aspectRatio)
                            const margin = Math.floor((videoRef.current!.clientHeight - (videoRef.current.clientWidth / aspectRatio)) / 4)
                            pixelateCanvas.style.marginTop = `${margin}px`
                            sharpenOverlay.style.marginTop = `${margin}px`
                            videoLightnessRef.current.style.marginTop = `${margin}px`
                            pixelateCanvas.style.marginLeft = "0px"
                            sharpenOverlay.style.marginLeft = "0px"
                            videoLightnessRef.current.style.marginLeft = "0px"
                        } else {
                            const aspectRatio = videoRef.current.videoHeight / videoRef.current.videoWidth
                            videoSharpnessRef.current.height = videoRef.current.clientHeight
                            videoSharpnessRef.current.width = Math.floor(videoRef.current.clientHeight / aspectRatio)
                            videoPixelateRef.current.height = videoRef.current.clientHeight
                            videoPixelateRef.current.width = Math.floor(videoRef.current.clientHeight / aspectRatio)
                            videoLightnessRef.current.height = videoRef.current.clientHeight
                            videoLightnessRef.current.width = Math.floor(videoRef.current.clientHeight / aspectRatio)
                            const margin = Math.floor((videoRef.current!.clientWidth - (videoRef.current.clientHeight / aspectRatio)) / 2)
                            pixelateCanvas.style.marginLeft = `${margin}px`
                            sharpenOverlay.style.marginLeft = `${margin}px`
                            videoLightnessRef.current.style.marginLeft = `${margin}px`
                            pixelateCanvas.style.marginTop = "0px"
                            sharpenOverlay.style.marginTop = "0px"
                            videoLightnessRef.current.style.marginTop = "0px"
                        }
                    }
                    if (sharpenOverlay) {
                        if (sharpen !== 0) {
                            const sharpenOpacity = sharpen / 5
                            sharpenOverlay.style.filter = `blur(4px) invert(1) contrast(75%)`
                            sharpenOverlay.style.mixBlendMode = "overlay"
                            sharpenOverlay.style.opacity = `${sharpenOpacity}`
                            sharpenCtx?.clearRect(0, 0, sharpenOverlay.width, sharpenOverlay.height)
                            sharpenCtx?.drawImage(frame, 0, 0, sharpenOverlay.width, sharpenOverlay.height)
                        } else {
                            sharpenOverlay.style.filter = "none"
                            sharpenOverlay.style.mixBlendMode = "normal"
                            sharpenOverlay.style.opacity = "0"
                        }
                    }
                    if (pixelateCanvas) {
                        if (pixelate !== 1) {
                            const pixelWidth = pixelateCanvas.width / pixelate
                            const pixelHeight = pixelateCanvas.height / pixelate
                            pixelateCtx?.clearRect(0, 0, pixelateCanvas.width, pixelateCanvas.height)
                            pixelateCtx?.drawImage(frame, 0, 0, pixelWidth, pixelHeight)
                            const landscape = pixelateCanvas.width >= pixelateCanvas.height
                            if (landscape) {
                                pixelateCanvas.style.width = `${pixelateCanvas.width * pixelate}px`
                                pixelateCanvas.style.height = "auto"
                            } else {
                                pixelateCanvas.style.width = "auto"
                                pixelateCanvas.style.height = `${pixelateCanvas.height * pixelate}px`
                            }
                            pixelateCanvas.style.imageRendering = "pixelated"
                        } else {
                            pixelateCanvas.style.width = `${pixelateCanvas.width}px`
                            pixelateCanvas.style.height = `${pixelateCanvas.height}px`
                            pixelateCanvas.style.imageRendering = "none"
                            pixelateCtx?.clearRect(0, 0, pixelateCanvas.width, pixelateCanvas.height)
                            pixelateCtx?.drawImage(frame, 0, 0, pixelateCanvas.width, pixelateCanvas.height)
                        }
                    }
                }
    
                const videoLoop = async () => {
                    draw()
                    await new Promise<void>((resolve) => {
                        // @ts-ignore
                        if (videoRef.current?.requestVideoFrameCallback) {
                            // @ts-ignore
                            id = videoRef.current?.requestVideoFrameCallback(() => resolve())
                        } else {
                            id = window.requestAnimationFrame(() => resolve())
                        }
                    }).then(videoLoop)
                }
                videoLoop()
            }
        }
        animationLoop()
        return () => {
            clearTimeout(timeout)
            // @ts-ignore
            if (videoRef.current?.cancelVideoFrameCallback) {
                // @ts-ignore
                videoRef.current?.cancelVideoFrameCallback(id)
            } else {
                window.cancelAnimationFrame(id)
            }
        }
    }, [videoLoaded, sharpen, pixelate, lightness, state.speed])

    const resizeOverlay = () => {
        if (!videoRef.current || !videoSharpnessRef.current || !videoPixelateRef.current || !videoLightnessRef.current) return
        if (videoRef.current.clientWidth === 0) return
        const landscape = videoRef.current.videoWidth > videoRef.current.videoHeight
        if (landscape) {
            const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight
            videoSharpnessRef.current.width = videoRef.current.clientWidth
            videoSharpnessRef.current.height = Math.floor(videoRef.current.clientWidth / aspectRatio)
            videoPixelateRef.current.width = videoRef.current.clientWidth
            videoPixelateRef.current.height = Math.floor(videoRef.current.clientWidth / aspectRatio)
            videoLightnessRef.current.width = videoRef.current.clientWidth
            videoLightnessRef.current.height = Math.floor(videoRef.current.clientWidth / aspectRatio)
        } else {
            const aspectRatio = videoRef.current.videoHeight / videoRef.current.videoWidth
            videoSharpnessRef.current.height = videoRef.current.clientHeight
            videoSharpnessRef.current.width = Math.floor(videoRef.current.clientHeight / aspectRatio)
            videoPixelateRef.current.height = videoRef.current.clientHeight
            videoPixelateRef.current.width = Math.floor(videoRef.current.clientHeight / aspectRatio)
            videoLightnessRef.current.height = videoRef.current.clientHeight
            videoLightnessRef.current.width = Math.floor(videoRef.current.clientHeight / aspectRatio)
        }
    }

    useEffect(() => {
        const element = videoRef.current
        new ResizeObserver(resizeOverlay).observe(element!)
    }, [])

    useEffect(() => {
        if (!subtitlesLoaded) return
        setTimeout(() => {
            const track = videoRef.current?.textTracks[0]
            if (!track || !track.cues?.length) return
            track.mode = "hidden"
            for (let i = 0; i < track.cues?.length; i++) {
                const cue = track.cues[i]
                cue.onenter = () => {
                    // @ts-ignore
                    setSubtitleText(functions.cleanHTML(cue.text))
                }
                cue.onexit = () => {
                    setSubtitleText("")
                }
            }
        }, 1000)
    }, [subtitlesLoaded])

    const refreshState = () => {
        speed(state.speed)
        preservesPitch(state.preservesPitch)
        if (state.abloop) abloop([state.loopStart, state.loopEnd])
    }

    const saveState = () => {
        window.ipcRenderer.invoke("save-state", {reverse: state.reverse, speed: state.speed, preservesPitch: state.preservesPitch, loop: state.loop, abloop: state.abloop, loopStart: state.loopStart, loopEnd: state.loopEnd})
    }

    const upload = async (file?: string) => {
        if (!file) file = await window.ipcRenderer.invoke("select-file")
        if (!file) return
        if (!videoExtensions.includes(path.extname(file)) && !audioExtensions.includes(path.extname(file))) return
        let sizeImg = file
        if (audioExtensions.includes(path.extname(file))) {
            sizeImg = placeholder
            setState((prev) => {
                return {...prev, audio: true}
            })
        } else {
            setState((prev) => {
                return {...prev, audio: false}
            })
        }
        if (path.extname(file) === ".mov") file = await window.ipcRenderer.invoke("mov-to-mp4", file) as string
        setVideoLoaded(false)
        setSubtitlesLoaded(false)
        videoRef.current!.src = file
        videoRef.current!.currentTime = 0
        videoRef.current!.play()
        setState((prev) => {
            return {...prev, forwardSrc: file, reverseSrc: null, reverse: false, paused: false}
        })
        refreshState()
        window.ipcRenderer.invoke("resize-window", sizeImg)
        window.ipcRenderer.invoke("extract-subtitles", file).then((subtitles) => {
            if (subtitles) {
                setState((prev) => {
                    return {...prev, subtitleSrc: subtitles}
                })
                setSubtitlesLoaded(true)
            } else {
                setState((prev) => {
                    return {...prev, subtitles: false}
                })
            }
        })
        window.ipcRenderer.invoke("get-reverse-src", file).then((reverseSrc) => {
            if (reverseSrc) {
                setState((prev) => {
                    return {...prev, reverseSrc}
                })
            }
        })
    }

    const play = () => {
        if (videoRef.current!.paused) {
            videoRef.current!.play()
            setState((prev) => {
                return {...prev, paused: false}
            })
        } else {
            videoRef.current!.pause()
            setState((prev) => {
                return {...prev, paused: true}
            })
        }
    }

    const reverse = async () => {
        if (!state.reverseSrc) {
            videoRef.current?.pause()
            setState((prev) => {
                return {...prev, paused: true}
            })
            window.ipcRenderer.invoke("reverse-dialog", true)
            await new Promise<void>((resolve) => {
                window.ipcRenderer.invoke("reverse-video", state.forwardSrc).then((reversed) => {
                    window.ipcRenderer.invoke("reverse-dialog", false)
                    let percent = videoRef.current!.currentTime / videoRef.current!.duration
                    const newTime = (1-percent) * videoRef.current!.duration
                    videoRef.current!.src = reversed
                    videoRef.current!.currentTime = newTime
                    videoRef.current!.play()
                    refreshState()
                    setState((prev) => {
                        return {...prev, reverseSrc: reversed, reverse: true, paused: false}
                    })
                    resolve()
                })
            })
            return
        }
        if (state.reverse) {
            let percent = videoRef.current!.currentTime / videoRef.current!.duration
            const newTime = (1-percent) * videoRef.current!.duration
            videoRef.current!.src = state.forwardSrc
            videoRef.current!.currentTime = newTime
            videoRef.current!.play()
            refreshState()
            setState((prev) => {
                return {...prev, reverse: false}
            })
        } else {
            let percent = videoRef.current!.currentTime / videoRef.current!.duration
            const newTime = (1-percent) * videoRef.current!.duration
            videoRef.current!.src = state.reverseSrc
            videoRef.current!.currentTime = newTime
            videoRef.current!.play()
            refreshState()
            setState((prev) => {
                return {...prev, reverse: true}
            })
        }
        setState((prev) => {
            return {...prev, paused: false}
        })
    }

    const speed = (value?: number | string) => {
        videoRef.current!.playbackRate = Number(value)
        setState((prev) => {
            return {...prev, speed: Number(value)}
        })
    }

    const preservesPitch = (value?: boolean) => {
        const preservesPitch = value !== undefined ? value : !state.preservesPitch
        // @ts-ignore
        videoRef.current!.preservesPitch = preservesPitch
        setState((prev) => {
            return {...prev, preservesPitch}
        })
    }

    const seek = (position: number) => {
        const progress = state.reverse ? (videoRef.current!.duration / 100) * (100 - position) : (videoRef.current!.duration / 100) * position
        videoRef.current!.currentTime = progress
        setState((prev) => {
            return {...prev, progress, dragging: false}
        })
    }

    const volume = (value: number) => {
        if (value < 0) value = 0
        if (value > 1) value = 1
        videoRef.current!.volume = value
        setState((prev) => {
            return {...prev, volume: value, prevVolume: value}
        })
    }

    const volumeIcon = () => {
        if (state.volume > 0.5) {
            if (volumeHover) return volumeButtonHover
            return volumeButton
        } else if (state.volume > 0) {
            if (volumeHover) return volumeLowButtonHover
            return volumeLowButton
        } else {
            if (volumeHover) return muteButtonHover
            return muteButton
        }
    }

    const mute = () => {
        if (videoRef.current!.volume > 0) {
            videoRef.current!.volume = 0
            setState((prev) => {
                return {...prev, volume: 0}
            })
        } else {
            const newVol = state.prevVolume ? state.prevVolume : 1
            videoRef.current!.volume = newVol
            setState((prev) => {
                return {...prev, volume: newVol}
            })
        }
    }

    const fullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen()
        } else {
            playerRef.current?.requestFullscreen()
        }
    }

    const loop = (value?: boolean) => {
        const toggle = value !== undefined ? value : !state.loop
        videoRef.current!.loop = toggle
        setState((prev) => {
            return {...prev, loop: toggle}
        })
    }

    const reset = () => {
        const {forwardSrc, reverseSrc, subtitleSrc, subtitles, volume, prevVolume, audio} = state
        videoRef.current!.playbackRate = 1
        // @ts-ignore
        videoRef.current!.preservesPitch = true
        videoRef.current!.src = forwardSrc
        videoRef.current!.currentTime = 0
        videoRef.current!.play()
        setState(initialState)
        setState((prev) => {
            return {...prev, forwardSrc, reverseSrc, subtitleSrc, subtitles, volume, prevVolume, audio}
        })
    }

    const subtitles = () => {
        setState((prev) => {
            return {...prev, subtitles: !prev.subtitles}
        })
    }

    const abloop = (value: number[]) => {
        const loopStart = value[0]
        const loopEnd = value[1]
        const current = videoRef.current!.currentTime
        const start = state.reverse ? (videoRef.current!.duration / 100) * (100 - loopStart) : (videoRef.current!.duration / 100) * loopStart
        const end = state.reverse ? (videoRef.current!.duration / 100) * (100 - loopEnd) : (videoRef.current!.duration / 100) * loopEnd
        if (state.reverse) {
            if (current > start || current < end) {
                videoRef.current!.currentTime = end
                setState((prev) => {
                    return {...prev, progress: end}
                })
            }
        } else {
            if (current < start || current > end) {
                videoRef.current!.currentTime = start
                setState((prev) => {
                    return {...prev, progress: start}
                })
            }
        }
        setState((prev) => {
            return {...prev, loopStart, loopEnd, dragging: false}
        })
    }

    const toggleAB = (value?: boolean) => {
        const abloop = value !== undefined ? value : !state.abloop
        setState((prev) => {
            return {...prev, abloop}
        })
    }

    const rewind = (value?: number) => {
        if (!value) value = 10
        let newTime = state.reverse ? videoRef.current!.currentTime + value : videoRef.current!.currentTime - value
        if (newTime < 0) newTime = 0
        if (newTime > videoRef.current!.duration) newTime = videoRef.current!.duration
        videoRef.current!.currentTime = newTime
        setState((prev) => {
            return {...prev, progress: newTime}
        })
    }

    const fastforward = (value?: number) => {
        if (!value) value = 10
        let newTime = state.reverse ? videoRef.current!.currentTime - value : videoRef.current!.currentTime + value
        if (newTime < 0) newTime = 0
        if (newTime > videoRef.current!.duration) newTime = videoRef.current!.duration
        videoRef.current!.currentTime = newTime
        setState((prev) => {
            return {...prev, progress: newTime}
        })
    }

    const next = async () => {
        const nextFile = await window.ipcRenderer.invoke("next", state.forwardSrc)
        if (nextFile) upload(nextFile)
    }

    const previous = async () => {
        const previousFile = await window.ipcRenderer.invoke("previous", state.forwardSrc)
        if (previousFile) upload(previousFile)
    }
    
    const getName = () => {
        return state.forwardSrc ? path.basename(state.forwardSrc.replace("file:///"), path.extname(state.forwardSrc.replace("file:///"))) : ""
    }

    const download = async () => {
        let defaultPath = state.forwardSrc
        if (defaultPath.startsWith("http")) {
            let name = path.basename(defaultPath)
            defaultPath = `${window.app.getPath("downloads")}/${name}`
        }
        let savePath = await window.ipcRenderer.invoke("save-dialog", defaultPath)
        if (!savePath) return
        if (!path.extname(savePath)) savePath += path.extname(defaultPath)
        videoRef.current?.pause()
        setState((prev) => {
            return {...prev, paused: true}
        })
        window.ipcRenderer.invoke("export-dialog", true)
        await window.ipcRenderer.invoke("export-video", state.forwardSrc, savePath, {reverse: state.reverse, speed: state.speed, preservesPitch: state.preservesPitch, abloop: state.abloop, loopStart: state.loopStart, loopEnd: state.loopEnd, duration: videoRef.current!.duration})
        window.ipcRenderer.invoke("export-dialog", false)
        videoRef.current!.load()
        videoRef.current!.play()
        setState((prev) => {
            return {...prev, paused: false}
        })
    }

    const updateProgressText = (value: number) => {
        let percent = value / 100
        if (state.reverse === true) {
            const progress = (1-percent) * state.duration
            setState((prev) => {
                return {...prev, progress, dragProgress: state.duration - progress}
            })
        } else {
            const progress = percent * state.duration
            setState((prev) => {
                return {...prev, progress, dragProgress: progress}
            })
        }
    }

    const updateProgressTextAB = (value: number[]) => {
        if (state.loopStart === value[0]) {
            let percent = value[1] / 100
            const progress = state.reverse ? state.duration - (1-percent) * state.duration : percent * state.duration
            setState((prev) => {
                return {...prev, loopStart: value[0], loopEnd: value[1], dragProgress: progress}
            })
        } else {
            let percent = value[0] / 100
            const progress = state.reverse ? state.duration - (1-percent) * state.duration : percent * state.duration
            setState((prev) => {
                return {...prev, loopStart: value[0], loopEnd: value[1], dragProgress: progress}
            })
        }
    }

    const onDrop = (files: any) => {
        files = files.map((f: any) => f.path)
        if (files[0]) {
            upload(files[0])
        }
    }

    const {getRootProps} = useDropzone({onDrop})

    return (
        <main className="video-player" {...getRootProps()}>
            <div className="video-player-container" ref={playerRef}>
                <div className={hoverBar ? "left-bar visible" : "left-bar"} onMouseEnter={() => setHoverBar(true)} onMouseLeave={() => setHoverBar(false)}>
                    <img className="bar-button" src={previousHover ? previousButtonHover : previousButton} onClick={() => previous()} onMouseEnter={() => setPreviousHover(true)} onMouseLeave={() => setPreviousHover(false)}/>
                </div>
                <div className={hoverBar ? "right-bar visible" : "right-bar"} onMouseEnter={() => setHoverBar(true)} onMouseLeave={() => setHoverBar(false)}>
                    <img className="bar-button" src={nextHover ? nextButtonHover : nextButton} onClick={() => next()} onMouseEnter={() => setNextHover(true)} onMouseLeave={() => setNextHover(false)}/>
                </div>
                {/*@ts-ignore*/}
                {state.audio ? <img className="audio-placeholder" src={placeholder}/> : null}
                {/*@ts-ignore*/}
                <div className="video-filters" ref={videoFilterRef}>
                    <img className="video-lightness-overlay" ref={videoLightnessRef} src={backFrame}/>
                    <canvas className="video-sharpen-overlay" ref={videoSharpnessRef}></canvas>
                    <canvas className="video-pixelate-canvas" ref={videoPixelateRef}></canvas>
                    <video className="video" ref={videoRef} style={state.audio ? {display: "none"} : {display: "flex"}} onLoadedData={() => setVideoLoaded(true)}>
                        <track kind="subtitles" src={state.subtitleSrc}></track>
                    </video>
                </div>
                <div className={state.paused && hover ? "control-title-container visible" : "control-title-container"}>
                    <p className="control-title">{getName()}</p>
                </div>
                {state.subtitles ?
                <div className="video-subtitle-container" style={{bottom: hover ? "100px" : "20px"}}>
                    <p className="video-subtitles">{subtitleText}</p>
                </div> 
                : null}
                <div className={hover ? "video-controls visible" : "video-controls"} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="control-row">
                        <p className="control-text">{state.dragging ? functions.formatSeconds(state.dragProgress) : functions.formatSeconds(state.reverse ? state.duration - state.progress : state.progress)}</p>
                        <div className="progress-container" onMouseUp={() => setState((prev) => {return {...prev, dragging: false}})}>
                            <Slider className="progress-slider" trackClassName="progress-slider-track" thumbClassName="progress-slider-thumb" onBeforeChange={() => setState((prev) => {return {...prev, dragging: true}})} onChange={(value) => updateProgressText(value)} onAfterChange={(value) => seek(value)} min={0} max={100} step={0.1} value={state.reverse ? ((1 - state.progress / state.duration) * 100) : (state.progress / state.duration * 100)}/>
                            <Slider ref={abSlider} className="ab-slider" trackClassName="ab-slider-track" thumbClassName="ab-slider-thumb" min={0} max={100} step={0.1} value={[state.loopStart, state.loopEnd]} onBeforeChange={() => setState((prev) => {return {...prev, dragging: true}})} onChange={(value) => updateProgressTextAB(value)} onAfterChange={(value) => abloop(value)}/>
                        </div>
                        <p className="control-text">{functions.formatSeconds(state.duration)}</p>
                    </div>
                    <div className="control-row">
                        <img className="control-button" src={reverseHover ? reverseButtonHover : (state.reverse ? reverseActiveButton : reverseButton)} onClick={() => reverse()} onMouseEnter={() => setReverseHover(true)} onMouseLeave={() => setReverseHover(false)}/>
                        <div className="speed-popup-container" ref={speedPopup} style={({display: "none"})}>
                                <div className="speed-popup">
                                    <input type="range" ref={speedBar} onChange={(event) => speed(event.target.value)} min="0.5" max="4" step="0.5" value={state.speed} className="speed-bar"/>
                                    <div className="speed-checkbox-container">
                                    <p className="speed-text">Pitch?</p><input type="checkbox" checked={!state.preservesPitch} onChange={() => preservesPitch()} className="speed-checkbox"/>
                                    </div>
                                </div>
                            </div>
                        <img className="control-button" src={speedHover ? speedButtonHover : (state.speed !== 1 ? speedActiveButton : speedButton)} ref={speedImg} onClick={() => speedPopup.current!.style.display === "flex" ? speedPopup.current!.style.display = "none" : speedPopup.current!.style.display = "flex"} onMouseEnter={() => setSpeedHover(true)} onMouseLeave={() => setSpeedHover(false)}/>
                        <img className="control-button" src={loopHover ? loopButtonHover : (state.loop ? loopActiveButton : loopButton)} onClick={() => loop()} onMouseEnter={() => setLoopHover(true)} onMouseLeave={() => setLoopHover(false)}/>
                        <img className="control-button" src={abloopHover ? abloopButtonHover : (state.abloop ? abloopActiveButton : abloopButton)} onClick={() => toggleAB()} onMouseEnter={() => setABLoopHover(true)} onMouseLeave={() => setABLoopHover(false)}/>
                        <img className="control-button" src={resetHover ? resetButtonHover : resetButton} onClick={() => reset()} onMouseEnter={() => setResetHover(true)} onMouseLeave={() => setResetHover(false)}/>
                        <img className="control-button rewind-button" src={rewindHover ? rewindButtonHover : rewindButton} onClick={() => rewind()} onMouseEnter={() => setRewindHover(true)} onMouseLeave={() => setRewindHover(false)}/>
                        <img className="control-button play-button" src={playHover ? (state.paused ? playButtonHover : pauseButtonHover) : (state.paused ? playButton : pauseButton)} onClick={() => play()} onMouseEnter={() => setPlayHover(true)} onMouseLeave={() => setPlayHover(false)}/>
                        <img className="control-button rewind-button" src={fastForwardHover ? fastForwardButtonHover : fastForwardButton} onClick={() => fastforward()} onMouseEnter={() => setFastforwardHover(true)} onMouseLeave={() => setFastforwardHover(false)}/>
                        <img className="control-button" src={subtitleHover ? subtitleButtonHover : (state.subtitles ? subtitleButtonActive : subtitleButton)} onClick={() => subtitles()} onMouseEnter={() => setSubtitleHover(true)} onMouseLeave={() => setSubtitleHover(false)}/>
                        <img className="control-button" src={fullscreenHover ? fullscreenButtonHover : fullscreenButton} onClick={() => fullscreen()} onMouseEnter={() => setFullscreenHover(true)} onMouseLeave={() => setFullscreenHover(false)}/>
                        <img className="control-button" src={volumeIcon()} onClick={() => mute()} onMouseEnter={() => setVolumeHover(true)} onMouseLeave={() => setVolumeHover(false)}/>
                        <Slider className="volume-slider" trackClassName="volume-slider-track" thumbClassName="volume-slider-thumb" onChange={(value) => volume(value)} min={0} max={1} step={0.01} value={state.volume}/>
                    </div>
                </div>
            </div>
        </main>
    )
}

export default VideoPlayer