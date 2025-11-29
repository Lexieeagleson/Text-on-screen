document.addEventListener('DOMContentLoaded', function() {
    const textLayer = document.getElementById('text-layer');
    const canvasContainer = document.getElementById('canvas-container');
    const printBtn = document.getElementById('print-btn');
    const resetBtn = document.getElementById('reset-btn');

    let activeTextBox = null;
    let selectedTextBox = null;
    let isDragging = false;
    let isResizing = false;
    let resizeDirection = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartWidth = 0;
    let resizeStartHeight = 0;
    let resizeStartLeft = 0;
    let resizeStartTop = 0;
    let activeResizeContainer = null;

    // Click on canvas to create a new text box or deselect
    canvasContainer.addEventListener('click', function(e) {
        // Ignore clicks on existing text boxes, containers (for clicks in padding area), delete buttons, drag handles, or resize handles
        if (e.target.classList.contains('text-box') || 
            e.target.classList.contains('text-box-container') ||
            e.target.classList.contains('delete-btn') ||
            e.target.classList.contains('drag-handle') ||
            e.target.classList.contains('resize-handle') ||
            e.target.classList.contains('dimension-controls') ||
            e.target.closest('.dimension-controls')) {
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

        // Create resize handles (only east and west for width adjustment)
        const resizeDirections = ['e', 'w'];
        resizeDirections.forEach(function(dir) {
            const handle = document.createElement('div');
            handle.className = 'resize-handle ' + dir;
            handle.dataset.direction = dir;
            handle.title = 'Drag to resize';
            
            // Mouse events for resize
            handle.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                startResize(e.clientX, e.clientY, dir, container, textBox);
            });
            
            // Touch events for resize
            handle.addEventListener('touchstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                startResize(touch.clientX, touch.clientY, dir, container, textBox);
            });
            
            container.appendChild(handle);
        });

        // Create dimension controls (width only - height auto-adjusts to content)
        const dimensionControls = document.createElement('div');
        dimensionControls.className = 'dimension-controls';
        
        const widthLabel = document.createElement('label');
        widthLabel.textContent = 'W:';
        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.min = '50';
        widthInput.max = '1000';
        widthInput.value = '100';
        widthInput.title = 'Width in pixels';
        widthInput.setAttribute('aria-label', 'Text box width');
        
        dimensionControls.appendChild(widthLabel);
        dimensionControls.appendChild(widthInput);

        // Handle dimension input changes
        widthInput.addEventListener('input', function(e) {
            e.stopPropagation();
            const newWidth = Math.max(50, Math.min(1000, parseInt(this.value) || 50));
            textBox.style.width = newWidth + 'px';
            // Trigger height auto-adjustment
            adjustTextBoxHeight(textBox);
        });
        
        widthInput.addEventListener('change', function() {
            const newWidth = Math.max(50, Math.min(1000, parseInt(this.value) || 50));
            this.value = newWidth;
            textBox.style.width = newWidth + 'px';
            // Trigger height auto-adjustment
            adjustTextBoxHeight(textBox);
        });

        // Prevent clicks on dimension controls from propagating
        dimensionControls.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        dimensionControls.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });

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

        // Auto-resize textarea height as content changes
        textBox.addEventListener('input', function() {
            adjustTextBoxHeight(this);
            // Update dimension inputs
            updateDimensionInputs(container);
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
            if (!isDragging && !isResizing) {
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
                updateDimensionInputs(container);
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
        container.appendChild(dimensionControls);
        textLayer.appendChild(container);
        textBox.focus();
        selectedTextBox = textBox;
        
        // Initialize dimension inputs after textbox is in the DOM
        setTimeout(function() {
            updateDimensionInputs(container);
        }, 0);
    }

    // Start resize operation
    function startResize(clientX, clientY, direction, container, textBox) {
        isResizing = true;
        resizeDirection = direction;
        activeResizeContainer = container;
        activeTextBox = textBox;
        
        resizeStartX = clientX;
        resizeStartY = clientY;
        resizeStartWidth = textBox.offsetWidth;
        resizeStartHeight = textBox.offsetHeight;
        resizeStartLeft = parseFloat(container.style.left) || 0;
        resizeStartTop = parseFloat(container.style.top) || 0;
        
        // Select this text box
        if (selectedTextBox && selectedTextBox !== textBox) {
            const oldContainer = selectedTextBox.closest('.text-box-container');
            if (oldContainer) {
                oldContainer.classList.remove('selected');
            }
            selectedTextBox.blur();
        }
        selectedTextBox = textBox;
        container.classList.add('selected');
    }

    // Update dimension inputs based on current text box size
    function updateDimensionInputs(container) {
        const textBox = container.querySelector('.text-box');
        const widthInput = container.querySelector('.dimension-controls input[aria-label="Text box width"]');
        
        if (textBox && widthInput) {
            widthInput.value = Math.round(textBox.offsetWidth);
        }
    }

    // Adjust text box height to fit content
    function adjustTextBoxHeight(textBox) {
        textBox.style.height = 'auto';
        textBox.style.height = textBox.scrollHeight + 'px';
    }

    // Handle drag movement
    document.addEventListener('mousemove', function(e) {
        if (isResizing && activeResizeContainer && activeTextBox) {
            handleResize(e.clientX, e.clientY);
        } else if (isDragging && activeTextBox) {
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
        if (isResizing && activeResizeContainer && activeTextBox) {
            const touch = e.touches[0];
            handleResize(touch.clientX, touch.clientY);
        } else if (isDragging && activeTextBox) {
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

    // Handle resize operation (width only - height auto-adjusts)
    function handleResize(clientX, clientY) {
        const deltaX = clientX - resizeStartX;
        
        let newWidth = resizeStartWidth;
        let newLeft = resizeStartLeft;
        
        const minWidth = 50;
        
        // Calculate new width based on resize direction (only e and w)
        switch (resizeDirection) {
            case 'e': // East - resize right
                newWidth = Math.max(minWidth, resizeStartWidth + deltaX);
                break;
            case 'w': // West - resize left
                newWidth = Math.max(minWidth, resizeStartWidth - deltaX);
                if (newWidth !== minWidth) {
                    newLeft = resizeStartLeft + deltaX;
                }
                break;
        }
        
        // Apply new width
        activeTextBox.style.width = newWidth + 'px';
        activeResizeContainer.style.left = newLeft + 'px';
        
        // Auto-adjust height to fit content
        adjustTextBoxHeight(activeTextBox);
        
        // Update dimension inputs
        updateDimensionInputs(activeResizeContainer);
    }

    // Handle drag end
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            activeTextBox = null;
        }
        if (isResizing) {
            isResizing = false;
            resizeDirection = null;
            activeResizeContainer = null;
            activeTextBox = null;
        }
    });

    // Handle touch end for mobile drag support
    document.addEventListener('touchend', function() {
        if (isDragging) {
            isDragging = false;
            activeTextBox = null;
        }
        if (isResizing) {
            isResizing = false;
            resizeDirection = null;
            activeResizeContainer = null;
            activeTextBox = null;
        }
    });

    // Helper function to calculate the actual rendered image bounds
    // This accounts for object-fit: contain which centers the image
    function getRenderedImageBounds() {
        const background = document.getElementById('background');
        const containerRect = canvasContainer.getBoundingClientRect();
        
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        const imgNaturalWidth = background.naturalWidth;
        const imgNaturalHeight = background.naturalHeight;
        
        const containerAspect = containerWidth / containerHeight;
        const imgAspect = imgNaturalWidth / imgNaturalHeight;
        
        let renderedWidth, renderedHeight, offsetX, offsetY;
        
        if (imgAspect > containerAspect) {
            // Image is wider - width fills container
            renderedWidth = containerWidth;
            renderedHeight = containerWidth / imgAspect;
            offsetX = 0;
            offsetY = (containerHeight - renderedHeight) / 2;
        } else {
            // Image is taller - height fills container
            renderedHeight = containerHeight;
            renderedWidth = containerHeight * imgAspect;
            offsetX = (containerWidth - renderedWidth) / 2;
            offsetY = 0;
        }
        
        return { offsetX, offsetY, width: renderedWidth, height: renderedHeight };
    }

    // Print button - scale content to fit on single page
    printBtn.addEventListener('click', function() {
        const background = document.getElementById('background');
        const imageBounds = getRenderedImageBounds();

        // Store original positions and calculate relative positions
        const textBoxContainers = textLayer.querySelectorAll('.text-box-container');
        const originalStyles = [];

        textBoxContainers.forEach(function(container) {
            const left = parseFloat(container.style.left) || 0;
            const top = parseFloat(container.style.top) || 0;
            const textBox = container.querySelector('.text-box');
            
            // Store original values (width only - height auto-adjusts)
            originalStyles.push({
                container: container,
                left: container.style.left,
                top: container.style.top,
                width: textBox ? textBox.style.width : null
            });

            // Calculate position relative to actual rendered image (not container)
            const relativeLeft = left - imageBounds.offsetX;
            const relativeTop = top - imageBounds.offsetY;
            
            // Convert to percentage of actual image dimensions
            const leftPercent = (relativeLeft / imageBounds.width) * 100;
            const topPercent = (relativeTop / imageBounds.height) * 100;
            
            container.style.left = leftPercent + '%';
            container.style.top = topPercent + '%';
            
            // Convert text box width to percentage-based for print (height auto-adjusts)
            if (textBox) {
                const textBoxWidth = textBox.offsetWidth;
                const widthPercent = (textBoxWidth / imageBounds.width) * 100;
                textBox.style.width = widthPercent + '%';
            }
        });

        // Store original text layer style
        const originalTextLayerStyle = textLayer.getAttribute('style') || '';
        
        // Position text layer to match image bounds during print
        const imgAspect = background.naturalWidth / background.naturalHeight;
        textLayer.style.cssText = `
            position: absolute;
            width: auto;
            height: 100%;
            aspect-ratio: ${imgAspect};
            max-width: 100%;
            max-height: 100%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        `;

        // Restore original positions after print dialog closes
        function restorePositions() {
            originalStyles.forEach(function(item) {
                item.container.style.left = item.left;
                item.container.style.top = item.top;
                const textBox = item.container.querySelector('.text-box');
                if (textBox) {
                    textBox.style.width = item.width;
                    // Re-adjust height after restoring width
                    adjustTextBoxHeight(textBox);
                }
            });
            textLayer.setAttribute('style', originalTextLayerStyle);
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
