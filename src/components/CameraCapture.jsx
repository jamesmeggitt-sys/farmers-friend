import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function CameraCapture({ label, onCapture, captured, onRetake }) {
  const { farm } = useAuth()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [streaming, setStreaming] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [timestamp, setTimestamp] = useState(null)

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setStreaming(true)
    } catch {
      alert('Camera access denied or unavailable. Please allow camera permissions.')
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStreaming(false)
  }

  async function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    const now = new Date()
    const ts = now.toLocaleString('en-AU', { hour12: false })
    setTimestamp(ts)

    // Burn timestamp + farm name into photo
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40)
    ctx.fillStyle = '#e8c560'
    ctx.font = 'bold 16px monospace'
    ctx.fillText(`${farm?.name || 'Farm'} — ${ts}`, 10, canvas.height - 12)

    stopStream()

    // Upload to Supabase Storage
    canvas.toBlob(async (blob) => {
      setUploading(true)
      try {
        const path = `${farm?.id}/${Date.now()}.jpg`
        const { data, error } = await supabase.storage
          .from('shed-photos')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from('shed-photos')
          .getPublicUrl(data.path)

        onCapture({ url: publicUrl, dataUrl: canvas.toDataURL('image/jpeg', 0.85), timestamp: now.toISOString() })
      } catch (err) {
        console.error('Photo upload failed:', err)
        // Fall back to local dataUrl if storage not configured yet
        onCapture({ url: null, dataUrl: canvas.toDataURL('image/jpeg', 0.85), timestamp: now.toISOString() })
      } finally {
        setUploading(false)
      }
    }, 'image/jpeg', 0.85)
  }

  function retake() {
    onRetake()
    setTimestamp(null)
  }

  return (
    <div className="form-group full">
      <label>{label}</label>
      <div className="camera-box">
        {!captured && !streaming && (
          <div className="cam-placeholder">
            <span className="icon">📷</span>
            <span>Camera inactive</span>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ display: streaming ? 'block' : 'none' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {captured && (
          <>
            <img className="preview" src={captured.dataUrl} alt="Captured" />
            {timestamp && <div className="cam-ts-overlay">{timestamp}</div>}
          </>
        )}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span className="spinner" />
            <span style={{ fontSize: '0.85rem', color: 'var(--hay)' }}>Uploading photo...</span>
          </div>
        )}
      </div>
      <div className="cam-controls">
        {!captured && !streaming && (
          <button type="button" className="btn btn-iron btn-sm" onClick={startCamera}>▶ Start Camera</button>
        )}
        {streaming && (
          <>
            <button type="button" className="btn btn-rust btn-sm" onClick={capture}>📸 Capture</button>
            <button type="button" className="btn btn-iron btn-sm" onClick={stopStream}>✕ Cancel</button>
          </>
        )}
        {captured && !uploading && (
          <button type="button" className="btn btn-iron btn-sm" onClick={retake}>↩ Retake</button>
        )}
      </div>
    </div>
  )
}
