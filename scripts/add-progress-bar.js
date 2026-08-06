/**
 * add-progress-bar.js
 * Adds the scroll progress bar to existing Field Notes issues that don't have it.
 *
 * Usage: node scripts/add-progress-bar.js
 */

const fs = require('fs');
const path = require('path');

const FIELD_NOTES_DIR = path.join(__dirname, '../field-notes');

// Progress bar HTML to insert after the nav-drawer
const PROGRESS_BAR_HTML = `
<!-- Progress Indicator -->
<div class="article-progress" id="articleProgress">
  <div class="progress-track">
    <div class="progress-fill" id="progressFill"></div>
    <div class="progress-dots" id="progressDots"></div>
  </div>
</div>
`;

// Progress bar JavaScript to insert before </body>
const PROGRESS_BAR_JS = `
<script>
// Progress indicator
(function() {
  const article = document.querySelector('.post-body') || document.getElementById('articleContent');
  const progressFill = document.getElementById('progressFill');
  const progressDots = document.getElementById('progressDots');

  if (!article || !progressFill || !progressDots) return;

  // Find all h2 sections
  const sections = article.querySelectorAll('h2');
  const numDots = Math.max(sections.length, 5);

  // Create dots
  for (let i = 0; i < numDots; i++) {
    const dot = document.createElement('div');
    dot.className = 'progress-dot';
    progressDots.appendChild(dot);
  }

  const dots = progressDots.querySelectorAll('.progress-dot');

  function updateProgress() {
    const articleRect = article.getBoundingClientRect();
    const articleTop = window.scrollY + articleRect.top;
    const articleHeight = article.offsetHeight;
    const scrollPos = window.scrollY - articleTop + window.innerHeight * 0.3;

    // Calculate progress percentage
    const progress = Math.min(Math.max(scrollPos / articleHeight * 100, 0), 100);
    progressFill.style.height = progress + '%';

    // Update dots
    dots.forEach((dot, index) => {
      const dotThreshold = (index / (numDots - 1)) * 100;
      if (progress >= dotThreshold) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
})();
</script>
`;

// Files to skip (already have progress bar or are templates)
const SKIP_FILES = ['template.html'];

function addProgressBar(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);

  // Check if already has progress bar
  if (content.includes('article-progress')) {
    console.log(`Skipping ${fileName} - already has progress bar`);
    return false;
  }

  // Add upgrades.css link if not present
  if (!content.includes('upgrades.css')) {
    // Find the main.css link and add upgrades.css after it
    content = content.replace(
      /<link rel="stylesheet" href="(\.\.\/)?css\/main\.css">/,
      `<link rel="stylesheet" href="$1css/main.css">\n<link rel="stylesheet" href="$1css/upgrades.css">`
    );
  }

  // Add progress bar HTML after nav-drawer closing tag
  if (content.includes('</nav>') && content.includes('nav-drawer')) {
    // Find the closing </nav> tag for the nav-drawer and add progress bar after it
    const navDrawerMatch = content.match(/<nav class="nav-drawer"[^>]*>[\s\S]*?<\/nav>/);
    if (navDrawerMatch) {
      const navDrawerEnd = content.indexOf(navDrawerMatch[0]) + navDrawerMatch[0].length;
      content = content.slice(0, navDrawerEnd) + PROGRESS_BAR_HTML + content.slice(navDrawerEnd);
    }
  }

  // Add progress bar JavaScript before closing </body> tag
  // But only if it doesn't already have it
  if (!content.includes('updateProgress')) {
    content = content.replace('</body>', PROGRESS_BAR_JS + '\n</body>');
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${fileName}`);
  return true;
}

// Get all HTML files in field-notes directory
const files = fs.readdirSync(FIELD_NOTES_DIR)
  .filter(f => f.endsWith('.html') && !SKIP_FILES.includes(f));

console.log(`Found ${files.length} Field Notes HTML files\n`);

let updated = 0;
for (const file of files) {
  const filePath = path.join(FIELD_NOTES_DIR, file);
  if (addProgressBar(filePath)) {
    updated++;
  }
}

console.log(`\nDone! Updated ${updated} files.`);
