
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PlayIcon, PauseIcon, UploadIcon } from './components/icons';

const ASCII_RAMP = '`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
const DEFAULT_RESOLUTION = 150;
const FONT_SIZE_ADJUST = 0.5; // Adjust this to get square-like characters

const FileUploader: React.FC<{ onFileSelect: (file: File) => void }> = ({ onFileSelect }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="p-8 border-2 border-dashed border-gray-600 rounded-xl text-center cursor-pointer hover:border-teal-400 hover:text-teal-400 transition-colors duration-300">
            <label htmlFor="video-upload" className="cursor-pointer">
                <div className="flex flex-col items-center">
                    <UploadIcon className="w-16 h-16 mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">Upload Video</h2>
                    <p>Click here or drag and drop a video file</p>
                </div>
                <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            onFileSelect(e.target.files[0]);
                        }
                    }}
                />
            </label>
        </div>
    </div>
);

export default function App() {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [asciiArt, setAsciiArt] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [resolution, setResolution] = useState<number>(DEFAULT_RESOLUTION);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();

    const handleFileChange = (file: File) => {
        const url = URL.createObjectURL(file);
        setVideoSrc(url);
        setIsPlaying(false);
    };

    const convertToAscii = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) return;
        
        const aspectRatio = video.videoHeight / video.videoWidth;
        const canvasWidth = resolution;
        const canvasHeight = Math.floor(aspectRatio * canvasWidth * FONT_SIZE_ADJUST);

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
        
        try {
            const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
            let asciiString = '';

            for (let y = 0; y < canvasHeight; y++) {
                for (let x = 0; x < canvasWidth; x++) {
                    const offset = (y * canvasWidth + x) * 4;
                    const r = imageData[offset];
                    const g = imageData[offset + 1];
                    const b = imageData[offset + 2];
                    
                    const gray = 0.21 * r + 0.72 * g + 0.07 * b;
                    const rampIndex = Math.floor((gray / 255) * (ASCII_RAMP.length - 1));
                    asciiString += ASCII_RAMP[rampIndex];
                }
                asciiString += '\n';
            }
            setAsciiArt(asciiString);
        } catch (error) {
            console.error("Failed to get image data:", error);
        }
    }, [resolution]);

    const animate = useCallback(() => {
        convertToAscii();
        animationFrameId.current = requestAnimationFrame(animate);
    }, [convertToAscii]);
    
    useEffect(() => {
        if (isPlaying) {
            videoRef.current?.play();
            animationFrameId.current = requestAnimationFrame(animate);
        } else {
            videoRef.current?.pause();
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        }
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isPlaying, animate]);

    const togglePlayPause = () => {
        if (videoRef.current?.src) {
            setIsPlaying(!isPlaying);
        }
    };
    
    const handleVideoLoaded = () => {
        if (videoRef.current) {
            setDimensions({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
            convertToAscii(); // Generate initial frame
        }
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            convertToAscii();
        }
    };

    const fontSize = `calc(100vw / ${resolution} * 0.9)`;
    const lineHeight = `calc(100vw / ${resolution} * 0.9 / ${FONT_SIZE_ADJUST})`;
    
    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center p-4 md:p-8 font-mono">
            <header className="w-full max-w-7xl text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-teal-400 tracking-wider">
                    ASCII Video Converter
                </h1>
                <p className="text-gray-400 mt-2">Transform your videos into character art.</p>
            </header>

            <main className="w-full max-w-7xl flex-grow flex items-center justify-center">
                {!videoSrc ? (
                    <FileUploader onFileSelect={handleFileChange} />
                ) : (
                    <div className="w-full flex flex-col items-center">
                        <div className="w-full bg-black rounded-lg overflow-hidden shadow-2xl shadow-teal-900/50 mb-6">
                            <pre
                                className="text-teal-300 w-full"
                                style={{
                                    fontSize: fontSize,
                                    lineHeight: lineHeight,
                                    letterSpacing: '0.05em',
                                    fontFamily: 'ui-monospace, "Courier New", Courier, monospace',
                                    whiteSpace: 'pre',
                                }}
                            >
                                {asciiArt}
                            </pre>
                        </div>
                    </div>
                )}
            </main>
            
            <video
                ref={videoRef}
                src={videoSrc || ''}
                onLoadedMetadata={handleVideoLoaded}
                onEnded={handleVideoEnded}
                className="hidden"
                playsInline
                muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {videoSrc && (
                <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-700">
                    <div className="max-w-4xl mx-auto flex items-center justify-center gap-4 md:gap-8">
                        <button
                            onClick={togglePlayPause}
                            className="p-3 bg-teal-500 rounded-full text-gray-900 hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200"
                        >
                            {isPlaying ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                        </button>
                        <div className="flex-grow flex items-center gap-3 text-sm">
                            <label htmlFor="resolution" className="whitespace-nowrap">Resolution</label>
                            <input
                                id="resolution"
                                type="range"
                                min="50"
                                max="300"
                                value={resolution}
                                onChange={(e) => setResolution(Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                            />
                            <span className="w-12 text-center bg-gray-800 p-1 rounded-md">{resolution}</span>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}
