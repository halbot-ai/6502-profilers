// 6502 Call Tree Profiler - Interactive Functions

// Toggle node expand/collapse
function toggleNode(header) {
    const node = header.parentElement;
    const children = node.querySelector('.children');
    const instructions = node.querySelector('.instructions');
    const btn = header.querySelector('.expand-btn');

    // Toggle children if they exist
    if (children && children.children.length > 0 && !children.querySelector('.empty-message')) {
        children.classList.toggle('visible');
        btn.classList.toggle('expanded');
    }

    // Always toggle instructions if they exist
    if (instructions && !instructions.querySelector('.empty-message')) {
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
