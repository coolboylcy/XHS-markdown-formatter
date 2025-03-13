const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export async function generateImage(markdown: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ markdown }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to generate image')
    }

    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error generating image:', error)
    throw error
  }
}

export async function downloadImage(imageData: string): Promise<void> {
  try {
    const link = document.createElement('a')
    link.href = imageData
    link.download = 'image.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error downloading image:', error)
    throw error
  }
}

export async function shareToGallery(dataUrl: string) {
  try {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const file = new File([blob], 'image.png', { type: 'image/png' })

    if (navigator.share) {
      await navigator.share({
        files: [file],
        title: '小红书图片',
        text: '分享到相册',
      })
    } else {
      throw new Error('Web Share API not supported')
    }
  } catch (error) {
    console.error('Error sharing to gallery:', error)
    throw error
  }
}

function countChineseChars(str: string): number {
  return (str.match(/[\u4e00-\u9fa5]/g) || []).length
}

function countEnglishChars(str: string): number {
  return (str.match(/[a-zA-Z]/g) || []).length
}

function countPunctuation(str: string): number {
  return (str.match(/[.,!?;:]/g) || []).length
}

function calculateEffectiveLength(text: string): number {
  const chineseChars = countChineseChars(text)
  const englishChars = countEnglishChars(text)
  const punctuation = countPunctuation(text)
  
  // 中文字符计为1，英文字符计为0.5，标点符号计为0.2
  return chineseChars + (englishChars * 0.5) + (punctuation * 0.2)
}

function splitTextIntoSentences(text: string): string[] {
  // 按句子分割，保留分隔符
  return text.split(/([。！？；])/).filter(Boolean)
}

function splitTextIntoParagraphs(text: string): string[] {
  // 按段落分割，保留分隔符
  return text.split(/(\n\n+)/).filter(Boolean)
}

function shouldMergeWithNext(sentence: string, nextSentence: string): boolean {
  // 如果当前句子以逗号结尾，且下一句较短，考虑合并
  if (sentence.endsWith('，') && nextSentence.length < 10) {
    return true
  }
  // 如果当前句子以冒号结尾，考虑合并
  if (sentence.endsWith('：')) {
    return true
  }
  return false
}

function formatParagraph(text: string): string {
  // 移除多余的空格和换行
  return text.replace(/\s+/g, ' ').trim()
}

function calculateOptimalLineLength(text: string): number {
  // 根据文本长度计算最佳每行字数
  const totalLength = calculateEffectiveLength(text)
  if (totalLength < 100) {
    return 15 // 短文本使用较短的行长
  } else if (totalLength < 200) {
    return 20 // 中等长度文本使用中等行长
  } else {
    return 25 // 长文本使用较长的行长
  }
}

