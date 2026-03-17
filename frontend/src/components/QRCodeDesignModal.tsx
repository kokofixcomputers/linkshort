import { useState } from 'react'
import { X, Download } from 'lucide-react'
import { Link } from '../lib/types'
import './QRCodeDesignModal.css'

interface Props {
  link: Link | null
  onClose: () => void
  onSave: (qrData: { logo: boolean; color: string }) => void
}

const PRESET_COLORS = [
  '#000000', '#1e40af', '#dc2626', '#059669', 
  '#7c3aed', '#ea580c', '#0891b2', '#be123c'
]

export default function QRCodeDesignModal({ link, onClose, onSave }: Props) {
  const [logo, setLogo] = useState(false)
  const [color, setColor] = useState('#000000')
  const [customColor, setCustomColor] = useState('')

  const handleSave = () => {
    onSave({ logo, color: customColor || color })
    onClose()
  }

  const handleColorSelect = (selectedColor: string) => {
    setColor(selectedColor)
    setCustomColor('')
  }

  const handleCustomColorChange = (value: string) => {
    setCustomColor(value)
    setColor('#000000')
  }

  if (!link) return null

  return (
    <div className="qr-modal-overlay">
      <div className="qr-modal">
        <div className="qr-modal-header">
          <h2>QR Code</h2>
          <button className="qr-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="qr-modal-content">
          {/* QR Code Preview */}
          <div className="qr-preview-section">
            <div className="qr-preview-container">
              <div className="qr-code-preview" style={{ backgroundColor: '#fff' }}>
                {/* This would be the actual QR code component */}
                <div className="qr-placeholder" style={{ color: customColor || color }}>
                  QR Code
                </div>
                {logo && (
                  <div className="qr-logo-overlay">
                    <div className="qr-logo-icon">🔗</div>
                  </div>
                )}
              </div>
            </div>
            <div className="qr-link-info">
              <div className="qr-link-url">{link.domain}/{link.short_code}</div>
              <button className="qr-download-btn">
                <Download size={14} />
                Download
              </button>
            </div>
          </div>

          {/* Customization Options */}
          <div className="qr-options-section">
            <div className="qr-option-group">
              <div className="qr-option-header">
                <label className="qr-toggle-label">
                  <input
                    type="checkbox"
                    className="qr-toggle"
                    checked={logo}
                    onChange={(e) => setLogo(e.target.checked)}
                  />
                  <span className="qr-toggle-slider"></span>
                  <span className="qr-toggle-text">Logo</span>
                </label>
              </div>
            </div>

            <div className="qr-option-group">
              <div className="qr-option-header">
                <label className="qr-color-label">QR Code Color</label>
              </div>
              <div className="qr-color-presets">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    className={`qr-color-preset ${color === presetColor && !customColor ? 'active' : ''}`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => handleColorSelect(presetColor)}
                  />
                ))}
              </div>
              <div className="qr-custom-color">
                <input
                  type="text"
                  className="qr-color-input"
                  placeholder="#000000"
                  value={customColor}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="qr-modal-footer">
          <button className="qr-btn qr-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="qr-btn qr-btn-primary" onClick={handleSave}>
            Download
          </button>
        </div>
      </div>
    </div>
  )
}
