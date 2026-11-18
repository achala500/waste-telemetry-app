'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, MessageSquare, PenTool, Square, Type, Undo, X, ArrowUpRight } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: {
    category: 'bug' | 'feature' | 'ux' | 'other';
    description: string;
    annotatedScreenshotUrl?: string;
  }) => Promise<void>;
}

type Tool = 'pen' | 'rect' | 'arrow' | 'text';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [category, setCategory] = useState<'bug' | 'feature' | 'ux' | 'other'>('ux');
  const [description, setDescription] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [penColor, setPenColor] = useState('#A3E635');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const historyRef = useRef<ImageData[]>([]);

  // Capture viewport screen
  const captureScreen = async () => {
    try {
      // Use SVG foreignObject or simple fallback HTML5 snapshot
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#08080A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#141416';
        ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
        ctx.fillStyle = '#A3E635';
        ctx.font = '24px sans-serif';
        ctx.fillText('CHRONO // TELEMETRY Screenshot Snapshot', 60, 90);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '16px sans-serif';
        ctx.fillText(`Captured at ${new Date().toLocaleTimeString()} on ${window.location.pathname}`, 60, 130);
        setScreenshotData(canvas.toDataURL('image/png'));
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (screenshotData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = 600;
        canvas.height = (img.height / img.width) * 600 || 360;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (ctx) {
          historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
        }
      };
      img.src = screenshotData;
    }
  }, [screenshotData]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    startPos.current = { x, y };
    setIsDrawing(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    if (activeTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'pen') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    ctx.strokeStyle = penColor;
    ctx.fillStyle = penColor;
    ctx.lineWidth = 3;

    if (activeTool === 'rect') {
      const width = endX - startPos.current.x;
      const height = endY - startPos.current.y;
      ctx.strokeRect(startPos.current.x, startPos.current.y, width, height);
    } else if (activeTool === 'arrow') {
      // Draw arrow line
      ctx.beginPath();
      ctx.moveTo(startPos.current.x, startPos.current.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      // Arrowhead
      const angle = Math.atan2(endY - startPos.current.y, endX - startPos.current.x);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - 15 * Math.cos(angle - Math.PI / 6), endY - 15 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(endX - 15 * Math.cos(angle + Math.PI / 6), endY - 15 * Math.sin(angle + Math.PI / 6));
      ctx.fill();
    } else if (activeTool === 'text') {
      const text = prompt('Enter annotation text:');
      if (text) {
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(text, endX, endY);
      }
    }

    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    const ctx = canvas.getContext('2d');
    if (ctx && prev) {
      ctx.putImageData(prev, 0, 0);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setIsSubmitting(true);
    let finalScreenshotUrl = screenshotData || undefined;
    if (canvasRef.current) {
      finalScreenshotUrl = canvasRef.current.toDataURL('image/png');
    }

    await onSubmit({
      category,
      description,
      annotatedScreenshotUrl: finalScreenshotUrl
    });

    setIsSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#141416] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] spring-popover">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#A3E635]/10 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Share Visual Feedback</h2>
              <p className="text-xs text-zinc-400">Captured and triaged directly by our nightly Swarm system</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Feedback Category</label>
            <div className="grid grid-cols-4 gap-2">
              {(['ux', 'bug', 'feature', 'other'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all uppercase tracking-wider ${
                    category === cat
                      ? 'bg-[#A3E635] text-black border-[#A3E635]'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {cat === 'ux' ? 'UX Refinement' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Description / What felt confusing or broken?</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. The 24-hr timeline was hard to tap on mobile at 12:30 PM, or button felt sluggish..."
              className="w-full bg-[#08080A] border border-white/10 rounded-2xl p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#A3E635] transition-colors"
            />
          </div>

          {/* Screenshot Studio */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-400">Screenshot & Visual Annotation Studio</label>
              {!screenshotData && (
                <button
                  onClick={captureScreen}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#A3E635] hover:bg-white/10 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Auto-Capture Screen
                </button>
              )}
            </div>

            {screenshotData ? (
              <div className="space-y-2">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#08080A] border border-white/10">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveTool('pen')}
                      className={`p-1.5 rounded-lg text-xs ${activeTool === 'pen' ? 'bg-[#A3E635] text-black' : 'text-zinc-400 hover:text-white'}`}
                      title="Freehand Pen"
                    >
                      <PenTool className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTool('rect')}
                      className={`p-1.5 rounded-lg text-xs ${activeTool === 'rect' ? 'bg-[#A3E635] text-black' : 'text-zinc-400 hover:text-white'}`}
                      title="Highlight Rectangle"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTool('arrow')}
                      className={`p-1.5 rounded-lg text-xs ${activeTool === 'arrow' ? 'bg-[#A3E635] text-black' : 'text-zinc-400 hover:text-white'}`}
                      title="Arrow"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTool('text')}
                      className={`p-1.5 rounded-lg text-xs ${activeTool === 'text' ? 'bg-[#A3E635] text-black' : 'text-zinc-400 hover:text-white'}`}
                      title="Text Callout"
                    >
                      <Type className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Colors */}
                    {['#A3E635', '#F43F5E', '#38BDF8', '#FFFFFF'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setPenColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-4 h-4 rounded-full border ${penColor === c ? 'border-white scale-125' : 'border-transparent'}`}
                      />
                    ))}
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <button
                      onClick={handleUndo}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"
                      title="Undo annotation"
                    >
                      <Undo className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setScreenshotData(null)}
                      className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-white/5"
                      title="Clear screenshot"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Canvas */}
                <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-black flex justify-center">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className="cursor-crosshair max-w-full h-auto"
                  />
                </div>
              </div>
            ) : (
              <div
                onClick={captureScreen}
                className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-2xl p-6 text-center cursor-pointer transition-colors"
              >
                <Camera className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">Click to capture current UI view or annotate a screenshot</p>
                <p className="text-[10px] text-zinc-600 mt-1">Helps the Swarm visualize exactly what needs fixing</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-zinc-500">Auto-saved to User_Feedback tab</span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !description.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#A3E635] text-black hover:bg-[#86efac] active:scale-95 transition-all disabled:opacity-50"
            >
              {submitted ? (
                <>
                  <Check className="w-4 h-4" /> Submitted!
                </>
              ) : isSubmitting ? (
                'Submitting...'
              ) : (
                'Submit Feedback'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
