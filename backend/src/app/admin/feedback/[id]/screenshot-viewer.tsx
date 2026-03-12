"use client";

import { useState } from "react";

interface ScreenshotViewerProps {
    screenshot: string;
}

export default function ScreenshotViewer({ screenshot }: ScreenshotViewerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                    Screenshot
                </h3>
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full focus:outline-none group"
                >
                    <img
                        src={screenshot}
                        alt="Page screenshot"
                        className="w-full rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    />
                </button>
                <p className="text-xs text-gray-400 mt-2 text-center">Click to view full size</p>
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="relative max-w-full max-h-full flex items-center justify-center animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors focus:outline-none"
                            aria-label="Close"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img
                            src={screenshot}
                            alt="Page screenshot full size"
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl border border-white/10 object-contain"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
