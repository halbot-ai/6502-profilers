# 6502 Profilers - GitHub Pages Setup

## Repository Created! ✅

**Repository:** https://github.com/halbot-ai/6502-profilers

## Files Structure

```
6502-profilers/
├── index.html                  # Gallery homepage
├── algorithms/
│   ├── calltree.html          # Hierarchical call tree
│   ├── calltree.js
│   └── algorithms-flamegraph.svg  # Flame graph
├── deep-nest/
│   ├── calltree.html          # Hierarchical call tree
│   ├── calltree.js
│   └── deep-nest-flamegraph.svg  # Flame graph
├── demo-complex/
│   └── demo-complex-flamegraph.svg  # Flame graph (no calltree yet)
└── fib-simple/
    └── fib-simple-flamegraph.svg  # Flame graph (no calltree yet)
```

## Enable GitHub Pages

The repository is created, but GitHub Pages needs to be enabled manually:

### Option 1: Enable in GitHub Web UI (Recommended)
1. Go to: https://github.com/halbot-ai/6502-profilers/settings/pages
2. Select: **Deploy from a branch**
3. Branch: **master**
4. Folder: **/(root)**
5. Click **Save**

After 1-2 minutes, your site will be at:
**https://halbot-ai.github.io/6502-profilers**

### Option 2: Use gh CLI (Requires setup)
```bash
cd /root/.openclaw/workspace/6502-profilers
gh api repos/halbot-ai/6502-profilers/pages --method POST -H "Accept: application/vnd.github.v3+json" --field source.branch=master
```

## Gallery Features

The index.html provides:
- **Beautiful gradient design** - Professional appearance
- **Project cards** - Each profiler in its own card
- **Quick stats** - Time, functions, max depth
- **Direct links** - Click to open call tree or flame graph
- **Responsive** - Works on mobile and desktop

## Profiler Links (After Pages Enabled)

Once GitHub Pages is active:
- **Gallery:** https://halbot-ai.github.io/6502-profilers
- **Algorithms Call Tree:** https://halbot-ai.github.io/6502-profilers/algorithms/calltree.html
- **Deep Nest Call Tree:** https://halbot-ai.github.io/6502-profilers/deep-nest/calltree.html
- **Algorithms Flame Graph:** https://halbot-ai.github.io/6502-profilers/algorithms/algorithms-flamegraph.svg
- **Deep Nest Flame Graph:** https://halbot-ai.github.io/6502-profilers/deep-nest/deep-nest-flamegraph.svg

## Adding More Profilers

To add new profilers to the gallery:

### 1. Create the call tree
```bash
cd c64-dev
./calltree myproject
```

### 2. Copy files to gallery
```bash
cd /root/.openclaw/workspace/6502-profilers
mkdir -p myproject
cp ../6502-cli/myproject-calltree.html myproject/calltree.html
cp ../6502-cli/myproject-calltree.js myproject/calltree.js
cp ../6502-cli/myproject-flamegraph.svg myproject/  # if exists
```

### 3. Update index.html
Add a new card in the grid section for your project.

### 4. Commit and push
```bash
git add .
git commit -m "Add myproject profiler"
git push origin master
```

### 5. Update gallery in README
Add your project's card to index.html with proper stats.

## Profiler Categories

### Simple (Badge)
- Basic examples, single algorithm
- Low complexity, good for learning
- Example: fib-simple

### Medium
- Multiple algorithms, moderate complexity
- Good balance of depth and breadth
- Example: algorithms

### Complex (Badge)
- Deep nesting, multiple call patterns
- Advanced structures
- Example: deep-nest

## Gallery Index HTML Structure

Each card follows this template:
```html
<div class="card">
    <h2>project-name <span class="badge">SIMPLE</span></h2>
    <div class="description">
        Brief description of the project.
    </div>
    <div class="stats">
        <div class="stat"><span class="stat-label">Time:</span> X.XXms</div>
        <div class="stat"><span class="stat-label">Functions:</span> NN</div>
        <div class="stat"><span class="stat-label">Max Depth:</span> N</div>
    </div>
    <div class="links">
        <a href="project-name/calltree.html">Call Tree</a>
        <a href="project-name/project-name-flamegraph.svg">Flame Graph</a>
    </div>
</div>
```

## Next Steps

1. **Enable GitHub Pages** (see options above)
2. **Wait 1-2 minutes** for deployment
3. **Visit gallery** at the URL
4. **Share links** with others

## Customization

### Change Colors
Edit the CSS gradient in index.html:
```css
background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
```

### Add More Projects
Follow the "Adding More Profilers" section above.

### Add Project Images
Add screenshots or thumbnails to each project folder, then link from the card.

## Troubleshooting

### Pages Not Deploying
- Check Settings > Pages for deployment status
- Ensure `master` branch has an `index.html`
- Wait up to 5 minutes for first deployment
- Check "Actions" tab for build errors

### Links Don't Work
- Verify file paths (case-sensitive on Linux/GitHub)
- Check that HTML and JS files are in the same folder
- Browser console (F12) for errors

### 404 Errors
- Ensure file exists in repository
- Check filename spelling (including extensions)
- Verify commit was pushed successfully

## Repository Info

- **Owner:** halbot-ai
- **Repo:** 6502-profilers
- **Visibility:** Public
- **Default Branch:** master
- **Files:** 7 (index.html + 4 projects)

---

Ready to host! 🚀 Enable GitHub Pages to go live.
