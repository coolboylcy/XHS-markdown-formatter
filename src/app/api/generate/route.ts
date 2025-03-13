import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
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

export async function POST(request: Request) {
  let browser = null
  try {
    const { markdown } = await request.json()

    if (!markdown) {
      return NextResponse.json(
        { error: 'Markdown content is required' },
        { status: 400 }
      )
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

    // Set content with styles
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap');
            
            body {
              font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              padding: 40px;
              margin: 0;
              background: #fff;
            }
            .content {
              max-width: 100%;
              height: 100%;
              overflow-y: auto;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              color: #FF2442;
            }
            p {
              margin: 1em 0;
            }
            img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            code {
              background: #f5f5f5;
              padding: 2px 4px;
              border-radius: 4px;
              font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            }
            pre {
              background: #1e1e1e;
              padding: 1em;
              border-radius: 8px;
              overflow-x: auto;
              color: #d4d4d4;
              font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            }
            pre code {
              background: none;
              padding: 0;
              color: inherit;
            }
            blockquote {
              margin: 1em 0;
              padding: 1em;
              border-left: 4px solid #FF2442;
              background: #fff5f7;
              color: #666;
            }
            ul, ol {
              margin: 1em 0;
              padding-left: 1.5em;
            }
            li {
              margin: 0.5em 0;
            }
            a {
              color: #FF2442;
              text-decoration: none;
              border-bottom: 1px solid transparent;
              transition: border-color 0.2s;
            }
            a:hover {
              border-bottom-color: #FF2442;
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
    const buffer = await page.screenshot({
      type: 'png',
      fullPage: true,
    })

    // Close browser
    await browser.close()

    // Return image as blob
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Error generating image:', error)
    if (browser) {
      await browser.close()
    }
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
} 