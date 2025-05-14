// Mermaid.js initialization and configuration

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Mermaid
    mermaid.initialize({
        startOnLoad: true,
        theme: 'neutral',
        themeCSS: `
            .node rect, .node circle, .node ellipse, .node polygon, .node path {
                stroke-width: 2px;
                rx: 5px;
                ry: 5px;
            }
            .nodeLabel {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 14px;
            }
            .edgeLabel {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 12px;
                background-color: rgba(255, 255, 255, 0.7);
                padding: 2px 4px;
                border-radius: 4px;
            }
            .cluster rect {
                rx: 5px;
                ry: 5px;
                stroke-width: 1px;
            }
        `,
        flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'cardinal',
            rankSpacing: 50,
            nodeSpacing: 50
        },
        securityLevel: 'loose' // Required for click events
    });
    
    // Load diagram content from external files for better organization
    const loadDiagrams = async () => {
        try {
            // Load role relationships diagram
            const rolesElement = document.getElementById('roles-diagram');
            if (rolesElement) {
                const response = await fetch('diagrams/roles-diagram.mmd');
                if (response.ok) {
                    const mermaidCode = await response.text();
                    rolesElement.querySelector('.mermaid').textContent = mermaidCode;
                }
            }
            
            // Load workflow diagram
            const workflowElement = document.getElementById('workflow-diagram');
            if (workflowElement) {
                const response = await fetch('diagrams/workflow-diagram.mmd');
                if (response.ok) {
                    const mermaidCode = await response.text();
                    workflowElement.querySelector('.mermaid').textContent = mermaidCode;
                }
            }
            
            // Load document flow diagram
            const docFlowElement = document.getElementById('document-flow');
            if (docFlowElement) {
                const response = await fetch('diagrams/document-flow.mmd');
                if (response.ok) {
                    const mermaidCode = await response.text();
                    docFlowElement.querySelector('.mermaid').textContent = mermaidCode;
                }
            }
            
            // Re-render diagrams after loading external content
            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
            
        } catch (error) {
            console.error('Error loading diagrams:', error);
        }
    };
    
    // Only try to load external diagrams if we're not in a local file system
    // Otherwise, inline diagrams in the HTML will be used
    if (window.location.protocol !== 'file:') {
        loadDiagrams();
    }
    
    // Add interactivity to diagrams after they've been rendered
    document.addEventListener('DOMContentLoaded', () => {
        // Add click handlers to nodes
        setTimeout(() => {
            const nodes = document.querySelectorAll('.node');
            nodes.forEach(node => {
                node.style.cursor = 'pointer';
                node.addEventListener('click', (e) => {
                    // Get the node id/text and show more info
                    const nodeText = node.querySelector('.nodeLabel').textContent;
                    showNodeInfo(nodeText, e);
                });
            });
        }, 1000); // Give time for diagrams to render
    });
    
    // Function to show more info about a node when clicked
    function showNodeInfo(nodeName, event) {
        // Remove any existing tooltips
        const existingTooltip = document.querySelector('.node-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // Create tooltip content based on node name
        let tooltipContent = '';
        if (nodeName.includes('Boomerang')) {
            tooltipContent = `
                <strong>Boomerang (Technical Lead)</strong>
                <ul class="text-sm mt-2">
                    <li>Task intake and analysis</li>
                    <li>Research delegation</li>
                    <li>Final verification</li>
                    <li>Memory Bank updates</li>
                </ul>
            `;
        } else if (nodeName.includes('Architect')) {
            tooltipContent = `
                <strong>Architect</strong>
                <ul class="text-sm mt-2">
                    <li>Implementation planning</li>
                    <li>Task breakdown</li>
                    <li>Delegation strategy</li>
                    <li>Architecture verification</li>
                </ul>
            `;
        } else if (nodeName.includes('Senior Dev')) {
            tooltipContent = `
                <strong>Senior Developer</strong>
                <ul class="text-sm mt-2">
                    <li>Subtask implementation</li>
                    <li>Junior role delegation</li>
                    <li>Integration of components</li>
                    <li>Testing coordination</li>
                </ul>
            `;
        } else if (nodeName.includes('Junior Coder')) {
            tooltipContent = `
                <strong>Junior Coder</strong>
                <ul class="text-sm mt-2">
                    <li>Component implementation</li>
                    <li>Following established patterns</li>
                    <li>Code documentation</li>
                </ul>
            `;
        } else if (nodeName.includes('Junior Tester')) {
            tooltipContent = `
                <strong>Junior Tester</strong>
                <ul class="text-sm mt-2">
                    <li>Test implementation</li>
                    <li>Edge case testing</li>
                    <li>Test documentation</li>
                </ul>
            `;
        } else if (nodeName.includes('Code Review')) {
            tooltipContent = `
                <strong>Code Reviewer</strong>
                <ul class="text-sm mt-2">
                    <li>Code quality verification</li>
                    <li>Standards compliance</li>
                    <li>Security review</li>
                    <li>Performance assessment</li>
                </ul>
            `;
        } else if (nodeName.includes('Researcher')) {
            tooltipContent = `
                <strong>Researcher</strong>
                <ul class="text-sm mt-2">
                    <li>Knowledge gathering</li>
                    <li>Technology evaluation</li>
                    <li>Best practices research</li>
                    <li>Research report creation</li>
                </ul>
            `;
        } else if (nodeName.includes('Memory Bank')) {
            tooltipContent = `
                <strong>Memory Bank</strong>
                <ul class="text-sm mt-2">
                    <li>ProjectOverview.md</li>
                    <li>TechnicalArchitecture.md</li>
                    <li>DeveloperGuide.md</li>
                </ul>
            `;
        }
        
        // Only create tooltip if we have content
        if (tooltipContent) {
            const tooltip = document.createElement('div');
            tooltip.className = 'node-tooltip absolute bg-white p-4 rounded-lg shadow-lg z-50';
            tooltip.style.top = (event.pageY + 10) + 'px';
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.innerHTML = tooltipContent;
            
            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'absolute top-1 right-1 text-gray-500 hover:text-gray-700';
            closeBtn.innerHTML = '×';
            closeBtn.addEventListener('click', () => tooltip.remove());
            tooltip.appendChild(closeBtn);
            
            document.body.appendChild(tooltip);
            
            // Close tooltip when clicking elsewhere
            document.addEventListener('click', function closeTooltip(e) {
                if (!tooltip.contains(e.target) && e.target !== event.target) {
                    tooltip.remove();
                    document.removeEventListener('click', closeTooltip);
                }
            });
        }
    }
});
