'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import JSZip from 'jszip'
import { generateImage, downloadImage, splitMarkdownIntoPages } from '@/utils/image'
import { ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor'), {
  ssr: false,
})

export default function Home() {
  const [markdown, setMarkdown] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const handleGenerate = async () => {
    if (!markdown.trim()) return

    setIsGenerating(true)
    try {
      // 分割文本为多页
      const pages = splitMarkdownIntoPages(markdown)
      
      // 生成每页的图片
      const generatedImages = await Promise.all(
        pages.map(page => generateImage(page))
      )
      
      setImages(generatedImages)
      setCurrentImageIndex(0)
    } catch (error) {
      console.error('Error generating images:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (images.length === 0) return

    setIsDownloading(true)
    try {
      // 创建一个 zip 文件
      const zip = new JSZip()
      images.forEach((image, index) => {
        const base64Data = image.split(',')[1]
        zip.file(`image_${index + 1}.png`, base64Data, { base64: true })
      })

      // 下载 zip 文件
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
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShare = async () => {
    if (images.length === 0) return

    setIsSharing(true)
    try {
      // 这里添加分享到相册的逻辑
      console.log('Sharing to gallery...')
    } catch (error) {
      console.error('Error sharing to gallery:', error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧编辑器 */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">小红书 Markdown 格式化工具</h1>
              <MarkdownEditor value={markdown} onChange={setMarkdown} />
              <p className="mt-2 text-sm text-gray-500">
                使用 "---" 作为分页符，将内容分成多页
              </p>
            </div>
          </div>

          {/* 右侧预览和操作区 */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex space-x-4">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !markdown.trim()}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGenerating ? '生成中...' : '生成预览'}
                  </button>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading || images.length === 0}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDownloading ? '下载中...' : '下载ZIP'}
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={isSharing || images.length === 0}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSharing ? '分享中...' : '分享到相册'}
                  </button>
                </div>
              </div>
            </div>

            {/* 预览区域 */}
            {images.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">预览</h2>
                <div className="relative">
                  {/* 图片容器 */}
                  <div className="aspect-[3/4] relative bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={images[currentImageIndex]}
                      alt={`Preview ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* 导航按钮 */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : prev))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        disabled={currentImageIndex === 0}
                      >
                        <ChevronLeftIcon className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(prev => (prev < images.length - 1 ? prev + 1 : prev))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        disabled={currentImageIndex === images.length - 1}
                      >
                        <ChevronRightIcon className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* 页码指示器 */}
                  <div className="mt-4 flex justify-center space-x-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-gray-900' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
} 