function splitTextIntoLines(text: string, maxLength: number): string[] {
  const lines: string[] = []
  let currentLine = ''
  const sentences = splitTextIntoSentences(text)
  
  for (const sentence of sentences) {
    const words = sentence.split(/([，。！？；：])/).filter(Boolean)
    
    for (const word of words) {
      if (calculateEffectiveLength(currentLine + word) <= maxLength) {
        currentLine += word
      } else {
        if (currentLine) {
          lines.push(currentLine)
        }
        currentLine = word
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return lines
}

export function splitMarkdownIntoPages(markdown: string): string[] {
  // 处理代码块
  const processedMarkdown = markdown.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    if (lang === 'bash') {
      // 为 bash 代码块添加语法高亮类
      const lines = code.split('\n').map((line: string) => {
        // 处理命令提示符
        if (line.startsWith('$ ')) {
          return `<span class="prompt">$ </span><span class="command">${line.slice(2)}</span>`;
        }
        // 处理输出
        if (line.startsWith('> ')) {
          return `<span class="output">${line.slice(2)}</span>`;
        }
        // 处理错误输出
        if (line.startsWith('! ')) {
          return `<span class="error">${line.slice(2)}</span>`;
        }
        // 处理成功输出
        if (line.startsWith('✓ ')) {
          return `<span class="success">${line.slice(2)}</span>`;
        }
        // 处理警告输出
        if (line.startsWith('⚠ ')) {
          return `<span class="warning">${line.slice(2)}</span>`;
        }
        // 处理注释
        if (line.startsWith('#')) {
          return `<span class="comment">${line}</span>`;
        }
        // 处理路径
        if (line.includes('/')) {
          return line.replace(/(\/[^\s]+)/g, '<span class="path">$1</span>');
        }
        // 处理数字
        if (/\d+/.test(line)) {
          return line.replace(/\d+/g, '<span class="number">$&</span>');
        }
        // 处理字符串
        if (line.includes('"') || line.includes("'")) {
          return line.replace(/(["'])(.*?)\1/g, '<span class="string">$&</span>');
        }
        // 处理关键字
        const keywords = ['if', 'else', 'then', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function'];
        let processedLine = line;
        keywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'g');
          processedLine = processedLine.replace(regex, `<span class="keyword">$&</span>`);
        });
        // 处理函数
        processedLine = processedLine.replace(/\b\w+\(\)/g, '<span class="function">$&</span>');
        // 处理变量
        processedLine = processedLine.replace(/\$[A-Za-z_][A-Za-z0-9_]*/g, '<span class="variable">$&</span>');
        // 处理操作符
        processedLine = processedLine.replace(/[=<>|&;]/g, '<span class="operator">$&</span>');
        // 处理括号
        processedLine = processedLine.replace(/[(){}[\]]/g, '<span class="bracket">$&</span>');
        // 处理特殊字符
        processedLine = processedLine.replace(/[*?]/g, '<span class="special">$&</span>');
        return processedLine;
      }).join('\n');
      return `<pre><code>${lines}</code></pre>`;
    }
    return match;
  });

  // 分割文本为多页
  const resultPages = processedMarkdown.split('---').map(page => page.trim()).filter(Boolean);
  
  // 如果没有手动分页，则根据段落智能分页
  if (resultPages.length === 1) {
    const paragraphs = resultPages[0].split('\n\n').filter(p => p.trim());
    const newPages: string[] = [];
    let currentPage = '';
    
    for (const paragraph of paragraphs) {
      if ((currentPage + paragraph).length > 500) {
        newPages.push(currentPage.trim());
        currentPage = paragraph;
      } else {
        currentPage += '\n\n' + paragraph;
      }
    }
    
    if (currentPage.trim()) {
      newPages.push(currentPage.trim());
    }
    
    return newPages;
  }
  
  return resultPages;
}

// 计算最佳字体大小
function calculateOptimalFontSize(text: string): number {
  const totalLength = calculateEffectiveLength(text)
  const lines = text.split('\n').length
  
  // 根据文本长度和行数计算最佳字体大小
  if (totalLength < 50 && lines < 5) {
    return 2.2 // 短文本使用较大字号
  } else if (totalLength < 100 && lines < 8) {
    return 1.8 // 中等长度文本使用中等字号
  } else if (totalLength < 150 && lines < 12) {
    return 1.5 // 较长文本使用较小字号
  } else {
    return 1.2 // 长文本使用最小字号
  }
}

// 计算最佳行高
function calculateOptimalLineHeight(text: string): number {
  const totalLength = calculateEffectiveLength(text)
  const lines = text.split('\n').length
  
  if (totalLength < 50 && lines < 5) {
    return 2.5 // 短文本使用较大行高
  } else if (totalLength < 100 && lines < 8) {
    return 2.2 // 中等长度文本使用中等行高
  } else if (totalLength < 150 && lines < 12) {
    return 2.0 // 较长文本使用较小行高
  } else {
    return 1.8 // 长文本使用最小行高
  }
}

// 计算最佳段落间距
function calculateOptimalParagraphSpacing(text: string): number {
  const paragraphs = text.split('\n\n').length
  
  if (paragraphs < 3) {
    return 2.0 // 段落少时使用较大间距
  } else if (paragraphs < 5) {
    return 1.8 // 中等段落数使用中等间距
  } else {
    return 1.5 // 段落多时使用较小间距
  }
} 