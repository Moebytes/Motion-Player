import React, {useEffect, useEffectEvent, useRef, useState} from "react"
import {useActiveSelector, useFilterSelector, usePlaybackSelector, usePlaybackActions} from "../store"
import Slider from "react-slider"
import {Dropdown, DropdownButton} from "react-bootstrap"
import functions, {VideoTrack, VideoChapter, CanvasDrawable} from "../structures/functions"
import CheckboxIcon from "../assets/svg/checkbox.svg"
import CheckboxCheckedIcon from "../assets/svg/checkbox-checked.svg"
import PlayIcon from "../assets/svg/play.svg"
import PauseIcon from "../assets/svg/pause.svg"
import NextIcon from "../assets/svg/next.svg"
import PreviousIcon from "../assets/svg/previous.svg"
import ReverseIcon from "../assets/svg/reverse.svg"
import SpeedIcon from "../assets/svg/speed.svg"
import LoopIcon from "../assets/svg/loop.svg"
import ABLoopIcon from "../assets/svg/abloop.svg"
import ResetIcon from "../assets/svg/revert.svg"
import SubIcon from "../assets/svg/sub.svg"
import AudioIcon from "../assets/svg/aud.svg"
import ChapterIcon from "../assets/svg/chapter.svg"
import FullscreenIcon from "../assets/svg/fullscreen.svg"
import VolumeIcon from "../assets/svg/volume.svg"
import VolumeLowIcon from "../assets/svg/volume-low.svg"
import VolumeMuteIcon from "../assets/svg/volume-mute.svg"
import RewindIcon from "../assets/svg/rewind.svg"
import FastForwardIcon from "../assets/svg/fastforward.svg"
import {useDropzone} from "react-dropzone"
import path from "path"
import "./styles/videoplayer.less"

const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"]

let videoID = 0
let animationID = 0
let lastTime = 0
let acc = 0
let changedAudio = false

