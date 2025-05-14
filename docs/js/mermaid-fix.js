// This file contains the Mermaid diagrams as inline content
// This approach bypasses the need for fetching external files

document.addEventListener('DOMContentLoaded', () => {
    // Define diagram content
    const rolesDiagram = `flowchart TD
    MemoryBank("Memory Bank System")
    Boomerang("🪃 Boomerang\n(Technical Lead)")
    Architect("🏗️ Architect\n(Planning & Design)")
    SeniorDev("💻 Senior Developer\n(Implementation)")
    JuniorCoder("👨‍💻 Junior Coder\n(Component Implementation)")
    JuniorTester("🧪 Junior Tester\n(Testing)")
    CodeReviewer("🔍 Code Reviewer\n(Quality Assurance)")
    Researcher("🔎 Researcher\n(Knowledge Gathering)")

    style MemoryBank fill:#f6d365,stroke:#fda085,color:#333
    style Boomerang fill:#FF9A9E,stroke:#FAD0C4,color:#333
    style Architect fill:#A8EDEA,stroke:#FED6E3,color:#333
    style SeniorDev fill:#84FAB0,stroke:#8FD3F4,color:#333
    style JuniorCoder fill:#D4FC79,stroke:#96E6A1,color:#333
    style JuniorTester fill:#CCFBFF,stroke:#EF96C5,color:#333
    style CodeReviewer fill:#E2B0FF,stroke:#9F44D3,color:#333
    style Researcher fill:#F5F7FA,stroke:#C3CFE2,color:#333

    MemoryBank --> Boomerang
    MemoryBank --> Architect
    MemoryBank --> SeniorDev
    MemoryBank --> CodeReviewer
    
    Boomerang --> Researcher
    Researcher --> Boomerang
    
    Boomerang --> Architect
    Architect --> SeniorDev
    SeniorDev --> JuniorCoder
    SeniorDev --> JuniorTester
    JuniorCoder --> SeniorDev
    JuniorTester --> SeniorDev
    SeniorDev --> Architect
    Architect --> CodeReviewer
    CodeReviewer --> Architect
    Architect --> Boomerang`;

    const workflowDiagram = `flowchart TB
    %% Main workflow
    Start([Task Request]) --> Boomerang1
    Boomerang1["🪃 Boomerang\n Task Intake"] --> MemoryAnalysis["Memory Bank Analysis"]
    MemoryAnalysis --> KnowledgeGap{"Knowledge\nGaps?"}
    KnowledgeGap -->|Yes| Researcher["🔎 Researcher\nKnowledge Gathering"]
    Researcher --> Boomerang2["🪃 Boomerang\nTask Description"]
    KnowledgeGap -->|No| Boomerang2
    
    Boomerang2 --> Architect1["🏗️ Architect\nImplementation Planning"]
    Architect1 --> SeniorDev1["💻 Senior Dev\nSubtask 1 Implementation"]
    
    %% Junior roles
    SeniorDev1 --> JuniorDev["👨‍💻 Junior Coder\nComponent Implementation"]
    SeniorDev1 --> JuniorTest["🧪 Junior Tester\nTest Implementation"]
    JuniorDev --> SeniorDev2["💻 Senior Dev\nIntegration & Review"]
    JuniorTest --> SeniorDev2
    
    %% Continue workflow
    SeniorDev2 --> MoreTasks{"More\nSubtasks?"}
    MoreTasks -->|Yes| SeniorDev1
    MoreTasks -->|No| Architect2["🏗️ Architect\nVerification"]
    
    Architect2 --> CodeReview["🔍 Code Reviewer\nQuality Assurance"]
    CodeReview --> PassReview{"Passes\nReview?"}
    PassReview -->|No| Architect1
    PassReview -->|Yes| Boomerang3["🪃 Boomerang\nFinal Verification"]
    
    Boomerang3 --> MemoryUpdate["Memory Bank Updates"]
    MemoryUpdate --> Complete([Task Complete])
    
    classDef boomerang fill:#FF9A9E,stroke:#FAD0C4,color:#333
    classDef architect fill:#A8EDEA,stroke:#FED6E3,color:#333
    classDef senior fill:#84FAB0,stroke:#8FD3F4,color:#333
    classDef junior fill:#D4FC79,stroke:#96E6A1,color:#333
    classDef juniorTest fill:#CCFBFF,stroke:#EF96C5,color:#333
    classDef reviewer fill:#E2B0FF,stroke:#9F44D3,color:#333
    classDef researcher fill:#F5F7FA,stroke:#C3CFE2,color:#333
    classDef memory fill:#f6d365,stroke:#fda085,color:#333
    classDef decision fill:#f8f8f8,stroke:#666,color:#333
    
    class Boomerang1,Boomerang2,Boomerang3 boomerang
    class Architect1,Architect2 architect
    class SeniorDev1,SeniorDev2 senior
    class JuniorDev junior
    class JuniorTest juniorTest
    class CodeReview reviewer
    class Researcher researcher
    class MemoryAnalysis,MemoryUpdate memory
    class KnowledgeGap,MoreTasks,PassReview decision`;

    const documentFlowDiagram = `flowchart TD
    MemoryBank[(Memory Bank)]
    TaskDesc[Task Description]
    ImplPlan[Implementation Plan]
    SubtaskSpecs[Subtask Specifications]
    CodeReview[Code Review Report]
    Completion[Completion Report]
    
    MemoryBank --> TaskDesc
    TaskDesc --> ImplPlan
    ImplPlan --> SubtaskSpecs
    SubtaskSpecs --> CodeReview
    CodeReview --> Completion
    Completion --> MemoryBank
    
    Boomerang(("🪃"))
    Architect(("🏗️"))
    SeniorDev(("💻"))
    CodeReviewer(("🔍"))
    
    Boomerang -.-> TaskDesc
    Architect -.-> ImplPlan
    SeniorDev -.-> SubtaskSpecs
    CodeReviewer -.-> CodeReview
    Boomerang -.-> Completion
    
    style MemoryBank fill:#f6d365,stroke:#fda085,color:#333
    style TaskDesc fill:#FF9A9E,stroke:#FAD0C4,color:#333
    style ImplPlan fill:#A8EDEA,stroke:#FED6E3,color:#333
    style SubtaskSpecs fill:#84FAB0,stroke:#8FD3F4,color:#333
    style CodeReview fill:#E2B0FF,stroke:#9F44D3,color:#333
    style Completion fill:#FF9A9E,stroke:#FAD0C4,color:#333
    
    style Boomerang fill:#FF9A9E,stroke:#FAD0C4,color:#333
    style Architect fill:#A8EDEA,stroke:#FED6E3,color:#333
    style SeniorDev fill:#84FAB0,stroke:#8FD3F4,color:#333
    style CodeReviewer fill:#E2B0FF,stroke:#9F44D3,color:#333`;

    // Insert diagram content into DOM elements
    const rolesElement = document.getElementById('roles-diagram');
    if (rolesElement) {
        const mermaidEl = rolesElement.querySelector('.mermaid');
        if (mermaidEl) {
            mermaidEl.textContent = rolesDiagram;
        }
    }
    
    const workflowElement = document.getElementById('workflow-diagram');
    if (workflowElement) {
        const mermaidEl = workflowElement.querySelector('.mermaid');
        if (mermaidEl) {
            mermaidEl.textContent = workflowDiagram;
        }
    }
    
    const docFlowElement = document.getElementById('document-flow');
    if (docFlowElement) {
        const mermaidEl = docFlowElement.querySelector('.mermaid');
        if (mermaidEl) {
            mermaidEl.textContent = documentFlowDiagram;
        }
    }

    // Initialize Mermaid after adding content
    try {
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

        // Ensure diagrams are processed
        try {
            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
        } catch (e) {
            console.error('Error initializing Mermaid diagrams:', e);
        }
    } catch (e) {
        console.error('Error initializing Mermaid:', e);
    }
    
    // Add interactivity to diagrams after they've been rendered
    setTimeout(() => {
        try {
            const nodes = document.querySelectorAll('.node');
            nodes.forEach(node => {
                node.style.cursor = 'pointer';
                node.addEventListener('click', (e) => {
                    // Get the node id/text and show more info
                    const nodeText = node.querySelector('.nodeLabel')?.textContent || '';
                    showNodeInfo(nodeText, e);
                });
            });
        } catch (e) {
            console.error('Error adding interactivity to nodes:', e);
        }
    }, 1500); // Give more time for diagrams to render
    
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
