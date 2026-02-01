#!/usr/bin/env node
/**
 * Generate Interactive Call Tree Profiler with Proper Instruction Tracking
 * Tracks active subroutine during execution and maps instructions to it
 */

const fs = require('fs');

class CallTreeProfiler {
    constructor(traceFile, symFile) {
        this.traceData = JSON.parse(fs.readFileSync(traceFile, 'utf8'));
        this.events = this.traceData.traceEvents;
        this.symbols = this.parseSymbolFile(symFile);
        this.functionStats = new Map(); // functionName -> { totalCycles, instructions, minAddr, maxAddr }
        this.activeFunction = null; // Currently executing subroutine (from JSR events)
        this.totalCycles = 0;
    }

    parseSymbolFile(filename) {
        const symbols = new Map();
        if (!fs.existsSync(filename)) {
            console.warn('Warning: Symbol file not found: ' + filename);
            return symbols;
        }
        const content = fs.readFileSync(filename, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            const match = trimmed.match(/\.label\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\$([0-9a-fA-F]+)/);
            if (match) {
                const label = match[1];
                const addr = parseInt(match[2], 16);
                symbols.set(addr, label);
            }
        }
        return symbols;
    }

    analyze() {
        // First pass: Build call tree from JSR/RTS events and track active function
        const callTree = { name: 'root', children: [], totalCycles: 0, minAddr: Infinity, maxAddr: -1 };
        const callStack = [{ node: callTree, startCycles: 0 }];
        
        // Track active subroutine for instruction mapping
        this.activeFunction = 'root';

        for (const event of this.events) {
            if (event.ph === 'B' && event.cat === 'subroutine') {
                // Subroutine call - enter this function
                const parentNode = callStack[callStack.length - 1].node;
                const childNode = {
                    name: event.name,
                    children: [],
                    totalCycles: 0,
                    callCount: 0,
                    minAddr: Infinity,
                    maxAddr: -1
                };
                parentNode.children.push(childNode);
                callStack.push({ node: childNode, startCycles: event.ts });
                this.activeFunction = event.name;
            } else if (event.ph === 'E' && event.cat === 'subroutine') {
                // Subroutine return - exit current function
                if (callStack.length > 1) {
                    const frame = callStack.pop();
                    frame.node.callCount++;
                    
                    // Update function's address range
                    if (frame.node.minAddr === Infinity) {
                        frame.node.minAddr = frame.node.minAddr;
                    }
                }
                this.activeFunction = callStack.length > 1 
                    ? callStack[callStack.length - 2].node.name 
                    : 'root';
            } else if (event.ph === 'X') {
                // Instruction event - map to active function
                const addr = parseInt(event.args.addr.substring(1), 16);
                const cycles = event.args.cycles || 0;
                this.totalCycles += cycles;

                // Get the currently active subroutine name
                const funcName = this.activeFunction;

                // Initialize function stats if not exists
                if (!this.functionStats.has(funcName)) {
                    this.functionStats.set(funcName, {
                        totalCycles: 0,
                        instructions: new Map()
                    });
                }

                // Update function's stats
                const stats = this.functionStats.get(funcName);
                stats.totalCycles += cycles;

                // Track function's address range
                if (addr < stats.minAddr || stats.minAddr === Infinity) {
                    stats.minAddr = addr;
                }
                if (addr > stats.maxAddr || stats.maxAddr === -1) {
                    stats.maxAddr = addr;
                }

                // Track instruction by mnemonic
                const instKey = event.name.split(' ')[0];
                const instStats = stats.instructions.get(instKey) || { count: 0, cycles: 0 };
                instStats.count++;
                instStats.cycles += cycles;
                stats.instructions.set(instKey, instStats);
            }
        }

        return callTree;
    }

    generateHTML(callTree) {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>6502 Call Tree Profiler</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            background: #1e1e1e;
            color: #d4d4d4d;
            line-height: 1.5;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #3e3e3e;
        }

        .header h1 {
            font-size: 24px;
            color: #61afef;
            margin-bottom: 10px;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }

        .stat-box {
            background: #3e3e3e;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #4e4e4e;
        }

        .stat-label {
            color: #888;
            font-size: 12px;
            margin-bottom: 5px;
        }

        .stat-value {
            color: #61afef;
            font-size: 18px;
            font-weight: bold;
        }

        .search-box {
            width: 100%;
            padding: 10px;
            background: #2d2d2d;
            border: 1px solid #3e3e3e;
            border-radius: 4px;
            color: #d4d4d4d;
            font-family: inherit;
            margin-bottom: 15px;
            font-size: 14px;
        }

        .search-box:focus {
            outline: none;
            border-color: #61afef;
        }

        .tree {
            background: #252526;
            border-radius: 8px;
            border: 1px solid #3e3e3e;
        }

        .node {
            border-bottom: 1px solid #2e2e2e;
        }

        .node:last-child {
            border-bottom: none;
        }

