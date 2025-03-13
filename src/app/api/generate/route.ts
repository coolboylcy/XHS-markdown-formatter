import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

export async function POST(request: Request) {
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

    // Set content with styles
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              padding: 40px;
              margin: 0;
            }
            .content {
              max-width: 100%;
              height: 100%;
              overflow-y: auto;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            p {
              margin: 1em 0;
            }
            img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
            }
            code {
              background: #f5f5f5;
              padding: 2px 4px;
              border-radius: 4px;
            }
            pre {
              background: #f5f5f5;
              padding: 1em;
              border-radius: 8px;
              overflow-x: auto;
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
    return NextResponse.json({
      image: `data:image/png;base64,${Buffer.from(image).toString('base64')}`,
    })
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
} 