import {createSlice} from "@reduxjs/toolkit"
import {useSelector, useDispatch} from "react-redux"
import type {StoreState, StoreDispatch} from "../store"

const playbackSlice = createSlice({
    name: "playback",
    initialState: {
        forwardSrc: null as string | null,
        reverseSrc: null as string | null,
        subtitleSrc: null as string | null,
        reverse: false,
        speed: 1,
        preservesPitch: true,
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
        previousVolume: 0,
        progress: 0,
        secondsProgress: 0,
        seekTo: null as number | null,
        dragging: false,
        dragProgress: 0,
        audio: false
    },
    reducers: {
        setForwardSrc: (state, action) => {state.forwardSrc = action.payload},
        setReverseSrc: (state, action) => {state.reverseSrc = action.payload},
        setSubtitleSrc: (state, action) => {state.subtitleSrc = action.payload},
        setReverse: (state, action) => {state.reverse = action.payload},
        setSpeed: (state, action) => {state.speed = action.payload},
        setPreservesPitch: (state, action) => {state.preservesPitch = action.payload},
        setDuration: (state, action) => {state.duration = action.payload},
        setPrevVolume: (state, action) => {state.prevVolume = action.payload},
        setVolume: (state, action) => {state.volume = action.payload},
        setPaused: (state, action) => {state.paused = action.payload},
        setSubtitles: (state, action) => {state.subtitles = action.payload},
        setLoop: (state, action) => {state.loop = action.payload},
        setABLoop: (state, action) => {state.abloop = action.payload},
        setLoopStart: (state, action) => {state.loopStart = action.payload},
        setLoopEnd: (state, action) => {state.loopEnd = action.payload},
        setSavedLoop: (state, action) => {state.savedLoop = action.payload},
        setPreviousVolume: (state, action) => {state.previousVolume = action.payload},
        setProgress: (state, action) => {state.progress = action.payload},
        setSecondsProgress: (state, action) => {state.secondsProgress = action.payload},
        setSeekTo: (state, action) => {state.seekTo = action.payload},
        setDragging: (state, action) => {state.dragging = action.payload},
        setDragProgress: (state, action) => {state.dragProgress = action.payload},
        setAudio: (state, action) => {state.audio = action.payload}
    }
})

const {
    setForwardSrc, setReverseSrc, setSubtitleSrc, setReverse,
    setSpeed, setPreservesPitch, setDuration, setPrevVolume,
    setVolume, setPaused, setSubtitles, setLoop, setABLoop,
    setLoopStart, setLoopEnd, setSavedLoop, setPreviousVolume,
    setProgress, setSecondsProgress, setSeekTo, setDragging,
    setDragProgress, setAudio
} = playbackSlice.actions

export const usePlaybackSelector = () => {
    const selector = useSelector.withTypes<StoreState>()
    return {
        forwardSrc: selector((state) => state.playback.forwardSrc),
        reverseSrc: selector((state) => state.playback.reverseSrc),
        subtitleSrc: selector((state) => state.playback.subtitleSrc),
        reverse: selector((state) => state.playback.reverse),
        speed: selector((state) => state.playback.speed),
        preservesPitch: selector((state) => state.playback.preservesPitch),
        duration: selector((state) => state.playback.duration),
        prevVolume: selector((state) => state.playback.prevVolume),
        volume: selector((state) => state.playback.volume),
        paused: selector((state) => state.playback.paused),
        subtitles: selector((state) => state.playback.subtitles),
        loop: selector((state) => state.playback.loop),
        abloop: selector((state) => state.playback.abloop),
        loopStart: selector((state) => state.playback.loopStart),
        loopEnd: selector((state) => state.playback.loopEnd),
        savedLoop: selector((state) => state.playback.savedLoop),
        previousVolume: selector((state) => state.playback.previousVolume),
        progress: selector((state) => state.playback.progress),
        secondsProgress: selector((state) => state.playback.secondsProgress),
        seekTo: selector((state) => state.playback.seekTo),
        dragging: selector((state) => state.playback.dragging),
        dragProgress: selector((state) => state.playback.dragProgress),
        audio: selector((state) => state.playback.audio)
    }
}

export const usePlaybackActions = () => {
    const dispatch = useDispatch.withTypes<StoreDispatch>()()
    return {
        setForwardSrc: (state: string | null) => dispatch(setForwardSrc(state)),
        setReverseSrc: (state: string | null) => dispatch(setReverseSrc(state)),
        setSubtitleSrc: (state: string | null) => dispatch(setSubtitleSrc(state)),
        setReverse: (state: boolean) => dispatch(setReverse(state)),
        setSpeed: (state: number) => dispatch(setSpeed(state)),
        setPreservesPitch: (state: boolean) => dispatch(setPreservesPitch(state)),
        setDuration: (state: number) => dispatch(setDuration(state)),
        setPrevVolume: (state: number) => dispatch(setPrevVolume(state)),
        setVolume: (state: number) => dispatch(setVolume(state)),
        setPaused: (state: boolean) => dispatch(setPaused(state)),
        setSubtitles: (state: boolean) => dispatch(setSubtitles(state)),
        setLoop: (state: boolean) => dispatch(setLoop(state)),
        setABLoop: (state: boolean) => dispatch(setABLoop(state)),
        setLoopStart: (state: number) => dispatch(setLoopStart(state)),
        setLoopEnd: (state: number) => dispatch(setLoopEnd(state)),
        setSavedLoop: (state: number[]) => dispatch(setSavedLoop(state)),
        setPreviousVolume: (state: number) => dispatch(setPreviousVolume(state)),
        setProgress: (state: number) => dispatch(setProgress(state)),
        setSecondsProgress: (state: number) => dispatch(setSecondsProgress(state)),
        setSeekTo: (state: number | null) => dispatch(setSeekTo(state)),
        setDragging: (state: boolean) => dispatch(setDragging(state)),
        setDragProgress: (state: number) => dispatch(setDragProgress(state)),
        setAudio: (state: boolean) => dispatch(setAudio(state))
    }
}

export default playbackSlice.reducer