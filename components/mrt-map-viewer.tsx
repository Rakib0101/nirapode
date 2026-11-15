"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

export function MRTMapViewer({ onClose }: { onClose?: () => void }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartDist = useRef<number | null>(null);

  const zoomIn = () => setScale((s) => Math.min(s + 0.5, 5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.5, 0.8));
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.8), 5));
  };

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch handlers (Pinch to zoom & pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDist.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchStartDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDist.current;
      setScale((prev) => Math.min(Math.max(prev * factor, 0.8), 5));
      touchStartDist.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDist.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white select-none">
      {/* Viewer Floating Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shrink-0 z-10">
        <div className="flex items-center gap-2">
          {/* Full-screen means no navbar, so the only way out has to live
              here. The modal has its own close button (see onClose). */}
          {!onClose && (
            <Link
              href="/"
              aria-label="Back"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 mr-1 text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
          )}
          <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
            Zoom: {Math.round(scale * 100)}%
          </span>
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={zoomOut}
              aria-label="Zoom out"
              className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={resetZoom}
              className="px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              title="Reset Zoom"
            >
              Fit
            </button>
            <button
              onClick={zoomIn}
              aria-label="Zoom in"
              className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 hidden md:inline ml-2">
            💡 Scroll or drag to pan around
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* The PDF links are gone on purpose: the map is for viewing.
              Opening the PDF navigated out of the app with no way back,
              which is what the client reported. */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Map Canvas Container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 relative overflow-hidden flex items-center justify-center bg-slate-950 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.15s ease-out",
            transformOrigin: "center center",
          }}
          className="w-full h-full max-w-4xl max-h-[85vh] flex items-center justify-center p-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mrt-map.png"
            alt="Singapore MRT & LRT System Map Ultra HD"
            draggable={false}
            className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-none"
            style={{ imageRendering: "auto" }}
          />
        </div>
      </div>
    </div>
  );
}
