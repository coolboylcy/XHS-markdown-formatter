const puppeteer = require('puppeteer')
const MarkdownIt = require('markdown-it')

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
})

// 修改 Puppeteer 启动配置以适配 Vercel 环境
const getBrowser = async () => {
  return await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let browser = null
  try {
    const { markdown } = req.body

    if (!markdown) {
      return res.status(400).json({ error: 'Markdown content is required' })
    }

    // Convert markdown to HTML
    const html = md.render(markdown)

    // Launch browser with Vercel-compatible configuration
    browser = await getBrowser()

    // Create new page
    const page = await browser.newPage()

    // Set viewport to 3:4 aspect ratio
    await page.setViewport({
      width: 1080,
      height: 1440,
    })

    // Calculate optimal font size based on content
    const textLength = html.replace(/<[^>]*>/g, '').length
    const lines = html.split('\n').length
    const paragraphs = html.split('\n\n').length

    // 计算图片可用空间（考虑内边距）
    const imageWidth = 1080
    const imageHeight = 1440
    const padding = 80 // 左右各40px的内边距
    const availableWidth = imageWidth - padding
    const availableHeight = imageHeight - padding

    // 根据文本长度和行数计算最佳字体大小
    let fontSize = 1.2
    let lineHeight = 1.8
    let paragraphSpacing = 1.2

    // 计算每行可以容纳的字符数（假设中文字符宽度为1em，英文字符宽度为0.5em）
    const charsPerLine = Math.floor(availableWidth / (fontSize * 16)) // 16px是1em的基准值
    const estimatedLines = Math.ceil(textLength / charsPerLine)

    // 根据内容长度和行数动态调整字体大小
    if (textLength < 50) {
      fontSize = 3.2
      lineHeight = 2.0
      paragraphSpacing = 1.5
    } else if (textLength < 100) {
      fontSize = 2.8
      lineHeight = 1.9
      paragraphSpacing = 1.4
    } else if (textLength < 200) {
      fontSize = 2.2
      lineHeight = 1.8
      paragraphSpacing = 1.3
    } else if (textLength < 300) {
      fontSize = 1.8
      lineHeight = 1.7
      paragraphSpacing = 1.2
    } else if (textLength < 500) {
      fontSize = 1.5
      lineHeight = 1.6
      paragraphSpacing = 1.1
    } else {
      fontSize = 1.2
      lineHeight = 1.5
      paragraphSpacing = 1.0
    }

    // 如果行数过多，进一步减小字体大小
    if (estimatedLines > 20) {
      fontSize *= 0.8
      lineHeight *= 0.9
      paragraphSpacing *= 0.9
    }

    // 如果行数过少，适当增加字体大小
    if (estimatedLines < 5) {
      fontSize *= 1.2
      lineHeight *= 1.1
      paragraphSpacing *= 1.1
    }

    // 确保字体大小在合理范围内
    fontSize = Math.max(1.0, Math.min(3.5, fontSize))
    lineHeight = Math.max(1.4, Math.min(2.2, lineHeight))
    paragraphSpacing = Math.max(1.0, Math.min(1.8, paragraphSpacing))

    // Set content with styles
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap');
            
            body {
              font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: ${lineHeight};
              color: #333;
              padding: 40px;
              margin: 0;
              background: #fff;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .content {
              max-width: 100%;
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: ${paragraphSpacing}em;
              position: relative;
            }
            .content::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              pointer-events: none;
              background: linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0));
            }
            h1, h2, h3, h4, h5, h6 {
              margin: 0;
              font-weight: 700;
              line-height: 1.4;
              color: #FF2442;
            }
            h1 { 
              font-size: ${fontSize * 1.8}em;
              margin-bottom: 0.8em;
              text-align: center;
              letter-spacing: 0.05em;
              position: relative;
            }
            h1::after {
              content: '';
              display: block;
              width: 60px;
              height: 3px;
              background: #FF2442;
              margin: 0.4em auto;
              border-radius: 2px;
            }
            h2 { 
              font-size: ${fontSize * 1.5}em;
              margin-bottom: 0.6em;
              color: #333;
            }
            h3 { 
              font-size: ${fontSize * 1.3}em;
              margin-bottom: 0.4em;
              color: #333;
            }
            p {
              margin: 0;
              font-size: ${fontSize}em;
              letter-spacing: 0.02em;
              text-align: justify;
              text-justify: inter-ideograph;
            }
            img {
              max-width: 100%;
              height: auto;
              border-radius: 12px;
              margin: 1.2em 0;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            code {
              background: #f8f9fa;
              padding: 0.2em 0.4em;
              border-radius: 4px;
              font-size: 0.95em;
              color: #e83e8c;
              font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            }
            pre {
              background: #1e1e1e;
              padding: 1.2em;
              border-radius: 12px;
              overflow-x: auto;
              margin: 1.2em 0;
              font-size: 0.95em;
              line-height: 1.6;
              font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
              color: #d4d4d4;
              position: relative;
            }
            pre::before {
              content: 'bash';
              position: absolute;
              top: 0;
              right: 0;
              padding: 0.3em 0.8em;
              background: #2d2d2d;
              color: #888;
              font-size: 0.8em;
              border-radius: 0 12px 0 12px;
            }
            pre code {
              background: none;
              padding: 0;
              color: inherit;
              font-family: inherit;
              font-size: inherit;
            }
            pre code .prompt {
              color: #0f0;
            }
            pre code .command {
              color: #fff;
            }
            pre code .output {
              color: #d4d4d4;
            }
            pre code .error {
              color: #ff6b6b;
            }
            pre code .success {
              color: #51cf66;
            }
            pre code .warning {
              color: #ffd43b;
            }
            pre code .comment {
              color: #868e96;
            }
            pre code .path {
              color: #339af0;
            }
            pre code .number {
              color: #ff9f43;
            }
            pre code .string {
              color: #ffd43b;
            }
            pre code .keyword {
              color: #ff6b6b;
            }
            pre code .function {
              color: #339af0;
            }
            pre code .variable {
              color: #ffd43b;
            }
            pre code .operator {
              color: #d4d4d4;
            }
            pre code .bracket {
              color: #d4d4d4;
            }
            pre code .special {
              color: #ff6b6b;
            }
          </style>
        </head>
        <body>
          <div class="content">
            ${html}
          </div>
        </body>
      </html>
    `)

    // 生成图片
    const buffer = await page.screenshot({
      type: 'png',
      fullPage: true,
    })

    // 设置响应头
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=31536000')
    
    // 直接发送图片数据
    res.send(buffer)

  } catch (error) {
    console.error('Error generating image:', error)
    res.status(500).json({ error: 'Failed to generate image' })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
} 