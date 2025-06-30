class MarkdownRenderer {
    constructor() {
        this.content = '';
    }

    async loadMarkdown(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.content = await response.text();
            return this.content;
        } catch (error) {
            console.error('Error loading markdown file:', error);
            throw error;
        }
    }

    renderToHTML() {
        if (!this.content) {
            return '<p>No content to render</p>';
        }

        let html = this.content;

        // Headers (simple without IDs)
        html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Bold text
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic text
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // Horizontal rules
        html = html.replace(/^---$/gm, '<hr>');

        // Lists
        html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
        
        // Process paragraphs more carefully
        const lines = html.split('\n');
        const processedLines = [];
        let inList = false;
        let inCodeBlock = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('<pre><code>')) {
                inCodeBlock = true;
            }
            if (line.includes('</code></pre>')) {
                inCodeBlock = false;
            }
            
            if (line.includes('<li>')) {
                if (!inList) {
                    processedLines.push('<ul>');
                    inList = true;
                }
            } else if (inList && !line.includes('<li>') && line.trim() !== '') {
                processedLines.push('</ul>');
                inList = false;
            }
            
            processedLines.push(line);
        }
        
        if (inList) {
            processedLines.push('</ul>');
        }
        
        html = processedLines.join('\n');

        // Convert line breaks to paragraphs, but preserve headers and other elements
        html = html.replace(/\n\n+/g, '\n</p>\n<p>\n');
        html = html.replace(/\n/g, '<br>');

        // Wrap content in paragraphs
        html = '<p>' + html + '</p>';

        // Fix paragraph wrapping around block elements
        html = html.replace(/<p>(<h[1-6][^>]*>)/g, '$1');
        html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)<\/p>/g, '$1');
        html = html.replace(/<p>(<pre>)/g, '$1');
        html = html.replace(/(<\/pre>)<\/p>/g, '$1');
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p><br><\/p>/g, '');

        return html;
    }

    async renderMarkdownFile(filePath, targetElementId) {
        try {
            await this.loadMarkdown(filePath);
            const html = this.renderToHTML();
            const targetElement = document.getElementById(targetElementId);
            
            if (targetElement) {
                targetElement.innerHTML = html;
            } else {
                console.error(`Target element with id "${targetElementId}" not found`);
            }
        } catch (error) {
            console.error('Error rendering markdown:', error);
            const targetElement = document.getElementById(targetElementId);
            if (targetElement) {
                targetElement.innerHTML = `<p>Error loading README.md: ${error.message}</p>`;
            }
        }
    }
}

// Export for use in other files
window.MarkdownRenderer = MarkdownRenderer;