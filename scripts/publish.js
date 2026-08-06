#!/usr/bin/env node
/**
 * publish.js
 * One-command Field Notes publishing workflow.
 *
 * Usage: node scripts/publish.js <source-file.md> [--dry-run] [--skip-git] [--skip-kit]
 *
 * Workflow:
 * 1. Render markdown to HTML
 * 2. Update manifest and listing page
 * 3. Git commit and push to main
 * 4. Create Kit broadcast draft
 * 5. Print confirmation
 *
 * IMPORTANT: This script creates Kit DRAFTS only. Marshall must review
 * and send manually from the Kit dashboard.
 */

const { execSync } = require('child_process');
const path = require('path');

const { render } = require('./render-post');
const { addToManifest, updateListing } = require('./update-listing');
const { createBroadcastDraft, dryRun: kitDryRun } = require('./create-kit-draft');

const BASE_URL = 'https://infin8growth.ai';

/**
 * Run a shell command and return output
 */
function run(cmd, options = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: path.join(__dirname, '..'),
      ...options
    });
  } catch (error) {
    if (options.ignoreError) return '';
    throw error;
  }
}

/**
 * Main publish workflow
 */
async function publish(sourceFile, options = {}) {
  const { dryRun, skipGit, skipKit } = options;

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║       FIELD NOTES PUBLISHING WORKFLOW            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE: No changes will be made.\n');
  }

  // Step 1: Render markdown to HTML
  console.log('1. Rendering markdown to HTML...');
  const post = render(sourceFile);
  console.log(`   ✓ Created: field-notes/${post.slug}.html\n`);

  // Step 2: Update manifest and listing
  console.log('2. Updating manifest and listing page...');
  addToManifest({
    issue: post.issue,
    slug: post.slug,
    title: post.title,
    dek: post.description,
    date: post.dateDisplay
  });
  updateListing();
  console.log('   ✓ Updated field-notes.html\n');

  // Step 3: Git commit and push
  if (skipGit) {
    console.log('3. Skipping git (--skip-git flag)\n');
  } else if (dryRun) {
    console.log('3. Would commit and push:');
    console.log(`   - field-notes/${post.slug}.html`);
    console.log('   - field-notes/_manifest.json');
    console.log('   - field-notes.html\n');
  } else {
    console.log('3. Committing and pushing to main...');
    try {
      run(`git add field-notes/${post.slug}.html field-notes/_manifest.json field-notes.html`);
      run(`git commit -m "Publish Field Notes: ${post.title.replace(/<[^>]*>/g, '')}"`);
      run('git push origin main');
      console.log('   ✓ Pushed to main (Vercel will deploy)\n');
    } catch (error) {
      console.log('   ⚠ Git operation failed. You may need to commit manually.');
      console.log(`   Error: ${error.message}\n`);
    }
  }

  // Step 4: Create Kit draft
  if (skipKit) {
    console.log('4. Skipping Kit draft (--skip-kit flag)\n');
  } else if (dryRun) {
    console.log('4. Would create Kit draft:');
    kitDryRun({
      title: post.title.replace(/<[^>]*>/g, ''),
      teaser: post.teaser,
      slug: post.slug,
      description: post.description
    });
  } else {
    console.log('4. Creating Kit broadcast draft...');
    try {
      const broadcast = await createBroadcastDraft({
        title: post.title.replace(/<[^>]*>/g, ''), // Strip HTML from title
        teaser: post.teaser,
        slug: post.slug,
        description: post.description
      });
      console.log(`   ✓ Draft created in Kit (ID: ${broadcast?.id || 'unknown'})`);
      console.log('   → Open Kit dashboard to review and send\n');
    } catch (error) {
      console.log('   ⚠ Kit API error. Create the broadcast manually.');
      console.log(`   Error: ${error.message}\n`);
    }
  }

  // Step 5: Confirmation
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                     DONE                         ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (!dryRun) {
    console.log(`Post live at: ${BASE_URL}/field-notes/${post.slug}`);
    console.log('\nNext steps:');
    console.log('1. Verify the deploy at Vercel');
    console.log('2. Review the Kit draft and click send');
    console.log('3. Share on LinkedIn/social\n');
  }

  return post;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const sourceFile = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const skipGit = args.includes('--skip-git');
  const skipKit = args.includes('--skip-kit');

  if (!sourceFile) {
    console.log('Usage: node scripts/publish.js <source-file.md> [options]\n');
    console.log('Options:');
    console.log('  --dry-run    Preview without making changes');
    console.log('  --skip-git   Skip git commit/push');
    console.log('  --skip-kit   Skip Kit draft creation\n');
    console.log('Example:');
    console.log('  node scripts/publish.js 2026-08-05-my-post.md');
    console.log('  node scripts/publish.js 2026-08-05-my-post.md --dry-run');
    process.exit(1);
  }

  publish(sourceFile, { dryRun, skipGit, skipKit })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { publish };