        .node-header {
            display: grid;
            grid-template-columns: 40px 2fr 120px 120px 80px;
            gap: 10px;
            padding: 12px;
            background: #2c2c2d;
            cursor: pointer;
            align-items: center;
            transition: background 0.2s;
        }

        .node-header:hover {
            background: #363637;
        }

        .node-header.selected {
            background: #3e3e3e;
        }

        .expand-btn {
            width: 24px;
            height: 24px;
            background: #3e3e3e;
            border: none;
            border-radius: 4px;
            color: #61afef;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }

        .expand-btn:hover {
            background: #4e4e4e;
        }

        .expand-btn.expanded {
            transform: rotate(90deg);
        }

        .node-name {
            color: #e5c07b;
            font-weight: bold;
            padding-left: 0px;
        }

        .node-name.level-1 { padding-left: 0px; }
        .node-name.level-2 { padding-left: 20px; }
        .node-name.level-3 { padding-left: 40px; }
        .node-name.level-4 { padding-left: 60px; }
        .node-name.level-5 { padding-left: 80px; }
        .node-name.level-6 { padding-left: 100px; }
        .node-name.level-7 { padding-left: 120px; }
        .node-name.level-8 { padding-left: 140px; }

        .stat {
            text-align: right;
            font-size: 12px;
        }

        .stat.primary {
            color: #98c379;
            font-weight: bold;
        }

        .stat.secondary {
            color: #e06c75;
        }

        .stat.tertiary {
            color: #d19a66;
        }

        .stat.quaternary {
            color: #61afef;
        }

        .children {
            display: none;
            background: #1e1e1e;
        }

        .children.visible {
            display: block;
        }

        .instructions {
            display: none;
            background: #1a1a1a;
            border-top: 1px solid #2e2e2e;
            margin-left: 40px;
        }

        .instructions.visible {
            display: block;
        }

        .instruction-row {
            display: grid;
            grid-template-columns: 2fr 120px 120px 120px;
            gap: 10px;
            padding: 8px 12px;
            border-bottom: 1px solid #2a2a2a;
            align-items: center;
            font-size: 12px;
        }

        .instruction-row:last-child {
            border-bottom: none;
        }

        .instruction-name {
            color: #c678dd;
        }

        .legend {
            background: #2d2d2d;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            border: 1px solid #3e3e3e;
        }

        .legend h3 {
            color: #61afef;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .legend-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }

        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 2px;
        }

        .empty-message {
            padding: 40px;
            text-align: center;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>6502 Call Tree Profiler</h1>
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-label">Total Cycles</div>
                    <div class="stat-value">\${this.totalCycles.toLocaleString()}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Functions</div>
                    <div class="stat-value">\${this.countFunctions(callTree)}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Total Time</div>
                    <div class="stat-value">\${(this.totalCycles / 1000).toFixed(3)}ms</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Clock</div>
                    <div class="stat-value">1.0 MHz</div>
                </div>
            </div>
        </div>

        <input type="text" class="search-box" placeholder="Search functions... (type to filter)" id="searchBox">

        <div class="tree" id="tree">
            \${this.generateNodeHTML(callTree.children, 1)}
        </div>

        <div class="legend">
            <h3>Legend</h3>
            <div class="legend-grid">
                <div class="legend-item">
                    <div class="legend-color" style="background: #98c379"></div>
                    <span>Cycles (total)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #e06c75"></div>
                    <span>% of total</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #d19a66"></div>
                    <span>% of function</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #61afef"></div>
                    <span>Call count</span>
                </div>
            </div>
        </div>
    </div>

    <script src="calltree.js"></script>
</body>
</html>`;

        return html;
    }

    generateNodeHTML(nodes, level) {
        if (nodes.length === 0) {
            return '<div class="empty-message">No function calls detected</div>';
        }

        return nodes.map(node => {
            const pctOfTotal = this.totalCycles > 0 ? ((node.totalCycles / this.totalCycles) * 100).toFixed(1) : '0.0';
            const hasChildren = node.children.length > 0;
            const funcStats = this.functionStats.get(node.name);
            const hasInstructions = funcStats && funcStats.instructions.size > 0;

            return \`
                <div class="node" data-name="\${node.name.toLowerCase()}">
                    <div class="node-header" onclick="toggleNode(this)">
                        <button class="expand-btn" \${hasChildren ? '' : 'style="visibility: hidden"'}>▶</button>
                        <div class="node-name level-\${level}">\${node.name}</div>
                        <div class="stat primary">\${node.totalCycles.toLocaleString()}</div>
                        <div class="stat secondary">\${pctOfTotal}%</div>
                        <div class="stat tertiary">\${node.callCount}×</div>
                    </div>
                    <div class="children">
                        \${this.generateNodeHTML(node.children, level + 1)}
                    </div>
                    <div class="instructions" \${hasInstructions ? '' : 'style="display: none"'}>
                        \${this.generateInstructionsHTML(node.name)}
                    </div>
                </div>
            \`;
        }).join('');
    }

    generateInstructionsHTML(functionName) {
        const stats = this.functionStats.get(functionName);
        if (!stats || stats.instructions.size === 0) {
            return '<div class="empty-message">No instruction data</div>';
        }

        const totalFuncCycles = stats.totalCycles;
        const instructions = Array.from(stats.instructions.entries())
            .sort((a, b) => b[1].cycles - a[1].cycles);

        const rows = instructions.map(([instName, instStats]) => {
            const pctOfFunc = totalFuncCycles > 0 ? ((instStats.cycles / totalFuncCycles) * 100).toFixed(1) : '0.0';
            const pctOfTotal = this.totalCycles > 0 ? ((instStats.cycles / this.totalCycles) * 100).toFixed(2) : '0.00';

            return \`
                <div class="instruction-row">
                    <div class="instruction-name">\${instName}</div>
                    <div class="stat primary">\${instStats.cycles.toLocaleString()}</div>
                    <div class="stat secondary">\${pctOfFunc}%</div>
                    <div class="stat tertiary">\${pctOfTotal}%</div>
                </div>
            \`;
        }).join('');

        return \`
            <div class="instruction-row" style="background: #252526; font-weight: bold; border-bottom: 2px solid #3e3e3e;">
                <div>Instruction</div>
                <div class="stat primary">Cycles</div>
                <div class="stat secondary">% of Function</div>
                <div class="stat tertiary">% of Total</div>
            </div>
            \${rows}
        \`;
    }

    countFunctions(node) {
        let count = 0;
        for (const child of node.children) {
            count += 1 + this.countFunctions(child);
        }
        return count;
    }

    saveHTML(filename) {
        const callTree = this.analyze();
        const html = this.generateHTML(callTree);
        const js = this.generateJS();

        fs.writeFileSync(filename, html);
        fs.writeFileSync(filename.replace('.html', '.js'), js);

        console.log('\\n✓ Call tree profiler saved to: ' + filename);
        console.log('  Script saved to: ' + filename.replace('.html', '.js'));
        console.log('  Open in browser: file://' + fs.realpathSync(filename));
        console.log('\\nFeatures:');
        console.log('  • Hierarchical function tree (parent → child)');
        console.log('  • Instructions mapped to ACTIVE subroutine');
        console.log('  • Expand/collapse to explore');
        console.log('  • Search to filter');
        console.log('  • Shows: cycles, % of total, % of function, calls');
    }

    generateJS() {
        return \`// 6502 Call Tree Profiler - Interactive Functions

// Toggle node expand/collapse
function toggleNode(header) {
    const node = header.parentElement;
    const children = node.querySelector('.children');
    const instructions = node.querySelector('.instructions');
    const btn = header.querySelector('.expand-btn');

    if (children && children.children.length > 0) {
        children.classList.toggle('visible');
        btn.classList.toggle('expanded');
    } else if (instructions) {
        instructions.classList.toggle('visible');
        if (btn) {
            btn.classList.toggle('expanded');
        }
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchBox = document.getElementById('searchBox');
    
    if (!searchBox) return;
    
    searchBox.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        const nodes = document.querySelectorAll('.node');
        
        nodes.forEach(node => {
            const name = node.getAttribute('data-name') || '';
            
            if (query === '' || name.includes(query)) {
                node.style.display = 'block';
                
                const children = node.querySelector('.children');
                if (children && children.children.length > 0) {
                    children.classList.add('visible');
                    const btn = node.querySelector('.expand-btn');
                    if (btn) btn.classList.add('expanded');
                }
            } else {
                node.style.display = 'none';
            }
        });
    });
});

// Click on node name also toggles
document.querySelectorAll('.node-name').forEach(function(nameEl) {
    nameEl.addEventListener('click', function(e) {
        e.stopPropagation();
        const header = this.parentElement;
        toggleNode(header);
    });
});
\`;
    }
}

function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log(\`
Usage: node call-tree-profiler-v5-final.js <trace.json> <symbols.sym> [output.html]

Generate interactive HTML call tree with proper instruction tracking.

Shows:
  • Hierarchical function tree (parent → child)
  • ALL instructions mapped to the ACTIVE subroutine
  • Expand/collapse to explore call hierarchy
  • Cumulative cycles + percentages

Examples:
  node call-tree-profiler-v5-final.js trace.json symbols.js profiler.html
  node call-tree-profiler-v5-final.js algorithms-flame.json projects/algorithms.sym
\`);
        process.exit(1);
    }

    const traceFile = args[0];
    const symFile = args[1];
    const outputFile = args[2] || 'profiler.html';

    if (!fs.existsSync(traceFile)) {
        console.error(\`Error: Trace file not found: \${traceFile}\`);
        process.exit(1);
    }

    console.log(\`Processing trace: \${traceFile}\`);
    console.log(\`Loading symbols: \${symFile}\`);

    const profiler = new CallTreeProfiler(traceFile, symFile);
    profiler.saveHTML(outputFile);
}

if (require.main === module) {
    main();
}

module.exports = CallTreeProfiler;
