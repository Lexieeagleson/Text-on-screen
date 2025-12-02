document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const textLayer = document.getElementById('text-layer');
    const canvasContainer = document.getElementById('canvas-container');
    const printBtn = document.getElementById('print-btn');
    const resetBtn = document.getElementById('reset-btn');

    // State management
    const state = {
        activeTextBox: null,
        selectedTextBox: null,
        isDragging: false,
        isResizing: false,
        resizeDirection: null,
        dragOffset: { x: 0, y: 0 },
        resizeStart: { x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 },
        activeResizeContainer: null
    };

    // Constants
    const DEFAULT_TEXT_BOX_WIDTH = 100;
    const MIN_TEXT_BOX_WIDTH = 50;
    const CAPTURE_TIMEOUT_MS = 30000;
    const PRINT_TAB_CLOSE_DELAY_MS = 1000;

    // Click on canvas to create a new text box or deselect
    canvasContainer.addEventListener('click', function(e) {
        // Ignore clicks on interactive elements
        if (isInteractiveElement(e.target)) {
            return;
        }

        // Deselect any selected text box when clicking on canvas
        deselectTextBox();

        const rect = canvasContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        createTextBox(x, y);
    });

    // Check if element is interactive (should not trigger new text box)
    function isInteractiveElement(target) {
        return target.classList.contains('text-box') || 
               target.classList.contains('text-box-container') ||
               target.classList.contains('delete-btn') ||
               target.classList.contains('drag-handle') ||
               target.classList.contains('resize-handle');
    }

    // Deselect current text box
    function deselectTextBox() {
        if (state.selectedTextBox) {
            const container = state.selectedTextBox.closest('.text-box-container');
            if (container) {
                container.classList.remove('selected');
            }
            state.selectedTextBox.blur();
            state.selectedTextBox = null;
        }
    }

    function createTextBox(x, y) {
        // Create container for text box and delete button
        const container = document.createElement('div');
        container.className = 'text-box-container';
        container.style.left = x + 'px';
        container.style.top = y + 'px';

        const textBox = document.createElement('textarea');
        textBox.className = 'text-box';
        textBox.rows = 1;
        textBox.style.width = DEFAULT_TEXT_BOX_WIDTH + 'px';

        // Create drag handle
        const dragHandle = createDragHandle(container, textBox);

        // Create delete button
        const deleteBtn = createDeleteButton(container, textBox);

        // Create resize handles (only east and west for width adjustment)
        createResizeHandles(container, textBox);

        // Setup text box event listeners
        setupTextBoxEvents(container, textBox);

        container.appendChild(dragHandle);
        container.appendChild(textBox);
        container.appendChild(deleteBtn);
        textLayer.appendChild(container);
        textBox.focus();
        state.selectedTextBox = textBox;
    }

    // Create drag handle element
    function createDragHandle(container, textBox) {
        const dragHandle = document.createElement('button');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '&#9776;';
        dragHandle.title = 'Drag to move';
        dragHandle.setAttribute('aria-label', 'Drag handle - click and drag to move text box');

        function startDragFromHandle(clientX, clientY) {
            deselectOtherTextBox(textBox);
            state.isDragging = true;
            state.activeTextBox = textBox;
            state.selectedTextBox = textBox;
            container.classList.add('selected');
            const boxRect = container.getBoundingClientRect();
            state.dragOffset.x = clientX - boxRect.left;
            state.dragOffset.y = clientY - boxRect.top;
        }

        dragHandle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startDragFromHandle(e.clientX, e.clientY);
        });

        dragHandle.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            startDragFromHandle(touch.clientX, touch.clientY);
        });

        return dragHandle;
    }

    // Create delete button element
    function createDeleteButton(container, textBox) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete text box';

        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this text box?')) {
                if (state.selectedTextBox === textBox) {
                    state.selectedTextBox = null;
                }
                if (state.activeTextBox === textBox) {
                    state.activeTextBox = null;
                }
                container.remove();
            }
        });

        return deleteBtn;
    }

    // Create resize handles
    function createResizeHandles(container, textBox) {
        ['e', 'w'].forEach(function(dir) {
            const handle = document.createElement('div');
            handle.className = 'resize-handle ' + dir;
            handle.dataset.direction = dir;
            handle.title = 'Drag to resize';
            
            handle.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                startResize(e.clientX, e.clientY, dir, container, textBox);
            });
            
            handle.addEventListener('touchstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                startResize(touch.clientX, touch.clientY, dir, container, textBox);
            });
            
            container.appendChild(handle);
        });
    }

    // Setup text box event listeners
    function setupTextBoxEvents(container, textBox) {
        textBox.addEventListener('input', function() {
            adjustTextBoxHeight(this);
        });

        textBox.addEventListener('mousedown', function(e) {
            deselectOtherTextBox(this);
            
            if (document.activeElement !== this) {
                e.preventDefault();
                state.isDragging = true;
                state.activeTextBox = this;
                state.selectedTextBox = this;
                container.classList.add('selected');
                const boxRect = container.getBoundingClientRect();
                state.dragOffset.x = e.clientX - boxRect.left;
                state.dragOffset.y = e.clientY - boxRect.top;
            }
        });

        textBox.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!state.isDragging && !state.isResizing) {
                deselectOtherTextBox(this);
                state.selectedTextBox = this;
                container.classList.add('selected');
            }
        });

        textBox.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            container.classList.remove('selected');
            this.focus();
            state.selectedTextBox = this;
        });
    }

    // Deselect other text box if different from current
    function deselectOtherTextBox(currentTextBox) {
        if (state.selectedTextBox && state.selectedTextBox !== currentTextBox) {
            const oldContainer = state.selectedTextBox.closest('.text-box-container');
            if (oldContainer) {
                oldContainer.classList.remove('selected');
            }
            state.selectedTextBox.blur();
        }
    }

    // Start resize operation
    function startResize(clientX, clientY, direction, container, textBox) {
        state.isResizing = true;
        state.resizeDirection = direction;
        state.activeResizeContainer = container;
        state.activeTextBox = textBox;
        
        state.resizeStart.x = clientX;
        state.resizeStart.y = clientY;
        state.resizeStart.width = textBox.offsetWidth;
        state.resizeStart.height = textBox.offsetHeight;
        state.resizeStart.left = parseFloat(container.style.left) || 0;
        state.resizeStart.top = parseFloat(container.style.top) || 0;
        
        deselectOtherTextBox(textBox);
        state.selectedTextBox = textBox;
        container.classList.add('selected');
    }

    // Adjust text box height to fit content
    function adjustTextBoxHeight(textBox) {
        textBox.style.height = 'auto';
        textBox.style.height = textBox.scrollHeight + 'px';
    }

    // Handle drag movement
    document.addEventListener('mousemove', function(e) {
        if (state.isResizing && state.activeResizeContainer && state.activeTextBox) {
            handleResize(e.clientX, e.clientY);
        } else if (state.isDragging && state.activeTextBox) {
            handleDrag(e.clientX, e.clientY);
        }
    });

    // Handle touch move for mobile drag support
    document.addEventListener('touchmove', function(e) {
        if (state.isResizing && state.activeResizeContainer && state.activeTextBox) {
            const touch = e.touches[0];
            handleResize(touch.clientX, touch.clientY);
        } else if (state.isDragging && state.activeTextBox) {
            const touch = e.touches[0];
            handleDrag(touch.clientX, touch.clientY);
        }
    }, { passive: false });

    // Handle drag operation
    function handleDrag(clientX, clientY) {
        const container = state.activeTextBox.closest('.text-box-container');
        if (!container) {
            return;
        }
        
        const containerRect = canvasContainer.getBoundingClientRect();
        let newX = clientX - containerRect.left - state.dragOffset.x;
        let newY = clientY - containerRect.top - state.dragOffset.y;

        // Keep within bounds
        newX = Math.max(0, Math.min(newX, containerRect.width - container.offsetWidth));
        newY = Math.max(0, Math.min(newY, containerRect.height - container.offsetHeight));

        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
    }

    // Handle resize operation (width only - height auto-adjusts)
    function handleResize(clientX, clientY) {
        const deltaX = clientX - state.resizeStart.x;
        
        let newWidth = state.resizeStart.width;
        let newLeft = state.resizeStart.left;
        
        // Calculate new width based on resize direction (only e and w)
        if (state.resizeDirection === 'e') {
            newWidth = Math.max(MIN_TEXT_BOX_WIDTH, state.resizeStart.width + deltaX);
        } else if (state.resizeDirection === 'w') {
            newWidth = Math.max(MIN_TEXT_BOX_WIDTH, state.resizeStart.width - deltaX);
            if (newWidth !== MIN_TEXT_BOX_WIDTH) {
                newLeft = state.resizeStart.left + deltaX;
            }
        }
        
        // Apply new width
        state.activeTextBox.style.width = newWidth + 'px';
        state.activeResizeContainer.style.left = newLeft + 'px';
        
        // Auto-adjust height to fit content
        adjustTextBoxHeight(state.activeTextBox);
    }

    // Reset drag/resize state
    function resetDragResizeState() {
        if (state.isDragging) {
            state.isDragging = false;
            state.activeTextBox = null;
        }
        if (state.isResizing) {
            state.isResizing = false;
            state.resizeDirection = null;
            state.activeResizeContainer = null;
            state.activeTextBox = null;
        }
    }

    // Handle drag end
    document.addEventListener('mouseup', resetDragResizeState);
    document.addEventListener('touchend', resetDragResizeState);

    // Helper function to calculate the actual rendered image bounds
    function getRenderedImageBounds() {
        const background = document.getElementById('background');
        const containerRect = canvasContainer.getBoundingClientRect();
        const imageRect = background.getBoundingClientRect();
        
        // Calculate the image's position relative to the container
        const offsetX = imageRect.left - containerRect.left;
        const offsetY = imageRect.top - containerRect.top;
        
        return { 
            offsetX, 
            offsetY, 
            width: imageRect.width, 
            height: imageRect.height 
        };
    }

    // Print button - capture screenshot and open in new tab for printing
    printBtn.addEventListener('click', function() {
        printBtn.disabled = true;
        printBtn.textContent = 'Preparing...';

        // Deselect any selected text box to hide UI elements
        deselectTextBox();

        // Hide UI elements before capture
        const textBoxContainers = textLayer.querySelectorAll('.text-box-container');
        textBoxContainers.forEach(function(container) {
            container.classList.add('printing');
        });

        // Calculate dimensions
        const buttonBar = document.getElementById('button-bar');
        const buttonBarHeight = buttonBar ? buttonBar.offsetHeight : 0;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const containerRect = canvasContainer.getBoundingClientRect();
        const visibleContainerWidth = viewportWidth;
        const visibleContainerHeight = viewportHeight - buttonBarHeight;
        const imageBounds = getRenderedImageBounds();

        // Store text box positions relative to the rendered image
        const textBoxPositions = Array.from(textBoxContainers).map(function(container) {
            const boxRect = container.getBoundingClientRect();
            const leftInContainer = boxRect.left - containerRect.left;
            const topInContainer = boxRect.top - containerRect.top;
            const leftRelativeToImage = leftInContainer - imageBounds.offsetX;
            const topRelativeToImage = topInContainer - imageBounds.offsetY;
            
            return {
                leftPercent: leftRelativeToImage / imageBounds.width,
                topPercent: topRelativeToImage / imageBounds.height
            };
        });

        // Save original container style
        const originalContainerStyle = {
            width: canvasContainer.style.width,
            height: canvasContainer.style.height,
            flex: canvasContainer.style.flex,
            overflow: canvasContainer.style.overflow
        };
        
        // Set explicit dimensions for capture
        canvasContainer.style.width = visibleContainerWidth + 'px';
        canvasContainer.style.height = visibleContainerHeight + 'px';
        canvasContainer.style.flex = 'none';
        canvasContainer.style.overflow = 'hidden';

        function restoreContainerStyle() {
            canvasContainer.style.width = originalContainerStyle.width;
            canvasContainer.style.height = originalContainerStyle.height;
            canvasContainer.style.flex = originalContainerStyle.flex;
            canvasContainer.style.overflow = originalContainerStyle.overflow;
        }

        function restoreButtonState() {
            printBtn.disabled = false;
            printBtn.textContent = 'Print Page';
        }

        function removePrintingClass() {
            textBoxContainers.forEach(function(container) {
                container.classList.remove('printing');
            });
        }

        function cleanup() {
            removePrintingClass();
            restoreContainerStyle();
            restoreButtonState();
        }

        function triggerFallbackPrint() {
            cleanup();
            if (confirm('Screenshot capture failed. Would you like to print the page directly instead?')) {
                window.print();
            }
        }

        // Open new tab with screenshot and print dialog
        function openPrintTab(canvas) {
            let imageDataUrl;
            try {
                imageDataUrl = canvas.toDataURL('image/png');
            } catch (err) {
                throw new Error('Failed to convert screenshot to image');
            }

            // Create new tab with print page
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                throw new Error('Popup blocked. Please allow popups to print.');
            }

            // Write the print page HTML
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Preview</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            min-height: 100vh; 
                            background: white; 
                        }
                        img { 
                            max-width: 100%; 
                            max-height: 100vh; 
                            object-fit: contain; 
                        }
                        @media print {
                            @page { size: auto; margin: 0.5cm; }
                            body { min-height: auto; }
                            img { max-height: none; }
                        }
                    </style>
                </head>
                <body>
                    <img src="${imageDataUrl}" alt="Print Preview">
                    <script>
                        // Wait for image to load, then print and close
                        document.querySelector('img').onload = function() {
                            setTimeout(function() {
                                window.print();
                                // Close tab after print dialog closes
                                window.onafterprint = function() {
                                    window.close();
                                };
                                // Fallback: close after delay if afterprint doesn't fire
                                setTimeout(function() {
                                    window.close();
                                }, ${PRINT_TAB_CLOSE_DELAY_MS});
                            }, 100);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
            cleanup();
        }

        // Check if html2canvas is available
        if (typeof html2canvas !== 'function') {
            triggerFallbackPrint();
            return;
        }

        // Capture timeout
        const captureTimeout = setTimeout(function() {
            cleanup();
            triggerFallbackPrint();
        }, CAPTURE_TIMEOUT_MS);

        // Capture screenshot with html2canvas
        html2canvas(canvasContainer, {
            useCORS: true,
            allowTaint: false,
            foreignObjectRendering: false,
            backgroundColor: '#f0f0f0',
            scale: 2,
            logging: false,
            imageTimeout: 15000,
            removeContainer: true,
            width: visibleContainerWidth,
            height: visibleContainerHeight,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            onclone: function(clonedDoc) {
                const clonedBody = clonedDoc.body;
                clonedBody.style.display = 'block';
                clonedBody.style.height = visibleContainerHeight + 'px';
                clonedBody.style.overflow = 'hidden';
                clonedBody.style.margin = '0';
                clonedBody.style.padding = '0';
                
                const clonedButtonBar = clonedDoc.getElementById('button-bar');
                if (clonedButtonBar) {
                    clonedButtonBar.style.display = 'none';
                }
                
                const clonedContainer = clonedDoc.getElementById('canvas-container');
                if (clonedContainer) {
                    clonedContainer.style.visibility = 'visible';
                    clonedContainer.style.width = visibleContainerWidth + 'px';
                    clonedContainer.style.height = visibleContainerHeight + 'px';
                    clonedContainer.style.flex = 'none';
                    clonedContainer.style.overflow = 'hidden';
                    clonedContainer.style.position = 'relative';
                    clonedContainer.style.display = 'flex';
                    clonedContainer.style.alignItems = 'center';
                    clonedContainer.style.justifyContent = 'center';
                    
                    const clonedTextLayer = clonedContainer.querySelector('#text-layer');
                    if (clonedTextLayer) {
                        clonedTextLayer.style.width = visibleContainerWidth + 'px';
                        clonedTextLayer.style.height = visibleContainerHeight + 'px';
                        clonedTextLayer.style.position = 'absolute';
                        clonedTextLayer.style.top = '0';
                        clonedTextLayer.style.left = '0';
                    }
                    
                    // Calculate new image bounds for cloned container
                    const background = document.getElementById('background');
                    const imgAspect = background.naturalWidth / background.naturalHeight;
                    const cloneAspect = visibleContainerWidth / visibleContainerHeight;
                    
                    let newImageWidth, newImageHeight, newOffsetX, newOffsetY;
                    if (imgAspect > cloneAspect) {
                        newImageWidth = visibleContainerWidth;
                        newImageHeight = visibleContainerWidth / imgAspect;
                        newOffsetX = 0;
                        newOffsetY = (visibleContainerHeight - newImageHeight) / 2;
                    } else {
                        newImageHeight = visibleContainerHeight;
                        newImageWidth = visibleContainerHeight * imgAspect;
                        newOffsetX = (visibleContainerWidth - newImageWidth) / 2;
                        newOffsetY = 0;
                    }
                    
                    const clonedBackground = clonedContainer.querySelector('#background');
                    if (clonedBackground) {
                        // Set the image to its actual rendered size (maintaining aspect ratio)
                        clonedBackground.style.width = newImageWidth + 'px';
                        clonedBackground.style.height = newImageHeight + 'px';
                        clonedBackground.style.maxWidth = 'none';
                        clonedBackground.style.maxHeight = 'none';
                        clonedBackground.style.objectFit = 'contain';
                    }
                    
                    // Reposition text boxes relative to the new image position
                    const clonedTextBoxContainers = clonedContainer.querySelectorAll('.text-box-container');
                    clonedTextBoxContainers.forEach(function(clonedBox, index) {
                        if (textBoxPositions[index]) {
                            const scaledLeft = newOffsetX + textBoxPositions[index].leftPercent * newImageWidth;
                            const scaledTop = newOffsetY + textBoxPositions[index].topPercent * newImageHeight;
                            clonedBox.style.left = scaledLeft + 'px';
                            clonedBox.style.top = scaledTop + 'px';
                            clonedBox.style.position = 'absolute';
                        }
                    });
                }
            }
        }).then(function(canvas) {
            clearTimeout(captureTimeout);
            restoreContainerStyle();
            removePrintingClass();

            if (!canvas || canvas.width === 0 || canvas.height === 0) {
                triggerFallbackPrint();
                return;
            }

            try {
                openPrintTab(canvas);
            } catch (err) {
                alert(err.message);
                restoreButtonState();
            }
        }).catch(function(error) {
            clearTimeout(captureTimeout);
            cleanup();
            
            let errorMessage = 'Screenshot capture failed. ';
            if (error && error.message) {
                if (error.message.includes('cross-origin') || error.message.includes('CORS')) {
                    errorMessage += 'Cross-origin image restriction. ';
                }
            }
            
            if (confirm(errorMessage + 'Print page directly instead?')) {
                window.print();
            }
        });
    });

    // Reset button
    resetBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset and clear all text boxes?')) {
            textLayer.innerHTML = '';
        }
    });
});
