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
        // Ignore clicks on existing text boxes, containers, or delete buttons
        if (e.target.classList.contains('text-box') || 
            e.target.classList.contains('text-box-container') ||
            e.target.classList.contains('delete-btn')) {
            return;
        }

        // Deselect any selected text box when clicking on canvas
        if (selectedTextBox) {
            const container = selectedTextBox.closest('.text-box-container');
            if (container) {
                container.classList.remove('selected');
            }
            selectedTextBox.blur();
            selectedTextBox = null;
        }

        const rect = canvasContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        createTextBox(x, y);
    });

    function createTextBox(x, y) {
        // Create container for text box and delete button
        const container = document.createElement('div');
        container.className = 'text-box-container';
        container.style.left = x + 'px';
        container.style.top = y + 'px';

        const textBox = document.createElement('textarea');
        textBox.className = 'text-box';
        textBox.rows = 1;

        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete text box';

        // Delete button click handler
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this text box?')) {
                if (selectedTextBox === textBox) {
                    selectedTextBox = null;
                }
                if (activeTextBox === textBox) {
                    activeTextBox = null;
                }
                container.remove();
            }
        });

        // Auto-resize textarea as content changes
        textBox.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });

        // Handle drag start - can drag when selected (not editing)
        textBox.addEventListener('mousedown', function(e) {
            // Select this text box
            if (selectedTextBox && selectedTextBox !== this) {
                const oldContainer = selectedTextBox.closest('.text-box-container');
                if (oldContainer) {
                    oldContainer.classList.remove('selected');
                }
                selectedTextBox.blur();
            }
            
            // If not in edit mode (not focused), allow dragging
            if (document.activeElement !== this) {
                e.preventDefault();
                isDragging = true;
                activeTextBox = this;
                selectedTextBox = this;
                container.classList.add('selected');
                const boxRect = container.getBoundingClientRect();
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
                    const oldContainer = selectedTextBox.closest('.text-box-container');
                    if (oldContainer) {
                        oldContainer.classList.remove('selected');
                    }
                    selectedTextBox.blur();
                }
                selectedTextBox = this;
                container.classList.add('selected');
            }
        });

        // Double-click to enter edit mode
        textBox.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            container.classList.remove('selected');
            this.focus();
            selectedTextBox = this;
        });

        container.appendChild(textBox);
        container.appendChild(deleteBtn);
        textLayer.appendChild(container);
        textBox.focus();
        selectedTextBox = textBox;
    }

    // Handle drag movement
    document.addEventListener('mousemove', function(e) {
        if (isDragging && activeTextBox) {
            const container = activeTextBox.closest('.text-box-container');
            if (!container) return;
            
            const containerRect = canvasContainer.getBoundingClientRect();
            let newX = e.clientX - containerRect.left - dragOffsetX;
            let newY = e.clientY - containerRect.top - dragOffsetY;

            // Keep within bounds
            newX = Math.max(0, Math.min(newX, containerRect.width - container.offsetWidth));
            newY = Math.max(0, Math.min(newY, containerRect.height - container.offsetHeight));

            container.style.left = newX + 'px';
            container.style.top = newY + 'px';
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
