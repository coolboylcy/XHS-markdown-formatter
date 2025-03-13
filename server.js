const express = require('express')
const puppeteer = require('puppeteer')
const MarkdownIt = require('markdown-it')
const path = require('path')
const cors = require('cors')

const app = express()
const port = process.env.PORT || 3001

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
})

// Enable CORS for all routes
app.use(cors())
app.use(express.json())

app.post('/api/generate', async (req, res) => {
  try {
    const { markdown } = req.body

    if (!markdown) {
      return res.status(400).json({ error: 'Markdown content is required' })
    }

    // Convert markdown to HTML
    const html = md.render(markdown)

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
    })

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
      // 非常短的文本，使用大字体
      fontSize = 3.2
      lineHeight = 2.0
      paragraphSpacing = 1.5
    } else if (textLength < 100) {
      // 短文本
      fontSize = 2.8
      lineHeight = 1.9
      paragraphSpacing = 1.4
    } else if (textLength < 200) {
      // 中等长度文本
      fontSize = 2.2
      lineHeight = 1.8
      paragraphSpacing = 1.3
    } else if (textLength < 300) {
      // 较长文本
      fontSize = 1.8
      lineHeight = 1.7
      paragraphSpacing = 1.2
    } else if (textLength < 500) {
      // 长文本
      fontSize = 1.5
      lineHeight = 1.6
      paragraphSpacing = 1.1
    } else {
      // 非常长的文本
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
            /* 终端提示符样式 */
            pre code .prompt {
              color: #0f0;
            }
            /* 命令样式 */
            pre code .command {
              color: #fff;
            }
            /* 输出样式 */
            pre code .output {
              color: #d4d4d4;
            }
            /* 错误输出样式 */
            pre code .error {
              color: #ff6b6b;
            }
            /* 成功输出样式 */
            pre code .success {
              color: #4caf50;
            }
            /* 警告输出样式 */
            pre code .warning {
              color: #ffd700;
            }
            /* 注释样式 */
            pre code .comment {
              color: #888;
            }
            /* 路径样式 */
            pre code .path {
              color: #64b5f6;
            }
            /* 数字样式 */
            pre code .number {
              color: #b5cea8;
            }
            /* 字符串样式 */
            pre code .string {
              color: #ce9178;
            }
            /* 关键字样式 */
            pre code .keyword {
              color: #569cd6;
            }
            /* 函数样式 */
            pre code .function {
              color: #dcdcaa;
            }
            /* 变量样式 */
            pre code .variable {
              color: #9cdcfe;
            }
            /* 操作符样式 */
            pre code .operator {
              color: #d4d4d4;
            }
            /* 括号样式 */
            pre code .bracket {
              color: #d4d4d4;
            }
            /* 特殊字符样式 */
            pre code .special {
              color: #d4d4d4;
            }
            blockquote {
              margin: 1.2em 0;
              padding: 1em 1.5em;
              border-left: 4px solid #FF2442;
              background: #fff5f7;
              color: #666;
              border-radius: 0 12px 12px 0;
              position: relative;
            }
            blockquote::before {
              content: '"';
              position: absolute;
              top: -0.5em;
              left: -0.5em;
              font-size: 3em;
              color: #FF2442;
              opacity: 0.2;
            }
            ul, ol {
              margin: 1em 0;
              padding-left: 1.5em;
            }
            li {
              margin: 0.6em 0;
            }
            a {
              color: #FF2442;
              text-decoration: none;
              border-bottom: 1px solid transparent;
              transition: border-color 0.2s;
              font-weight: 500;
            }
            a:hover {
              border-bottom-color: #FF2442;
            }
            hr {
              border: none;
              border-top: 1px solid #eee;
              margin: 2em 0;
            }
            .emoji {
              font-size: 1.4em;
              margin: 0 0.1em;
              vertical-align: middle;
            }
            .highlight {
              background: #fff5f7;
              padding: 0.2em 0.4em;
              border-radius: 4px;
              color: #FF2442;
              font-weight: 500;
            }
            .tag {
              display: inline-block;
              background: #f8f9fa;
              padding: 0.2em 0.8em;
              border-radius: 16px;
              font-size: 0.95em;
              color: #666;
              margin: 0.2em;
            }
            .dialog {
              background: #fff5f7;
              padding: 1.2em;
              border-radius: 12px;
              margin: 1.2em 0;
              position: relative;
            }
            .dialog::before {
              content: '';
              position: absolute;
              top: -8px;
              left: 20px;
              width: 16px;
              height: 16px;
              background: #fff5f7;
              transform: rotate(45deg);
            }
            .dialog-title {
              font-weight: 700;
              color: #FF2442;
              margin-bottom: 0.6em;
            }
            .dialog-content {
              color: #666;
              line-height: 1.8;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1.2em 0;
            }
            th, td {
              padding: 0.6em;
              border: 1px solid #eee;
              text-align: left;
            }
            th {
              background: #f8f9fa;
              font-weight: 600;
            }
            tr:nth-child(even) {
              background: #f8f9fa;
            }
            .task-list-item {
              list-style-type: none;
              padding-left: 1.5em;
            }
            .task-list-item-checkbox {
              margin-right: 0.5em;
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

    // Generate image
    const image = await page.screenshot({
      type: 'png',
      fullPage: true,
    })

    // Close browser
    await browser.close()

    // Return image as base64
    res.json({
      image: `data:image/png;base64,${Buffer.from(image).toString('base64')}`,
    })
  } catch (error) {
    console.error('Error generating image:', error)
    res.status(500).json({ error: 'Failed to generate image' })
  }
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
}) 