/**
 * render-post.js
 * Converts markdown source files to HTML using the field-notes template.
 *
 * Usage: node scripts/render-post.js <source-file.md>
 * Example: node scripts/render-post.js 2026-08-05-example.md
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const TEMPLATE_PATH = path.join(__dirname, '../field-notes/template.html');
const SOURCE_DIR = path.join(__dirname, '../field-notes/_source');
const OUTPUT_DIR = path.join(__dirname, '../field-notes');
const IMAGES_DIR = '/field-notes/_images';

/**
 * Format date for display (e.g., "August 2026")
 */
function formatDateDisplay(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format date for ISO (e.g., "2026-08-05")
 */
function formatDateISO(dateStr) {
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

/**
 * Pre-process markdown to convert custom syntax before marked runs
 */
function preprocessMarkdown(markdown) {
  const lines = markdown.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check for callout: > [!callout title="..."]
    const calloutMatch = line.match(/^>\s*\[!callout(?:\s+title="([^"]*)")?\]/);
    if (calloutMatch) {
      const title = calloutMatch[1] || 'Note';
      // Collect all lines that are part of this blockquote
      const contentLines = [];
      i++; // Move past the callout line
      while (i < lines.length && lines[i].startsWith('> ')) {
        contentLines.push(lines[i].replace(/^>\s*/, ''));
        i++;
      }
      // If the content was on the same line
      const sameLine = line.replace(/^>\s*\[!callout[^\]]*\]\s*/, '').trim();
      if (sameLine) {
        contentLines.unshift(sameLine);
      }

      result.push(`<div class="callout-box">`);
      result.push(`<p class="callout-title">${title}</p>`);
      result.push(`<p>${contentLines.join(' ').trim()}</p>`);
      result.push(`</div>`);
      result.push('');
      continue;
    }

    // Check for pull quote: > [!quote]
    const quoteMatch = line.match(/^>\s*\[!quote\]/);
    if (quoteMatch) {
      const contentLines = [];
      i++; // Move past the quote marker line
      while (i < lines.length && lines[i].startsWith('> ')) {
        contentLines.push(lines[i].replace(/^>\s*/, ''));
        i++;
      }
      // If the content was on the same line
      const sameLine = line.replace(/^>\s*\[!quote\]\s*/, '').trim();
      if (sameLine) {
        contentLines.unshift(sameLine);
      }

      result.push(`<blockquote class="pull-quote"><p>${contentLines.join(' ').trim()}</p></blockquote>`);
      result.push('');
      continue;
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}

/**
 * Custom markdown renderer for pull quotes, callouts, and images
 */
function createCustomRenderer() {
  const renderer = new marked.Renderer();

  // Handle blockquotes: convert [!quote] and [!callout] syntax
  renderer.blockquote = function(quote) {
    // In marked v12+, quote is an object with raw/text properties
    // We need to check the raw content for our special syntax
    let rawText = '';
    if (typeof quote === 'object') {
      rawText = quote.raw || quote.text || '';
    } else {
      rawText = quote;
    }

    // Strip HTML tags and get clean text for matching
    const cleanText = rawText.replace(/<[^>]*>/g, '').trim();

    // Pull quote: > [!quote]
    if (cleanText.includes('[!quote]')) {
      const content = cleanText.replace(/\[!quote\]\s*/g, '').trim();
      return `<blockquote class="pull-quote"><p>${content}</p></blockquote>\n`;
    }

    // Callout: > [!callout title="..."]
    const calloutMatch = cleanText.match(/\[!callout(?:\s+title="([^"]*)")?\]/);
    if (calloutMatch) {
      const title = calloutMatch[1] || 'Note';
      const content = cleanText.replace(/\[!callout[^\]]*\]\s*/g, '').trim();
      return `<div class="callout-box">
  <p class="callout-title">${title}</p>
  <p>${content}</p>
</div>\n`;
    }

    // Default blockquote - use the rendered HTML if available
    if (typeof quote === 'object' && quote.text) {
      return `<blockquote>${quote.text}</blockquote>\n`;
    }
    return `<blockquote><p>${rawText}</p></blockquote>\n`;
  };

  // Handle images: resolve relative paths to _images folder
  renderer.image = function(href, title, text) {
    // Handle object format from marked v12+
    const src = typeof href === 'object' ? href.href : href;
    const alt = typeof href === 'object' ? href.text : text;

    // Resolve relative paths (./image.jpg) to _images folder
    const resolvedSrc = src.startsWith('./')
      ? `${IMAGES_DIR}/${src.slice(2)}`
      : src;

    return `<figure>
  <img src="${resolvedSrc}" alt="${alt || ''}" loading="lazy" />
</figure>\n`;
  };

  return renderer;
}

/**
 * Render a markdown file to HTML
 */
function render(sourceFile) {
  const sourcePath = path.join(SOURCE_DIR, sourceFile);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  // Parse frontmatter and content
  const fileContent = fs.readFileSync(sourcePath, 'utf8');
  const { data: fm, content } = matter(fileContent);

  // Validate required frontmatter
  const required = ['title', 'slug', 'date', 'description'];
  for (const field of required) {
    if (!fm[field]) {
      throw new Error(`Missing required frontmatter field: ${field}`);
    }
  }

  // Read template
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  // Configure marked with custom renderer
  marked.use({ renderer: createCustomRenderer() });

  // Pre-process markdown for custom syntax, then convert to HTML
  const preprocessed = preprocessMarkdown(content);
  const htmlContent = marked.parse(preprocessed);

  // Determine OG image (use header_image if present, otherwise default)
  const ogImage = fm.header_image
    ? `${IMAGES_DIR}/${fm.header_image}`
    : '/assets/og/field-notes.png';

  // Fill template placeholders
  let output = template
    .replace(/\{\{TITLE\}\}/g, fm.title)
    .replace(/\{\{SLUG\}\}/g, fm.slug)
    .replace(/\{\{DATE_ISO\}\}/g, formatDateISO(fm.date))
    .replace(/\{\{DATE_DISPLAY\}\}/g, formatDateDisplay(fm.date))
    .replace(/\{\{META_DESCRIPTION\}\}/g, fm.description)
    .replace(/\{\{KEYWORDS\}\}/g, fm.keywords?.join(', ') || '')
    .replace(/\{\{OG_IMAGE\}\}/g, ogImage)
    .replace(/\{\{CONTENT\}\}/g, htmlContent);

  // Handle optional header image
  if (fm.header_image) {
    output = output
      .replace(/\{\{#HEADER_IMAGE\}\}/g, '')
      .replace(/\{\{\/HEADER_IMAGE\}\}/g, '')
      .replace(/\{\{HEADER_IMAGE\}\}/g, fm.header_image)
      .replace(/\{\{HEADER_IMAGE_ALT\}\}/g, fm.header_image_alt || '');
  } else {
    // Remove header image block if not present
    output = output.replace(/\{\{#HEADER_IMAGE\}\}[\s\S]*?\{\{\/HEADER_IMAGE\}\}/g, '');
  }

  // Handle optional subtitle
  if (fm.subtitle) {
    output = output
      .replace(/\{\{#SUBTITLE\}\}/g, '')
      .replace(/\{\{\/SUBTITLE\}\}/g, '')
      .replace(/\{\{SUBTITLE\}\}/g, fm.subtitle);
  } else {
    output = output.replace(/\{\{#SUBTITLE\}\}[\s\S]*?\{\{\/SUBTITLE\}\}/g, '');
  }

  // Write output file
  const outputPath = path.join(OUTPUT_DIR, `${fm.slug}.html`);
  fs.writeFileSync(outputPath, output);

  console.log(`Rendered: ${outputPath}`);

  return {
    slug: fm.slug,
    title: fm.title,
    description: fm.description,
    date: fm.date,
    dateDisplay: formatDateDisplay(fm.date),
    teaser: fm.teaser || fm.description,
    issue: fm.issue,
    outputPath
  };
}

// CLI execution
if (require.main === module) {
  const sourceFile = process.argv[2];

  if (!sourceFile) {
    console.error('Usage: node scripts/render-post.js <source-file.md>');
    console.error('Example: node scripts/render-post.js 2026-08-05-my-post.md');
    process.exit(1);
  }

  try {
    const result = render(sourceFile);
    console.log('\nPost metadata:');
    console.log(`  Title: ${result.title}`);
    console.log(`  Slug: ${result.slug}`);
    console.log(`  Date: ${result.dateDisplay}`);
    console.log(`  Output: ${result.outputPath}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = { render };