const VideoPlayer: React.FunctionComponent = () => {
    const {originalSrc, forwardSrc, reverseSrc, subtitleSrc, reverse, speed, preservesPitch,
        duration, prevVolume, volume, paused, subtitles, loop, abloop, loopStart,
        loopEnd, savedLoop, progress, secondsProgress, seekTo, abDragging,
        dragging, dragProgress, stepFlag, subtitleColor, outlineThickness, outlineColor,
        subtitleSize
    } = usePlaybackSelector()
    const {setOriginalSrc, setForwardSrc, setReverseSrc, setSubtitleSrc, setReverse, setSpeed, setPreservesPitch,
        setDuration, setPrevVolume, setVolume, setPaused, setSubtitles, setLoop, setABLoop, setLoopStart,
        setLoopEnd, setSavedLoop, setProgress, setSecondsProgress, setSeekTo, setDragging, setDragProgress,
        setABDragging, setStepFlag, setSubtitleColor, setOutlineThickness, setOutlineColor, setSubtitleSize
    } = usePlaybackActions()
    const {brightness, contrast, hue, saturation, lightness, blur, sharpen, pixelate} = useFilterSelector()
    const {videoDrag} = useActiveSelector()
    const [showSpeedPopup, setShowSpeedPopup] = useState(false)
    const [showSubtitlePopup, setShowSubtitlePopup] = useState(false)
    const [showAudioPopup, setShowAudioPopup] = useState(false)
    const [showChapterPopup, setShowChapterPopup] = useState(false)
    const [hover, setHover] = useState(false)
    const [hoverBar, setHoverBar] = useState(false)
    const [backFrame, setBackFrame] = useState("")
    const [videoLoaded, setVideoLoaded] = useState(false)
    const [videoData, setVideoData] = useState(null as ImageBitmap[] | null)
    const [subtitlesLoaded, setSubtitlesLoaded] = useState(false)
    const [subtitleText, setSubtitleText] = useState("")
    const [processing, setProcessing] = useState(false)
    const [videoTracks, setVideoTracks] = useState([] as VideoTrack[])
    const [audioTracks, setAudioTracks] = useState([] as VideoTrack[])
    const [subtitleTracks, setSubtitleTracks] = useState([] as VideoTrack[])
    const [chapters, setChapters] = useState([] as VideoChapter[])
    const [currentVideoTrack, setCurrentVideoTrack] = useState(null as VideoTrack | null)
    const [currentAudioTrack, setCurrentAudioTrack] = useState(null as VideoTrack | null)
    const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(null as VideoTrack | null)
    const [currentChapter, setCurrentChapter] = useState(null as VideoChapter | null)

    const playerRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const trackRef = useRef<HTMLTrackElement>(null)
    const speedPopup = useRef<HTMLDivElement>(null)
    const speedIcon = useRef<HTMLDivElement>(null)
    const subtitlePopup = useRef<HTMLDivElement>(null)
    const subtitleIcon = useRef<HTMLDivElement>(null)
    const audioPopup = useRef<HTMLDivElement>(null)
    const audioIcon = useRef<HTMLDivElement>(null)
    const chapterPopup = useRef<HTMLDivElement>(null)
    const chapterIcon = useRef<HTMLDivElement>(null)
    const filterRef = useRef<HTMLDivElement>(null)
    const lightnessRef = useRef<HTMLImageElement>(null)
    const sharpnessRef = useRef<HTMLCanvasElement>(null)
    const pixelateRef = useRef<HTMLCanvasElement>(null)
    const progressBar = useRef(null) as any
    const abSlider = useRef(null) as any
    const speedBar = useRef(null) as any

    useEffect(() => {
        progressBar.current?.resize()
        abSlider.current?.resize()
        speedBar.current?.resize()
    })

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
        const openLink = async (event: any, link: string) => {
            if (link) {
                let video = link.replace(/\?.*$/, "")
                if (link.includes("youtube.com") || link.includes("youtu.be")) {
                    video = await window.ipcRenderer.invoke("download-yt-video", link)
                } 
                upload(video)
            }
        }
        const triggerDownload = () => {
            download()
        }
        const cacheCleared = () => {
            setSubtitleSrc(null)
            setReverseSrc(null)
        }
        const onWindowMouseUp = (event: any) => {
            setDragging(false)
            setABDragging(false)
        }
        const selectChapter = (event: any, chapter: VideoChapter) => {
            goToChapter(chapter)
        }
        const selectAudioTrack = (event: any, track: VideoTrack) => {
            changeAudioTrack(track)
        }
        const selectSubtitleTrack = (event: any, track: VideoTrack) => {
            changeSubtitleTrack(track)
        }
        initState()
        abSlider.current.slider.style.display = "none"
        window.addEventListener("mouseup", onWindowMouseUp)
        window.ipcRenderer.on("open-file", openFile)
        window.ipcRenderer.on("upload-file", uploadFile)
        window.ipcRenderer.on("open-link", openLink)
        window.ipcRenderer.on("trigger-download", triggerDownload)
        window.ipcRenderer.on("trigger-resize", triggerResize)
        window.ipcRenderer.on("cache-cleared", cacheCleared)
        window.ipcRenderer.on("select-chapter", selectChapter)
        window.ipcRenderer.on("select-audio-track", selectAudioTrack)
        window.ipcRenderer.on("select-subtitle-track", selectSubtitleTrack)
        return () => {
            window.removeEventListener("mouseup", onWindowMouseUp)
            window.ipcRenderer.removeListener("open-file", openFile)
            window.ipcRenderer.removeListener("upload-file", uploadFile)
            window.ipcRenderer.removeListener("open-link", openLink)
            window.ipcRenderer.removeListener("trigger-download", triggerDownload)
            window.ipcRenderer.removeListener("trigger-resize", triggerResize)
            window.ipcRenderer.removeListener("cache-cleared", cacheCleared)
            window.ipcRenderer.removeListener("select-chapter", selectChapter)
            window.ipcRenderer.removeListener("select-audio-track", selectAudioTrack)
            window.ipcRenderer.removeListener("select-subtitle-track", selectSubtitleTrack)
        }
    }, [])

    const triggerResize = useEffectEvent(() => {
        const width = videoRef.current?.videoWidth
        const height = videoRef.current?.videoHeight
        window.ipcRenderer.invoke("resize-window", {width, height})
    })

    useEffect(() => {
        const onWindowClick = (event: MouseEvent) => {
            const target = event.target as Node
            if (showSpeedPopup && !speedIcon.current?.contains(target)
                && !speedPopup.current?.contains(target)) {
                setShowSpeedPopup(false)
            }
            
            if (showSubtitlePopup && !subtitleIcon.current?.contains(target)
                && !subtitlePopup.current?.contains(target)) {
                setShowSubtitlePopup(false)
            }

            if (showAudioPopup && !audioIcon.current?.contains(target)
                && !audioPopup.current?.contains(target)) {
                setShowAudioPopup(false)
            }

            if (showChapterPopup && !chapterIcon.current?.contains(target)
                && !chapterPopup.current?.contains(target)) {
                setShowChapterPopup(false)
            }
        }

        window.addEventListener("mousedown", onWindowClick)
        return () => {
            window.removeEventListener("mousedown", onWindowClick)
        }
    }, [showSpeedPopup, showSubtitlePopup, showAudioPopup, showChapterPopup])

    const initState = async () => {
        const saved = await window.ipcRenderer.invoke("get-state")
        if (saved.speed !== undefined) {
            setSpeed(Number(saved.speed))
            videoRef.current!.playbackRate = Number(saved.speed)
        }
        if (saved.preservesPitch !== undefined) {
            setPreservesPitch(Boolean(saved.preservesPitch))
            videoRef.current!.preservesPitch = Boolean(saved.preservesPitch)
        }
        if (saved.volume !== undefined) {
            setVolume(Number(saved.volume))
            videoRef.current!.volume = Number(saved.volume)
        }
        if (saved.loop !== undefined) {
            setLoop(Boolean(saved.loop))
            videoRef.current!.loop = Boolean(saved.loop)
        }
        if (saved.subtitleColor !== undefined) {
            setSubtitleColor(saved.subtitleColor)
        }
        if (saved.subtitleSize !== undefined) {
            setSubtitleSize(Number(saved.subtitleSize))
        }
        if (saved.outlineColor !== undefined) {
            setOutlineColor(saved.outlineColor)
        }
        if (saved.outlineThickness !== undefined) {
            setOutlineThickness(Number(saved.outlineThickness))
        }
    }

    useEffect(() => {
        const timeUpdate = () => {
            let progress = 0
            let duration = 0
            if (videoRef.current) {
                progress = videoRef.current.currentTime / videoRef.current.playbackRate
                duration = videoRef.current.duration / videoRef.current.playbackRate
                if (abloop) {
                    const current = videoRef.current.currentTime
                    const start = reverse ? (videoRef.current.duration / 100) * (100 - loopStart) 
                        : (videoRef.current.duration / 100) * loopStart
                    const end = reverse ? (videoRef.current.duration / 100) * (100 - loopEnd) 
                        : (videoRef.current.duration / 100) * loopEnd
                    if (reverse) {
                        if (current > start || current < end) {
                            videoRef.current.currentTime = end
                            if (!dragging) {
                                setProgress(end)
                            }
                        }
                    } else {
                        if (current < start || current > end) {
                            videoRef.current.currentTime = start
                            if (!dragging) {
                                setProgress(start)
                            }
                        }
                    }
                }
            }
            if (!dragging) {
                setProgress(progress)
                setDuration(duration)
            }
        }
        if (videoRef.current?.textTracks?.[0]) {
            videoRef.current.textTracks[0].mode = "hidden"
        }
        if (hover) {
            document.documentElement.style.setProperty("--subtitle-transform", "translateY(-80px)")
        } else {
            document.documentElement.style.setProperty("--subtitle-transform", "translateY(0)")
        }
        const onEnd = () => {
            setPaused(true)
        }
        videoRef.current!.addEventListener("timeupdate", timeUpdate)
        videoRef.current!.addEventListener("ended", onEnd)
        return () => {
            videoRef.current!.removeEventListener("timeupdate", timeUpdate)
            videoRef.current!.removeEventListener("ended", onEnd)
        }
    }, [videoData, reverse, dragging, abloop, loopStart, loopEnd])

    useEffect(() => {
        /* Precision on shift click */
        const keyDown = (event: KeyboardEvent) => {
            if (event.shiftKey) {
                event.preventDefault()
                setStepFlag(false)
            }
            /* Play on Spacebar */
            if (event.code === "Space") {
                event.preventDefault()
                play()
            }
        }
        const keyUp = (event: KeyboardEvent) => {
            if (!event.shiftKey) {
                setStepFlag(true)
            }
        }
        const mouseDown = () => {
            if (!stepFlag) {
                setStepFlag(true)
            }
        }
        window.addEventListener("keydown", keyDown)
        window.addEventListener("keyup", keyUp)
        window.addEventListener("mousedown", mouseDown)
        return () => {
            window.removeEventListener("keydown", keyDown)
            window.removeEventListener("keyup", keyUp)
            window.removeEventListener("mousedown", mouseDown)
        }
    }, [])

    useEffect(() => {
        const keyDown = (event: KeyboardEvent) => {
            /* Arrow Key Shortcuts */
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
                setVolume(volume + 0.05)
            }
            if (event.key === "ArrowDown") {
                event.preventDefault()
                setVolume(volume - 0.05)
            }
        }
        const wheel = (event: WheelEvent) => {
            event.preventDefault()
            const delta = Math.sign(event.deltaY)
            setVolume(volume - delta * 0.05)
        }
        window.addEventListener("keydown", keyDown)
        window.addEventListener("wheel", wheel, {passive: false})
        return () => {
            window.removeEventListener("keydown", keyDown)
            window.removeEventListener("wheel", wheel)
        }
    })

    useEffect(() => {
        const copyLoop = () => {
            if (abloop && loopEnd) {
                setSavedLoop([loopStart, loopEnd])
            }
        }
        const pasteLoop = () => {
            if (!abloop) toggleAB(true)
            updateABloop(savedLoop)
            setLoopStart(savedLoop[0])
            setLoopEnd(savedLoop[1])
        }
        window.ipcRenderer.on("copy-loop", copyLoop)
        window.ipcRenderer.on("paste-loop", pasteLoop)
        return () => {
            window.ipcRenderer.removeListener("copy-loop", copyLoop)
            window.ipcRenderer.removeListener("paste-loop", pasteLoop)
        }
    }, [abloop, loopStart, loopEnd])

    useEffect(() => {
        if (!abSlider.current) return
        if (abloop) {
            abSlider.current.slider.style.display = "flex"
        } else {
            abSlider.current.slider.style.display = "none"
        }
    }, [abloop])

    useEffect(() => {
        const getThumbnail = async () => {
            if (backFrame || !originalSrc) return 
            const thumb = await functions.videoThumbnail(originalSrc)
            setBackFrame(thumb)
        }
        if (videoLoaded) getThumbnail()
    }, [videoLoaded, backFrame, originalSrc])

    const getFrameData = async () => {
        let frames = [] as ImageBitmap[]
        if (functions.isMP4(originalSrc)) {
            if (videoData) return
            frames = await functions.extractMP4Frames(originalSrc!)
            if (frames) setVideoData(frames)
        } else if (functions.isWebM(originalSrc)) {
            if (videoData) return
            frames = await functions.extractWebMFrames(originalSrc!)
            if (frames) setVideoData(frames)
        }
    }

    useEffect(() => {
        const element = filterRef.current
        let newContrast = contrast
        const video = videoRef.current
        const sharpenOverlay = sharpnessRef.current
        const lightnessOverlay = lightnessRef.current
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
        if (videoLoaded && videoRef.current && pixelateRef.current && sharpnessRef.current) {
            videoRef.current.style.opacity = "1"
            const pixelateCanvas = pixelateRef.current
            const sharpenOverlay = sharpnessRef.current
            const adjustedData = videoData ? functions.videoSpeed(videoData, speed) : null
            videoRef.current.playbackRate = speed
            const pixelateCtx = pixelateCanvas.getContext("2d")
            let sharpenCtx = sharpenOverlay.getContext("2d")
            
            let video = videoRef.current
            const duration = video.duration
            let frame = videoRef.current as CanvasDrawable
            let pos = 0
            let frames = adjustedData ? adjustedData.length - 1 : 1
            let interval = duration / frames
            let fps = 0
            if (adjustedData) {
                fps = adjustedData.length / video.duration
                let sp = seekTo !== null ? seekTo : progress
                pos = Math.floor(sp / interval)
                if (!adjustedData[pos]) pos = 0
                frame = adjustedData[pos]
            }

            let loopStartFrame = 0
            let loopEndFrame = adjustedData ? adjustedData.length - 1 : 1

            if (abloop) {
                const start = (duration / 100) * loopStart
                const end = (duration / 100) * loopEnd

                loopStartFrame = Math.floor(start / interval)
                loopEndFrame = Math.floor(end / interval)

                if (loopStartFrame < 0) loopStartFrame = 0
                if (loopEndFrame > frames) loopEndFrame = frames
            }

            const update = () => {
                if (adjustedData) {
                    if (reverse) {
                        pos--
                    } else {
                        pos++
                    }
                    
                    if (abloop) {
                        if (pos < loopStartFrame) pos = loopEndFrame
                        if (pos > loopEndFrame) pos = loopStartFrame
                    } else {
                        if (pos < 0) pos = frames
                        if (pos > frames) pos = 0
                    }
                    
                    frame = adjustedData[pos]
                }
            }

            const draw = () => {
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

                        pixelateCanvas.style.opacity = "1"
                        video.style.opacity = "0"
                        pixelateCanvas.style.imageRendering = "pixelated"
                    } else {
                        pixelateCanvas.style.width = `${pixelateCanvas.width}px`
                        pixelateCanvas.style.height = `${pixelateCanvas.height}px`
                        pixelateCanvas.style.opacity = "0"
                        video.style.opacity = "1"
                        pixelateCanvas.style.imageRendering = "none"
                        pixelateCtx?.clearRect(0, 0, pixelateCanvas.width, pixelateCanvas.height)
                        pixelateCtx?.drawImage(frame, 0, 0, pixelateCanvas.width, pixelateCanvas.height)
                    }
                }
            }
            
            const animateFPS = (time: number) => {
                if (paused) return

                if (!lastTime) lastTime = time
                const delta = time - lastTime
                lastTime = time

                acc += delta

                if (acc >= (1000 / fps)) {
                    update()
                    acc -= (1000 / fps)
                }
                draw()
                animationID = requestAnimationFrame(animateFPS)
            }

            const animateVideo = async () => {
                if (paused) return
                update()
                draw()
                videoID = videoRef.current?.requestVideoFrameCallback(animateVideo) ?? 0
            }

            if (fps > 0) {
                animationID = window.requestAnimationFrame(animateFPS)
            } else {
                videoID = videoRef.current?.requestVideoFrameCallback(animateVideo)
            }
        }
        return () => {
            videoRef.current?.cancelVideoFrameCallback(videoID)
            window.cancelAnimationFrame(animationID)
        }
    }, [videoLoaded, videoData, reverse, speed, sharpen, lightness, 
        pixelate, paused, seekTo, abloop, loopStart, loopEnd])

    const resizeOverlay = () => {
        const sharpenCanvas = sharpnessRef.current
        const pixelateCanvas = pixelateRef.current
        const lightnessCanvas = lightnessRef.current
        if (!videoRef.current || !sharpenCanvas || !pixelateCanvas || !lightnessCanvas) return
        if (videoRef.current.clientWidth === 0) return
        const landscape = videoRef.current.videoWidth > videoRef.current.videoHeight
        if (landscape) {
            const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight
            const width = videoRef.current.clientWidth
            const height = Math.floor(videoRef.current.clientWidth / aspectRatio)
            sharpenCanvas.width = width
            sharpenCanvas.height = height
            pixelateCanvas.width = width
            pixelateCanvas.height = height
            lightnessCanvas.width = width
            lightnessCanvas.height = height
        } else {
            const aspectRatio = videoRef.current.videoHeight / videoRef.current.videoWidth
            const height = videoRef.current.clientHeight
            const width = Math.floor(videoRef.current.clientHeight / aspectRatio)
            sharpenCanvas.height = height
            sharpenCanvas.width = width
            pixelateCanvas.height = height
            pixelateCanvas.width = width
            lightnessCanvas.height = height
            lightnessCanvas.width = width
        }
        const rect = videoRef.current.getBoundingClientRect()
        pixelateCanvas.style.top = `${rect.top}px`
        pixelateCanvas.style.left = `${rect.left}px`
    }

    useEffect(() => {
        const element = videoRef.current
        new ResizeObserver(resizeOverlay).observe(element!)
    }, [])

    useEffect(() => {
        if (!subtitlesLoaded && !trackRef.current) return

        const onLoad = () => {
            const track = trackRef.current?.track
            if (!track || !track.cues?.length) return
            track.mode = "hidden"
            for (let i = 0; i < track.cues?.length; i++) {
                const cue = track.cues[i] as VTTCue
                cue.onenter = () => {
                    setSubtitleText(functions.cleanHTML(cue.text))
                }
                cue.onexit = () => {
                    setSubtitleText("")
                }
            }
        }

        trackRef.current?.addEventListener("load", onLoad)
        return () => {
            trackRef.current?.removeEventListener("load", onLoad)
        }
    }, [subtitlesLoaded])

    useEffect(() => {
        document.documentElement.style.setProperty("--subtitleColor", subtitleColor)
    }, [subtitleColor])
    
    useEffect(() => {
        document.documentElement.style.setProperty("--subtitleSize", `${subtitleSize}px`)
    }, [subtitleSize])

    useEffect(() => {
        document.documentElement.style.setProperty("--outlineColor", outlineColor)
    }, [outlineColor])

    useEffect(() => {
        document.documentElement.style.setProperty("--outlineThickness", `${outlineThickness}px`)
    }, [outlineThickness])

    const refreshState = useEffectEvent(() => {
        updateSpeed(speed)
        updatePreservesPitch(preservesPitch)
        if (abloop) updateABloop([loopStart, loopEnd])
    })

    useEffect(() => {
        window.ipcRenderer.invoke("save-state", {reverse, speed, preservesPitch, loop, abloop, 
        volume, loopStart, loopEnd, subtitleColor, subtitleSize, outlineColor, outlineThickness})
    }, [reverse, speed, preservesPitch, loop, abloop, loopStart, volume,
        loopEnd, subtitleColor, outlineColor, subtitleSize, outlineThickness])

    const upload = useEffectEvent(async (file?: string) => {
        if (!file) file = await window.ipcRenderer.invoke("select-file")
        if (!file) return
        if (!videoExtensions.includes(path.extname(file))) return
        if (path.extname(file) === ".mov") file = await window.ipcRenderer.invoke("mov-to-mp4", file) as string
        setVideoLoaded(false)
        setSubtitlesLoaded(false)
        videoRef.current!.src = file
        videoRef.current!.currentTime = 0
        videoRef.current!.play()
        setOriginalSrc(file)
        setForwardSrc(file)
        setVideoData(null)
        setReverseSrc(null)
        setReverse(false)
        setSubtitleText("")
        setPaused(false)
        refreshState()
        window.ipcRenderer.invoke("extract-subtitle-track", file, 0).then((subtitles) => {
            if (subtitles) {
                setSubtitles(true)
                setSubtitleSrc(subtitles)
                setSubtitlesLoaded(true)
            } else {
                setSubtitles(false)
            }
        })
        window.ipcRenderer.invoke("get-reverse-src", file).then((reverseSrc) => {
            if (reverseSrc) setReverseSrc(reverseSrc)
        })
    })

    const onLoaded = async () => {
        setVideoLoaded(true)

        if (changedAudio) {
            changedAudio = false
            return
        }

        const width = videoRef.current?.videoWidth
        const height = videoRef.current?.videoHeight
        await window.ipcRenderer.invoke("resize-window", {width, height})

        const {tracks, chapters} = await window.ipcRenderer.invoke("get-tracks", originalSrc) as 
            {tracks: VideoTrack[], chapters: VideoChapter[]}

        const videoTracks = tracks.filter((t) => t.type === "video")
        const audioTracks = tracks.filter((t) => t.type === "audio")
        const subtitleTracks = tracks.filter((t) => t.type === "subtitle")

        setVideoTracks(videoTracks)
        setAudioTracks(audioTracks)
        setSubtitleTracks(subtitleTracks)
        setChapters(chapters.filter((c) => c.title))

        if (videoTracks.length) setCurrentVideoTrack(videoTracks[0])
        if (audioTracks.length) setCurrentAudioTrack(audioTracks[0])
        if (subtitleTracks.length) setCurrentSubtitleTrack(subtitleTracks[0])
        if (chapters.length) setCurrentChapter(chapters[0])
    }

    const play = () => {
        if (videoRef.current!.paused) {
            videoRef.current!.play()
            setPaused(false)
        } else {
            videoRef.current!.pause()
            setPaused(true)
        }
    }

    const updateReverse = useEffectEvent(async () => {
        if (processing) return
        setProcessing(true)
        let reverseSource = reverseSrc ?? ""
        if (!videoData) {
            await getFrameData()
        }
        if (!reverseSource) {
            const reversed = await window.ipcRenderer.invoke("reverse-audio", forwardSrc).catch(() => null)
            if (!reversed) return setProcessing(false)
            setReverseSrc(reversed)
            reverseSource = reversed
        }
        setProcessing(false)
        if (reverse) {
            let percent = videoRef.current!.currentTime / videoRef.current!.duration
            const newTime = (1-percent) * videoRef.current!.duration
            setVideoLoaded(false)
            videoRef.current!.src = forwardSrc ?? ""
            videoRef.current!.currentTime = newTime
            videoRef.current!.play()
            refreshState()
            setReverse(false)
        } else {
            let percent = videoRef.current!.currentTime / videoRef.current!.duration
            const newTime = (1-percent) * videoRef.current!.duration
            setVideoLoaded(false)
            videoRef.current!.src = reverseSource
            videoRef.current!.currentTime = newTime
            videoRef.current!.play()
            refreshState()
            setReverse(true)
        }
    })

    const updateSpeed = (value?: number | string) => {
        let currentSpeed = value !== undefined ? value : speed
        videoRef.current!.playbackRate = Number(currentSpeed)
    }

    useEffect(() => {
        updateSpeed()
    }, [speed])

    const updatePreservesPitch = (value?: boolean) => {
        const currentPitch = value !== undefined ? value : !preservesPitch
        videoRef.current!.preservesPitch = currentPitch
        setPreservesPitch(currentPitch)
    }

    const seek = (position: number) => {
        const progress = reverse ? (videoRef.current!.duration / 100) * (100 - position) : 
            (videoRef.current!.duration / 100) * position
        videoRef.current!.currentTime = progress
        setProgress(progress)
        setDragging(false)
        setSeekTo(progress)
    }

    const updateVolume = (value: number) => {
        if (value < 0) value = 0
        if (value > 1) value = 1
        videoRef.current!.volume = value
        setVolume(value)
        setPrevVolume(value)
    }

    const mute = () => {
        if (videoRef.current!.volume > 0) {
            videoRef.current!.volume = 0
            setVolume(0)
        } else {
            const newVol = prevVolume ? prevVolume : 1
            videoRef.current!.volume = newVol
            setVolume(newVol)
        }
    }

    const fullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen()
        } else {
            playerRef.current?.requestFullscreen()
        }
    }

    const updateLoop = (value?: boolean) => {
        const toggle = value !== undefined ? value : !loop
        videoRef.current!.loop = toggle
        setLoop(toggle)
    }

    const reset = () => {
        setReverse(false)
        setSpeed(1)
        setPreservesPitch(true)
        setDuration(0)
        setPaused(false)
        setABLoop(false)
        setLoopStart(0)
        setLoopEnd(100)
        setSavedLoop([0, 100])
        setProgress(0)
        setSecondsProgress(0)
        setSeekTo(null)
        setDragging(false)
        setABDragging(false)
        setStepFlag(true)
        setDragProgress(0)
        setVideoLoaded(false)
        videoRef.current!.playbackRate = 1
        videoRef.current!.preservesPitch = true
        videoRef.current!.src = forwardSrc ?? ""
        videoRef.current!.currentTime = 0
        videoRef.current!.play()
    }

    const updateABloop = (value: number[]) => {
        const loopStart = value[0]
        const loopEnd = value[1]
        const current = videoRef.current!.currentTime
        const start = reverse ? (videoRef.current!.duration / 100) * (100 - loopStart) 
            : (videoRef.current!.duration / 100) * loopStart
        const end = reverse ? (videoRef.current!.duration / 100) * (100 - loopEnd) 
            : (videoRef.current!.duration / 100) * loopEnd
        if (reverse) {
            if (current > start || current < end) {
                videoRef.current!.currentTime = end
                setProgress(end)
            }
        } else {
            if (current < start || current > end) {
                videoRef.current!.currentTime = start
                setProgress(start)
            }
        }
        setDragging(false)
        setABDragging(false)
    }

    const toggleAB = (value?: boolean) => {
        const currentABloop = value !== undefined ? value : !abloop
        setABLoop(currentABloop)
    }

    const rewind = (value?: number) => {
        if (!value) value = 10
        let newTime = reverse ? videoRef.current!.currentTime + value : videoRef.current!.currentTime - value
        if (newTime < 0) newTime = 0
        if (newTime > videoRef.current!.duration) newTime = videoRef.current!.duration
        videoRef.current!.currentTime = newTime
        setProgress(newTime)
        setSeekTo(newTime)
    }

    const fastforward = (value?: number) => {
        if (!value) value = 10
        let newTime = reverse ? videoRef.current!.currentTime - value : videoRef.current!.currentTime + value
        if (newTime < 0) newTime = 0
        if (newTime > videoRef.current!.duration) newTime = videoRef.current!.duration
        videoRef.current!.currentTime = newTime
        setProgress(newTime)
        setSeekTo(newTime)
    }

    const next = async () => {
        const nextFile = await window.ipcRenderer.invoke("next", originalSrc)
        if (nextFile) upload(nextFile)
    }

    const previous = async () => {
        const previousFile = await window.ipcRenderer.invoke("previous", originalSrc)
        if (previousFile) upload(previousFile)
    }
    
    const getName = () => {
        return originalSrc ? path.basename(originalSrc.replace("file:///", ""), 
            path.extname(originalSrc.replace("file:///", ""))) : ""
    }

    const download = useEffectEvent(async () => {
        let defaultPath = originalSrc ?? ""
        if (defaultPath.startsWith("http")) {
            let name = path.basename(defaultPath)
            const downloadsFolder = await window.app.getPath("downloads")
            defaultPath = `${downloadsFolder}/${name}`
        }
        if (!defaultPath) return
        let savePath = await window.ipcRenderer.invoke("save-dialog", defaultPath)
        if (!savePath) return
        if (!path.extname(savePath)) savePath += path.extname(defaultPath)
        videoRef.current?.pause()
        setPaused(true)
        window.ipcRenderer.invoke("export-dialog", true)
        await window.ipcRenderer.invoke("export-video", forwardSrc, savePath, {reverse, speed, preservesPitch, 
            abloop, loopStart, loopEnd, duration: videoRef.current!.duration})
        window.ipcRenderer.invoke("export-dialog", false)
        videoRef.current!.load()
        videoRef.current!.play()
        setPaused(false)
    })

    const updateProgressText = (value: number) => {
        let percent = value / 100
        if (reverse) {
            const progress = (1-percent) * duration
            setProgress(progress)
            setDragProgress(duration - progress)
        } else {
            const progress = percent * duration
            setProgress(progress)
            setDragProgress(progress)
        }
    }

    const updateProgressTextAB = (value: number[]) => {
        if (loopStart === value[0]) {
            let percent = value[1] / 100
            const progress = reverse ? duration - (1-percent) * duration : percent * duration
            setLoopStart(value[0])
            setLoopEnd(value[1])
            setDragProgress(progress)
        } else {
            let percent = value[0] / 100
            const progress = reverse ? duration - (1-percent) * duration : percent * duration
            setLoopStart(value[0])
            setLoopEnd(value[1])
            setDragProgress(progress)
        }
    }

    const goToChapter = useEffectEvent((chapter: VideoChapter) => {
        setCurrentChapter(chapter)
        videoRef.current!.currentTime = chapter.start
        setProgress(chapter.start)
        setSeekTo(chapter.start)
    })

    const changeSubtitleTrack = useEffectEvent(async (track: VideoTrack) => {
        if (!originalSrc || processing) return
        setProcessing(true)
        setCurrentSubtitleTrack(track)

        const subtitlePath = await window.ipcRenderer.invoke("extract-subtitle-track", originalSrc, track.index).catch(() => null)
        if (!subtitlePath) return setProcessing(false)

        setSubtitles(true)
        setSubtitleSrc(subtitlePath)
        setSubtitlesLoaded(true)

        setProcessing(false)
    })

    const changeAudioTrack = useEffectEvent(async (track: VideoTrack) => {
        if (!originalSrc || processing) return
        setProcessing(true)
        setCurrentAudioTrack(track)

        const pauseState = videoRef.current!.paused

        const newSrc = track.index === 0 ? originalSrc :
            await window.ipcRenderer.invoke("extract-audio-track", originalSrc, track.index).catch(() => null)
        if (!newSrc) return setProcessing(false)

        changedAudio = true
        setVideoLoaded(false)
        setForwardSrc(newSrc)
        setReverseSrc(null)
        setReverse(false)

        const currentTime = videoRef.current!.currentTime
        videoRef.current!.src = newSrc
        videoRef.current!.currentTime = currentTime

        if (!pauseState) videoRef.current!.play()
        setProcessing(false)
    })

    const onDrop = (files: any) => {
        files = files.map((f: any) => f.path)
        if (files[0]) {
            upload(files[0])
        }
    }

    const handleVideoDrag = () => {
        if (videoDrag) {
            window.ipcRenderer.send("moveWindow")
        } else {
            play()
        }
    }

    const togglePopup = (popup: "speed" | "subtitle" | "audio" | "chapter") => {
        if (popup === "speed") {
            setShowSubtitlePopup(false)
            setShowAudioPopup(false)
            setShowChapterPopup(false)
            setShowSpeedPopup((prev) => !prev)
        } else if (popup === "subtitle") {
            setShowSpeedPopup(false)
            setShowAudioPopup(false)
            setShowChapterPopup(false)
            setShowSubtitlePopup((prev) => !prev)
        } else if (popup === "audio") {
            setShowSpeedPopup(false)
            setShowSubtitlePopup(false)
            setShowChapterPopup(false)
            setShowAudioPopup((prev) => !prev)
        } else if (popup === "chapter") {
            setShowSpeedPopup(false)
            setShowSubtitlePopup(false)
            setShowAudioPopup(false)
            setShowChapterPopup((prev) => !prev)
        }
    }

    const subtitleBottom = hover
        ? 70 + subtitleSize * 0.8
        : 30 + subtitleSize * 0.3

    const {getRootProps} = useDropzone({onDrop})

    return (
        <main className="video-player" {...getRootProps()}>
            <div className="video-player-container" ref={playerRef}>
                <div className={hoverBar ? "left-bar visible" : "left-bar"} onMouseEnter={() => setHoverBar(true)} onMouseLeave={() => setHoverBar(false)}>
                    <PreviousIcon className="bar-button" onClick={() => previous()}/>
                </div>
                <div className={hoverBar ? "right-bar visible" : "right-bar"} onMouseEnter={() => setHoverBar(true)} onMouseLeave={() => setHoverBar(false)}>
                    <NextIcon className="bar-button" onClick={() => next()}/>
                </div>
                <div className="video-filters" ref={filterRef} onMouseDown={handleVideoDrag}>
                    <img className="video-lightness-overlay" ref={lightnessRef} src={backFrame}/>
                    <canvas className="video-sharpen-overlay" ref={sharpnessRef}></canvas>
                    <canvas className="video-pixelate-canvas" ref={pixelateRef}></canvas>
                    <video className="video" ref={videoRef} onLoadedMetadata={onLoaded}>
                        <track ref={trackRef} kind="subtitles" src={subtitleSrc ?? ""}></track>
                    </video>
                </div>
                <div className={paused && hover ? "control-title-container visible" : "control-title-container"}>
                    <p className="control-title">{getName()}</p>
                </div>
                {subtitles ?
                <div className="video-subtitle-container" style={{bottom: `${subtitleBottom}px`}}>
                    <p className="video-subtitles">{subtitleText}</p>
                </div> 
                : null}
                <div className={hover ? "video-controls visible" : "video-controls"} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="control-row">
                        <p className="control-text">{dragging ? functions.formatSeconds(dragProgress) : functions.formatSeconds(reverse ? duration - progress : progress)}</p>
                        <div className="progress-container" onMouseUp={() => setDragging(false)}>
                            <Slider ref={progressBar} className="progress-slider" trackClassName="progress-slider-track" thumbClassName="progress-slider-thumb" 
                            onBeforeChange={() => setDragging(true)} onChange={(value) => updateProgressText(value)} onAfterChange={(value) => seek(value)} 
                            min={0} max={100} step={0.01} value={reverse ? ((1 - progress / duration) * 100) : (progress / duration * 100)}/>

                            <Slider ref={abSlider} className="ab-slider" trackClassName="ab-slider-track" thumbClassName="ab-slider-thumb" 
                            min={0} max={100} step={0.01} value={[loopStart, loopEnd]} onBeforeChange={() => setDragging(true)} 
                            onChange={(value) => updateProgressTextAB(value)} onAfterChange={(value) => updateABloop(value)}/>
                        </div>
                        <p className="control-text">{functions.formatSeconds(duration)}</p>
                    </div>
                    <div className="control-row">
                        <ReverseIcon className={`control-button ${reverse && "active-button"}`} onClick={() => updateReverse()}/>
                        {showSpeedPopup ? <div className="popup-container" ref={speedPopup}>
                            <div className="speed-popup">
                                <div className="popup-row">
                                    <Slider className="popup-slider" trackClassName="popup-slider-track" thumbClassName="popup-slider-handle" ref={speedBar} 
                                    min={0.5} max={4} step={stepFlag ? 0.5 : 0.1} value={speed} onChange={(value: number) => setSpeed(value)}/>
                                    <span className="popup-text">{speed.toFixed(1)}x</span>
                                </div>
                                <div className="popup-row">
                                    <span className="popup-text">Pitch?</span>
                                    {!preservesPitch ?
                                    <CheckboxCheckedIcon className="popup-checkbox" onClick={() => updatePreservesPitch()}/> :
                                    <CheckboxIcon className="popup-checkbox" onClick={() => updatePreservesPitch()}/>}
                                </div>
                            </div>
                        </div> : null}
                        <SpeedIcon className={`control-button ${speed !== 1 && "active-button"}`} ref={speedIcon} onClick={() => togglePopup("speed")}/>
                        <LoopIcon className={`control-button ${(loop || abloop) && "active-button"}`} onClick={() => updateLoop()}/>
                        <ABLoopIcon className={`control-button ${abloop && "active-button"}`} onClick={() => toggleAB()}/>
                        <ResetIcon className="control-button" onClick={() => reset()}/>
                        <RewindIcon className="control-button rewind-button" onClick={() => rewind()}/>
                        {paused ?
                        <PlayIcon className="control-button play-button" onClick={() => play()}/> :
                        <PauseIcon className="control-button play-button" onClick={() => play()}/>}
                        <FastForwardIcon className="control-button rewind-button" onClick={() => fastforward()}/>
                        {showChapterPopup ? <div className="popup-container" ref={chapterPopup}>
                            <div className="chapter-popup">
                                <div className="popup-row">
                                    <span className="popup-text">Chapter</span>
                                </div>
                                <div className="popup-row">
                                    <DropdownButton title={currentChapter?.title || "None"} drop="down">
                                        {chapters.map((item) => (
                                            <Dropdown.Item onClick={() => goToChapter(item)}>{item.title}</Dropdown.Item>
                                        ))}
                                    </DropdownButton>
                                </div>
                            </div>
                        </div> : null}
                        <ChapterIcon className={`control-button ${chapters.length && "active-button"}`} ref={chapterIcon} onClick={() => togglePopup("chapter")}/>
                        {showSubtitlePopup ? <div className="popup-container" ref={subtitlePopup}>
                            <div className="subtitle-popup">
                                <div className="popup-row">
                                    <span className="popup-text">Enabled</span>
                                    {subtitles ?
                                    <CheckboxCheckedIcon className="popup-checkbox" onClick={() => setSubtitles(!subtitles)}/> :
                                    <CheckboxIcon className="popup-checkbox" onClick={() => setSubtitles(!subtitles)}/>}
                                </div>
                                <div className="popup-row">
                                    <span className="popup-text">Subtitle Track</span>
                                </div>
                                <div className="popup-row">
                                    <DropdownButton title={functions.getLanguageName(currentSubtitleTrack?.language || "None")} drop="down">
                                        {subtitleTracks.map((track) => (
                                            <Dropdown.Item onClick={() => changeSubtitleTrack(track)}>{functions.getLanguageName(track.language)}</Dropdown.Item>
                                        ))}
                                    </DropdownButton>
                                </div>
                                <div className="popup-row">
                                    <span className="popup-text">Subtitle Color</span>
                                    <input type="color" className="popup-color-box" onChange={(event) => setSubtitleColor(event.target.value)} value={subtitleColor}></input>
                                </div>
                                <div className="popup-row">
                                    <span className="popup-text">Subtitle Size</span>
                                    <Slider className="popup-mini-slider" trackClassName="popup-mini-slider-track"
                                    thumbClassName="popup-mini-slider-handle" onChange={(value: number) => setSubtitleSize(value)} 
                                    min={20} max={70} step={1} value={subtitleSize}/>
                                </div>
                                <div className="popup-row">
                                    <span className="popup-text">Outline Color</span>
                                    <input type="color" className="popup-color-box" onChange={(event) => setOutlineColor(event.target.value)} value={outlineColor}></input>
                                </div>
                                <div className="popup-row">
                                    <span className="popup-text">Outline Size</span>
                                    <Slider className="popup-mini-slider" trackClassName="popup-mini-slider-track"
                                    thumbClassName="popup-mini-slider-handle" onChange={(value: number) => setOutlineThickness(value)} 
                                    min={0} max={10} step={0.1} value={outlineThickness}/>
                                </div>
                            </div>
                        </div> : null}
                        <SubIcon className={`control-button ${subtitles && "active-button"}`} ref={subtitleIcon} onClick={() => togglePopup("subtitle")}/>
                        {showAudioPopup ? <div className="popup-container" ref={audioPopup}>
                            <div className="audio-popup">
                                <div className="popup-row">
                                    <span className="popup-text">Audio Track</span>
                                </div>
                                <div className="popup-row">
                                    <DropdownButton title={functions.getLanguageName(currentAudioTrack?.language || "None")} drop="down">
                                        {audioTracks.map((track) => (
                                            <Dropdown.Item onClick={() => changeAudioTrack(track)}>{functions.getLanguageName(track.language)}</Dropdown.Item>
                                        ))}
                                    </DropdownButton>
                                </div>
                            </div>
                        </div> : null}
                        <AudioIcon className={`control-button ${audioTracks.length > 1 && "active-button"}`} ref={audioIcon} onClick={() => togglePopup("audio")}/>
                        <FullscreenIcon className={`control-button ${document.fullscreenElement && "active-button"}`} onClick={() => fullscreen()}/>
                        {volume <= 0.01 ?
                        <VolumeMuteIcon className="control-button" onClick={() => mute()}/> :
                        volume <= 0.5 ? 
                        <VolumeLowIcon className="control-button" onClick={() => mute()}/> :
                        <VolumeIcon className="control-button" onClick={() => mute()}/>}
                        <Slider className="volume-slider" trackClassName="volume-slider-track" thumbClassName="volume-slider-thumb" 
                        onChange={(value) => updateVolume(value)} min={0} max={1} step={0.01} value={volume}/>
                    </div>
                </div>
            </div>
        </main>
    )
}

export default VideoPlayer