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
        // Ignore clicks on existing text boxes, containers (for clicks in padding area), delete buttons, or drag handles
        if (e.target.classList.contains('text-box') || 
            e.target.classList.contains('text-box-container') ||
            e.target.classList.contains('delete-btn') ||
            e.target.classList.contains('drag-handle')) {
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

        // Create drag handle
        const dragHandle = document.createElement('button');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '&#9776;'; // Trigram symbol (☰) used as drag handle icon
        dragHandle.title = 'Drag to move';
        dragHandle.setAttribute('aria-label', 'Drag handle - click and drag to move text box');

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

        // Helper function to start drag operation from drag handle
        function startDragFromHandle(clientX, clientY) {
            // Deselect any other text box
            if (selectedTextBox && selectedTextBox !== textBox) {
                const oldContainer = selectedTextBox.closest('.text-box-container');
                if (oldContainer) {
                    oldContainer.classList.remove('selected');
                }
                selectedTextBox.blur();
            }
            
            isDragging = true;
            activeTextBox = textBox;
            selectedTextBox = textBox;
            container.classList.add('selected');
            const boxRect = container.getBoundingClientRect();
            dragOffsetX = clientX - boxRect.left;
            dragOffsetY = clientY - boxRect.top;
        }

        // Drag handle - mouse events
        dragHandle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startDragFromHandle(e.clientX, e.clientY);
        });

        // Drag handle - touch events for mobile support
        dragHandle.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            startDragFromHandle(touch.clientX, touch.clientY);
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

        container.appendChild(dragHandle);
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
            if (!container) {
                console.warn('Text box container not found during drag operation');
                return;
            }
            
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

    // Handle touch move for mobile drag support
    document.addEventListener('touchmove', function(e) {
        if (isDragging && activeTextBox) {
            const container = activeTextBox.closest('.text-box-container');
            if (!container) {
                console.warn('Text box container not found during drag operation');
                return;
            }
            
            const touch = e.touches[0];
            const containerRect = canvasContainer.getBoundingClientRect();
            let newX = touch.clientX - containerRect.left - dragOffsetX;
            let newY = touch.clientY - containerRect.top - dragOffsetY;

            // Keep within bounds
            newX = Math.max(0, Math.min(newX, containerRect.width - container.offsetWidth));
            newY = Math.max(0, Math.min(newY, containerRect.height - container.offsetHeight));

            container.style.left = newX + 'px';
            container.style.top = newY + 'px';
        }
    }, { passive: false });

    // Handle drag end
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            activeTextBox = null;
        }
    });

    // Handle touch end for mobile drag support
    document.addEventListener('touchend', function() {
        if (isDragging) {
            isDragging = false;
            activeTextBox = null;
        }
    });

    // Helper function to calculate actual image bounds within container (accounting for object-fit: contain)
    function getImageBounds() {
        const background = document.getElementById('background');
        const containerRect = canvasContainer.getBoundingClientRect();
        
        // Get the natural dimensions of the image
        const imgNaturalWidth = background.naturalWidth;
        const imgNaturalHeight = background.naturalHeight;
        
        // Calculate the aspect ratios
        const containerAspect = containerRect.width / containerRect.height;
        const imgAspect = imgNaturalWidth / imgNaturalHeight;
        
        let renderedWidth, renderedHeight, offsetX, offsetY;
        
        if (imgAspect > containerAspect) {
            // Image is wider relative to container - width fills container
            renderedWidth = containerRect.width;
            renderedHeight = containerRect.width / imgAspect;
            offsetX = 0;
            offsetY = (containerRect.height - renderedHeight) / 2;
        } else {
            // Image is taller relative to container - height fills container
            renderedHeight = containerRect.height;
            renderedWidth = containerRect.height * imgAspect;
            offsetX = (containerRect.width - renderedWidth) / 2;
            offsetY = 0;
        }
        
        return {
            offsetX: offsetX,
            offsetY: offsetY,
            width: renderedWidth,
            height: renderedHeight,
            containerWidth: containerRect.width,
            containerHeight: containerRect.height
        };
    }

    // Print button - scale content to fit on single page
    printBtn.addEventListener('click', function() {
        // Get the actual image bounds (accounting for object-fit: contain)
        const imageBounds = getImageBounds();
        const background = document.getElementById('background');

        // Store original positions and calculate relative positions
        const textBoxContainers = textLayer.querySelectorAll('.text-box-container');
        const originalStyles = [];

        textBoxContainers.forEach(function(container) {
            const left = parseFloat(container.style.left) || 0;
            const top = parseFloat(container.style.top) || 0;
            
            // Store original values
            originalStyles.push({
                container: container,
                left: container.style.left,
                top: container.style.top
            });

            // Calculate position relative to the actual image (not the container)
            // This accounts for the offset created by object-fit: contain
            const relativeToImageLeft = left - imageBounds.offsetX;
            const relativeToImageTop = top - imageBounds.offsetY;
            
            // Convert to percentage of the actual image dimensions
            const leftPercent = (relativeToImageLeft / imageBounds.width) * 100;
            const topPercent = (relativeToImageTop / imageBounds.height) * 100;
            
            container.style.left = leftPercent + '%';
            container.style.top = topPercent + '%';
        });

        // Store original text layer styles
        const originalTextLayerStyles = {
            width: textLayer.style.width,
            height: textLayer.style.height,
            left: textLayer.style.left,
            top: textLayer.style.top,
            position: textLayer.style.position,
            transform: textLayer.style.transform
        };

        // Calculate the image aspect ratio for print positioning
        const imgAspect = background.naturalWidth / background.naturalHeight;
        
        // Set CSS custom property for the image aspect ratio
        // This allows the print CSS to position the text layer to match the image
        canvasContainer.style.setProperty('--img-aspect-ratio', imgAspect);

        // Restore original pixel-based positions after print dialog closes
        function restorePositions() {
            originalStyles.forEach(function(item) {
                item.container.style.left = item.left;
                item.container.style.top = item.top;
            });
            // Restore text layer styles
            textLayer.style.width = originalTextLayerStyles.width;
            textLayer.style.height = originalTextLayerStyles.height;
            textLayer.style.left = originalTextLayerStyles.left;
            textLayer.style.top = originalTextLayerStyles.top;
            textLayer.style.position = originalTextLayerStyles.position;
            textLayer.style.transform = originalTextLayerStyles.transform;
            canvasContainer.style.removeProperty('--img-aspect-ratio');
            window.removeEventListener('afterprint', restorePositions);
        }

        window.addEventListener('afterprint', restorePositions);

        // Print the page
        window.print();
    });

    // Reset button
    resetBtn.addEventListener('click', function() {
        textLayer.innerHTML = '';
    });
});
