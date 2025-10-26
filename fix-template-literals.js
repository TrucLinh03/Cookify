/**
 * Script tự động fix template literal lỗi trong getApiUrl calls
 */
const fs = require('fs');
const path = require('path');

// Files cần fix (từ grep results)
const filesToFix = [
  'frontend/src/pages/user/Feedback.jsx',
  'frontend/src/pages/user/Favourite.jsx', 
  'frontend/src/pages/recommendations/Recommendations.jsx',
  'frontend/src/pages/products/SingleProduct.jsx',
  'frontend/src/pages/home/LatestRecipe.jsx',
  'frontend/src/pages/blog/BlogDetail.jsx',
  'frontend/src/pages/admin/ManageBlogs.jsx',
  'frontend/src/pages/admin/ManageRecipes.jsx',
  'frontend/src/pages/admin/ManageFeedbacks.jsx',
  'frontend/src/pages/admin/ManageUsers.jsx',
  'frontend/src/components/Card.jsx'
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
    const originalContent = content;

    // Fix template literals: getApiUrl('/api/path/${variable}') -> getApiUrl(`/api/path/${variable}`)
    const regex = /getApiUrl\('([^']*\$\{[^}]*\}[^']*)'\)/g;
    content = content.replace(regex, (match, path) => {
      modified = true;
      return `getApiUrl(\`${path}\`)`;
    });

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed template literals in: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ No template literal issues in: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🚀 Starting template literal fix script...\n');

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
  console.log(`\n✅ Success! Fixed template literals in ${fixedCount} files.`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. git add .`);
  console.log(`   2. git commit -m "Fix template literal syntax errors"`);
  console.log(`   3. git push origin main`);
  console.log(`   4. Redeploy on Netlify`);
} else {
  console.log(`\n⚪ No template literal issues found.`);
}
