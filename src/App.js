import React, { useState, useEffect, useRef } from "react";
import Play from "./Play";
import Pause from "./Pause";
import RotateCcw from "./RotateCcw";
import Settings from "./Settings";

function PomodoroApp() {
    const [workTime, setWorkTime] = useState(25);
    const [breakTime, setBreakTime] = useState(5);
    const [currentTime, setCurrentTime] = useState(workTime * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [completedSessions, setCompletedSessions] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallButton, setShowInstallButton] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const intervalRef = useRef(null);

    // Load data from localStorage on component mount
    useEffect(() => {
        const savedData = localStorage.getItem("pomodoroData");
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                setWorkTime(data.workTime || 25);
                setBreakTime(data.breakTime || 5);
                setCompletedSessions(data.completedSessions || 0);
                setCurrentTime(
                    data.currentTime || data.workTime * 60 || 25 * 60
                );
                setIsBreak(data.isBreak || false);
            } catch (error) {
                console.log("Error loading saved data:", error);
            }
        }
    }, []);

    // Save data to localStorage whenever state changes
    useEffect(() => {
        const dataToSave = {
            workTime,
            breakTime,
            completedSessions,
            currentTime,
            isBreak,
            lastSaved: Date.now(),
        };
        localStorage.setItem("pomodoroData", JSON.stringify(dataToSave));
    }, [workTime, breakTime, completedSessions, currentTime, isBreak]);

    // Online/offline detection
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    useEffect(() => {
        if (isRunning && currentTime > 0) {
            intervalRef.current = setInterval(() => {
                setCurrentTime((prev) => prev - 1);
            }, 1000);
        } else if (currentTime === 0) {
            // Session completed - Send notification
            if (
                "Notification" in window &&
                Notification.permission === "granted"
            ) {
                new Notification(
                    isBreak ? "Break time is over!" : "Work session completed!",
                    {
                        body: isBreak
                            ? "Time to get back to work!"
                            : "Time for a break!",
                        icon: "/logo192.png",
                        badge: "/favicon.ico",
                        vibrate: [200, 100, 200],
                    }
                );
            }

            if (!isBreak) {
                setCompletedSessions((prev) => prev + 1);
                setIsBreak(true);
                setCurrentTime(breakTime * 60);
            } else {
                setIsBreak(false);
                setCurrentTime(workTime * 60);
            }
            setIsRunning(false);
        } else {
            clearInterval(intervalRef.current);
        }

        return () => clearInterval(intervalRef.current);
    }, [isRunning, currentTime, workTime, breakTime, isBreak]);

    // PWA Installation prompt
    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener(
            "beforeinstallprompt",
            handleBeforeInstallPrompt
        );

        // Request notification permission on load
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => {
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt
            );
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            console.log("User accepted the install prompt");
        }

        setDeferredPrompt(null);
        setShowInstallButton(false);
    };

    const toggleTimer = () => {
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setIsBreak(false);
        setCurrentTime(workTime * 60);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    };

    const progress = isBreak
        ? ((breakTime * 60 - currentTime) / (breakTime * 60)) * 100
        : ((workTime * 60 - currentTime) / (workTime * 60)) * 100;

    const circumference = 2 * Math.PI * 120;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const updateWorkTime = (value) => {
        const newTime = Math.max(1, Math.min(60, value));
        setWorkTime(newTime);
        if (!isBreak && !isRunning) {
            setCurrentTime(newTime * 60);
        }
    };

    const updateBreakTime = (value) => {
        const newTime = Math.max(1, Math.min(30, value));
        setBreakTime(newTime);
        if (isBreak && !isRunning) {
            setCurrentTime(newTime * 60);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-4">
            <div className="w-96 h-96 flex flex-col justify-between p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-neutral-400">
                            Sessions:{" "}
                            <span className="text-green-400 font-semibold">
                                {completedSessions}
                            </span>
                        </div>
                        {!isOnline && (
                            <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                                Offline
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {showInstallButton && (
                            <button
                                onClick={handleInstallClick}
                                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                                title="Install as app"
                            >
                                Install
                            </button>
                        )}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors"
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="absolute top-16 left-0 right-0 bg-neutral-800 rounded-lg p-4 space-y-3 z-10">
                        <h3 className="text-lg font-semibold mb-2">Settings</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-neutral-300 mb-1">
                                    Work Time: {workTime}m
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="60"
                                    value={workTime}
                                    onChange={(e) =>
                                        updateWorkTime(parseInt(e.target.value))
                                    }
                                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-neutral-300 mb-1">
                                    Break Time: {breakTime}m
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="30"
                                    value={breakTime}
                                    onChange={(e) =>
                                        updateBreakTime(
                                            parseInt(e.target.value)
                                        )
                                    }
                                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Timer Display */}
                <div className="relative flex items-center justify-center flex-1">
                    <svg
                        className="w-48 h-48 transform -rotate-90"
                        viewBox="0 0 256 256"
                    >
                        {/* Background circle */}
                        <circle
                            cx="128"
                            cy="128"
                            r="120"
                            fill="none"
                            stroke="rgb(64, 64, 64)"
                            strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="128"
                            cy="128"
                            r="120"
                            fill="none"
                            stroke={
                                isBreak
                                    ? "rgb(34, 197, 94)"
                                    : "rgb(249, 115, 22)"
                            }
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 ease-in-out"
                        />
                    </svg>

                    {/* Timer content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold mb-2">
                            {formatTime(currentTime)}
                        </div>
                        <div className="text-xs text-neutral-400 mb-4">
                            {isBreak ? "Break Time" : "Focus Time"}
                        </div>

                        {/* Main control button */}
                        <button
                            onClick={toggleTimer}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 ${
                                isRunning
                                    ? "bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30"
                                    : "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
                            }`}
                        >
                            {isRunning ? (
                                <Pause size={24} />
                            ) : (
                                <Play size={24} className="ml-1" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Bottom section */}
                <div className="flex flex-col items-center space-y-3">
                    <button
                        onClick={resetTimer}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors text-sm"
                    >
                        <RotateCcw size={16} />
                        Reset
                    </button>

                    <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                            isBreak
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        }`}
                    >
                        <div
                            className={`w-1.5 h-1.5 rounded-full ${
                                isBreak ? "bg-green-400" : "bg-orange-400"
                            }`}
                        ></div>
                        {isRunning
                            ? isBreak
                                ? "Taking a break"
                                : "Stay focused"
                            : "Paused"}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .slider::-webkit-slider-thumb {
                    appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #f97316;
                    cursor: pointer;
                    border: 2px solid #262626;
                }

                .slider::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #f97316;
                    cursor: pointer;
                    border: 2px solid #262626;
                }
            `}</style>
        </div>
    );
}

export default PomodoroApp;
