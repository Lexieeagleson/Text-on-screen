document.addEventListener('DOMContentLoaded', function() {
    const textLayer = document.getElementById('text-layer');
    const canvasContainer = document.getElementById('canvas-container');
    const printBtn = document.getElementById('print-btn');
    const resetBtn = document.getElementById('reset-btn');

    let activeTextBox = null;
    let selectedTextBox = null;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // Click on canvas to create a new text box or deselect
    canvasContainer.addEventListener('click', function(e) {
        // Ignore clicks on existing text boxes
        if (e.target.classList.contains('text-box')) {
            return;
        }

        // Deselect any selected text box when clicking on canvas
        if (selectedTextBox) {
            selectedTextBox.classList.remove('selected');
            selectedTextBox.blur();
            selectedTextBox = null;
        }

        const rect = canvasContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        createTextBox(x, y);
    });

    function createTextBox(x, y) {
        const textBox = document.createElement('textarea');
        textBox.className = 'text-box';
        textBox.style.left = x + 'px';
        textBox.style.top = y + 'px';
        textBox.rows = 1;

        // Auto-resize textarea as content changes
        textBox.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });

        // Handle drag start - can drag when selected (not editing)
        textBox.addEventListener('mousedown', function(e) {
            // Select this text box
            if (selectedTextBox && selectedTextBox !== this) {
                selectedTextBox.classList.remove('selected');
                selectedTextBox.blur();
            }
            
            // If not in edit mode (not focused), allow dragging
            if (document.activeElement !== this) {
                e.preventDefault();
                isDragging = true;
                activeTextBox = this;
                selectedTextBox = this;
                this.classList.add('selected');
                const boxRect = this.getBoundingClientRect();
                dragOffsetX = e.clientX - boxRect.left;
                dragOffsetY = e.clientY - boxRect.top;
            }
        });

        // Single click to select for moving
        textBox.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!isDragging) {
                // Select but don't focus (for moving)
                if (selectedTextBox && selectedTextBox !== this) {
                    selectedTextBox.classList.remove('selected');
                    selectedTextBox.blur();
                }
                selectedTextBox = this;
                this.classList.add('selected');
            }
        });

        // Double-click to enter edit mode
        textBox.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            this.classList.remove('selected');
            this.focus();
            selectedTextBox = this;
        });

        textLayer.appendChild(textBox);
        textBox.focus();
        selectedTextBox = textBox;
    }

    // Handle drag movement
    document.addEventListener('mousemove', function(e) {
        if (isDragging && activeTextBox) {
            const containerRect = canvasContainer.getBoundingClientRect();
            let newX = e.clientX - containerRect.left - dragOffsetX;
            let newY = e.clientY - containerRect.top - dragOffsetY;

            // Keep within bounds
            newX = Math.max(0, Math.min(newX, containerRect.width - activeTextBox.offsetWidth));
            newY = Math.max(0, Math.min(newY, containerRect.height - activeTextBox.offsetHeight));

            activeTextBox.style.left = newX + 'px';
            activeTextBox.style.top = newY + 'px';
        }
    });

    // Handle drag end
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            activeTextBox = null;
        }
    });

    // Print button
    printBtn.addEventListener('click', function() {
        window.print();
    });

    // Reset button
    resetBtn.addEventListener('click', function() {
        textLayer.innerHTML = '';
    });
});
