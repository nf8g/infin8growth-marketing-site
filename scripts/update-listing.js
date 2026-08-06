/**
 * update-listing.js
 * Updates field-notes.html listing page from the manifest file.
 *
 * Usage: node scripts/update-listing.js
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '../field-notes/_manifest.json');
const LISTING_PATH = path.join(__dirname, '../field-notes.html');

/**
 * Generate HTML for a single list item
 */
function generateListItem(post) {
  const numPadded = String(post.issue).padStart(2, '0');

  return `      <a href="field-notes/${post.slug}.html" class="fn-item">
        <span class="num">${numPadded}</span>
        <div class="content">
          <h3 class="title">${post.title}</h3>
          <p class="dek">${post.dek}</p>
        </div>
        <span class="date"><span class="dot dot--live"></span>${post.date}</span>
      </a>`;
}

/**
 * Generate the full list HTML from manifest
 */
function generateListHtml(posts) {
  // Sort by issue number descending (newest first)
  const sorted = [...posts].sort((a, b) => b.issue - a.issue);
  return sorted.map(generateListItem).join('\n');
}

/**
 * Update the listing page with current manifest data
 */
function updateListing() {
  // Read manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found: ${MANIFEST_PATH}`);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const posts = manifest.posts;

  if (!posts || posts.length === 0) {
    throw new Error('Manifest has no posts');
  }

  // Read current listing page
  let html = fs.readFileSync(LISTING_PATH, 'utf8');

  // Generate new list HTML
  const listHtml = generateListHtml(posts);

  // Replace the list content between <ul class="fn-list"> and </ul>
  const listRegex = /(<ul class="fn-list">)([\s\S]*?)(<\/ul>)/;
  const listMatch = html.match(listRegex);

  if (!listMatch) {
    throw new Error('Could not find fn-list in field-notes.html');
  }

  html = html.replace(listRegex, `$1\n${listHtml}\n    $3`);

  // Write updated listing page
  fs.writeFileSync(LISTING_PATH, html);

  console.log(`Updated field-notes.html with ${posts.length} posts`);
  return posts.length;
}

/**
 * Add a new post to the manifest
 */
function addToManifest({ issue, slug, title, dek, date }) {
  let manifest = { posts: [] };

  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  }

  // Check if post already exists
  const existing = manifest.posts.find(p => p.slug === slug);
  if (existing) {
    // Update existing
    Object.assign(existing, { issue, title, dek, date });
    console.log(`Updated existing post in manifest: ${slug}`);
  } else {
    // Add new
    manifest.posts.push({ issue, slug, title, dek, date });
    console.log(`Added new post to manifest: ${slug}`);
  }

  // Write manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  return manifest;
}

/**
 * Initialize manifest from existing HTML (one-time migration)
 */
function initManifestFromHtml() {
  const html = fs.readFileSync(LISTING_PATH, 'utf8');

  // Extract all fn-item links
  const itemRegex = /<a href="field-notes\/([^"]+)\.html" class="fn-item">[\s\S]*?<span class="num">(\d+)<\/span>[\s\S]*?<h3 class="title">([\s\S]*?)<\/h3>[\s\S]*?<p class="dek">([\s\S]*?)<\/p>[\s\S]*?<span class="date">[\s\S]*?<\/span>([\s\S]*?)<\/span>[\s\S]*?<\/a>/g;

  const posts = [];
  let match;

  while ((match = itemRegex.exec(html)) !== null) {
    const slug = match[1];
    const issue = parseInt(match[2], 10);
    const title = match[3].trim();
    const dek = match[4].trim();
    // Extract date text (after the dot span)
    const dateMatch = match[0].match(/<span class="date">[\s\S]*?<\/span>([^<]+)<\/span>/);
    const date = dateMatch ? dateMatch[1].trim() : '';

    posts.push({ issue, slug, title, dek, date });
  }

  if (posts.length === 0) {
    console.log('No posts found in HTML. Using fallback extraction...');
    return initManifestFallback();
  }

  const manifest = { posts };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Initialized manifest with ${posts.length} posts`);

  return manifest;
}

/**
 * Fallback: manually define existing posts
 */
function initManifestFallback() {
  const posts = [
    {
      issue: 7,
      slug: 'learning-ai-at-work-reveals-how-you-work',
      title: 'How Learning to Use AI at Work Reveals How You <em>Actually</em> Do Your Job',
      dek: "AI disappointment usually isn't an AI problem. It's a mirror. The real skill is teaching AI how you work.",
      date: 'July 2026'
    },
    {
      issue: 6,
      slug: 'your-ai-champion-probably-wont-be-techy',
      title: 'Your AI Champion Probably Won\'t Be <em>"Techy"</em>',
      dek: 'The technical are held back by previous experience. Everyone else is empowered by an open frontier.',
      date: 'July 2026'
    },
    {
      issue: 5,
      slug: 'the-liability-of-digital-fluency',
      title: 'The Liability of <em>Digital Fluency</em>',
      dek: 'You may be strategically ready for AI, but what about practically? Digital fluency is often the hidden barrier.',
      date: 'June 2026'
    },
    {
      issue: 4,
      slug: 'results-require-foundation',
      title: '<em>Results Require</em> Foundation',
      dek: "There is a massive chasm between AI hype and real results. The difference isn't tools.",
      date: 'June 2026'
    },
    {
      issue: 3,
      slug: 'the-1-reason-ai-isnt-working',
      title: '<em>The #1 Reason</em> AI Isn\'t Working',
      dek: 'Tools and prompting can only take you so far. The real challenge starts with you.',
      date: 'June 2026'
    },
    {
      issue: 2,
      slug: 'youre-already-paying-for-ai',
      title: '<em>You\'re Already Paying</em> for AI',
      dek: "Chaos has a price tag. Your business is already spending on time, money, attention, and energy. Here's what it's costing you.",
      date: 'May 2026'
    },
    {
      issue: 1,
      slug: 'people-first-ai-adoption',
      title: '<em>People-First</em> AI Adoption',
      dek: "What we've learned about change management from embedding AI in a 400,000-visitor heritage attraction.",
      date: 'May 2026'
    }
  ];

  const manifest = { posts };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Initialized manifest with ${posts.length} posts (fallback method)`);

  return manifest;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--init')) {
    // Initialize manifest from existing HTML
    initManifestFallback();
  } else {
    // Update listing from manifest
    try {
      updateListing();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}

module.exports = { updateListing, addToManifest, initManifestFallback };
