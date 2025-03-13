'use client'

import { useState, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import JSZip from 'jszip'

interface PreviewCarouselProps {
  images: string[]
  onClose: () => void
}

export default function PreviewCarousel({ images, onClose }: PreviewCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev))
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev))
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [images.length, onClose])

  const handleDownload = async () => {
    try {
      const zip = new JSZip()
      images.forEach((image, index) => {
        const base64Data = image.split(',')[1]
        zip.file(`image_${index + 1}.png`, base64Data, { base64: true })
      })

      const content = await zip.generateAsync({ type: 'blob' })
      const url = window.URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = 'images.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading images:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
      >
        <XMarkIcon className="w-8 h-8" />
      </button>

      {/* Left arrow */}
      <button
        onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev))}
        className="absolute left-4 text-white hover:text-gray-300 transition-colors"
        disabled={currentIndex === 0}
      >
        <ChevronLeftIcon className="w-12 h-12" />
      </button>

      {/* Image container */}
      <div className="relative w-full max-w-[1080px] aspect-[3/4] mx-4">
        <img
          src={images[currentIndex]}
          alt={`Preview ${currentIndex + 1}`}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Right arrow */}
      <button
        onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev))}
        className="absolute right-4 text-white hover:text-gray-300 transition-colors"
        disabled={currentIndex === images.length - 1}
      >
        <ChevronRightIcon className="w-12 h-12" />
      </button>

      {/* Page indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>

      {/* Export button */}
      <button
        onClick={handleDownload}
        className="absolute bottom-4 right-4 bg-white text-black px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-gray-100 transition-colors"
      >
        <ArrowDownTrayIcon className="w-5 h-5" />
        <span>导出</span>
      </button>
    </div>
  )
} 