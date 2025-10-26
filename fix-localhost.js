/**
 * Script tự động fix tất cả localhost:5000 thành production URL
 */
const fs = require('fs');
const path = require('path');

// Files cần fix (từ grep results)
const filesToFix = [
  'frontend/src/pages/user/Profile.jsx',
  'frontend/src/pages/user/Feedback.jsx', 
  'frontend/src/pages/user/Favourite.jsx',
  'frontend/src/pages/user/EditProfile.jsx',
  'frontend/src/pages/products/SingleProduct.jsx',
  'frontend/src/pages/products/Recipe.jsx',
  'frontend/src/pages/recommendations/Recommendations.jsx',
  'frontend/src/pages/home/LatestRecipe.jsx',
  'frontend/src/pages/home/FeaturedSection.jsx',
  'frontend/src/pages/blog/Blog.jsx',
  'frontend/src/pages/blog/BlogDetail.jsx',
  'frontend/src/pages/blog/CreateBlog.jsx',
  'frontend/src/pages/category/CategoryPage.jsx',
  'frontend/src/pages/admin/AdminDashboard.jsx',
  'frontend/src/pages/admin/ManageRecipes.jsx',
  'frontend/src/pages/admin/ManageUsers.jsx',
  'frontend/src/pages/admin/ManageBlogs.jsx',
  'frontend/src/pages/admin/ManageFeedbacks.jsx',
  'frontend/src/components/Card.jsx',
  'frontend/src/components/SearchPage.jsx'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Check if already has import
    const hasApiImport = content.includes("from '../config/api.js'") || 
                        content.includes("from '../../config/api.js'") ||
                        content.includes("from '../../../config/api.js'");

    // Add import if not exists
    if (!hasApiImport && content.includes('localhost:5000')) {
      // Determine correct import path based on file location
      const depth = filePath.split('/').length - 3; // frontend/src = 2, so -3 gives depth from src
      const importPath = '../'.repeat(depth) + 'config/api.js';
      
      // Find last import line
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, `import { getApiUrl } from '${importPath}';`);
        content = lines.join('\n');
        modified = true;
        console.log(`✅ Added import to: ${filePath}`);
      }
    }

    // Replace all localhost:5000 URLs
    const originalContent = content;
    
    // Pattern 1: Direct URLs in strings
    content = content.replace(
      /['"`]http:\/\/localhost:5000\/api\/([^'"`]*?)['"`]/g, 
      "getApiUrl('/api/$1')"
    );
    
    // Pattern 2: Template literals
    content = content.replace(
      /`http:\/\/localhost:5000\/api\/([^`]*?)`/g,
      "`${getApiUrl('/api/$1')}`"
    );

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ No changes needed: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🚀 Starting localhost fix script...\n');

let fixedCount = 0;
let totalCount = 0;

for (const file of filesToFix) {
  totalCount++;
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Total files: ${totalCount}`);
console.log(`   Fixed files: ${fixedCount}`);
console.log(`   Skipped: ${totalCount - fixedCount}`);

if (fixedCount > 0) {
  console.log(`\n✅ Success! Fixed ${fixedCount} files.`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. git add .`);
  console.log(`   2. git commit -m "Fix all localhost URLs for production"`);
  console.log(`   3. git push origin main`);
  console.log(`   4. Redeploy on Netlify`);
} else {
  console.log(`\n⚪ No files needed fixing.`);
}
