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

    // Print button - capture screenshot using html2canvas and print it
    printBtn.addEventListener('click', function() {
        // Disable button during print process to prevent multiple clicks
        printBtn.disabled = true;
        printBtn.textContent = 'Preparing...';

        // Deselect any selected text box to hide UI elements
        if (selectedTextBox) {
            const container = selectedTextBox.closest('.text-box-container');
            if (container) {
                container.classList.remove('selected');
            }
            selectedTextBox.blur();
            selectedTextBox = null;
        }

        // Hide UI elements before capture
        const textBoxContainers = textLayer.querySelectorAll('.text-box-container');
        textBoxContainers.forEach(function(container) {
            container.classList.add('printing');
        });

        // Get the button bar height to calculate the actual visible container height
        var buttonBar = document.getElementById('button-bar');
        var buttonBarHeight = buttonBar ? buttonBar.offsetHeight : 0;
        
        // Calculate the actual visible container dimensions
        // The container height should be viewport height minus button bar
        var viewportHeight = window.innerHeight;
        var viewportWidth = window.innerWidth;
        
        // Get the container rect for position calculations
        var containerRect = canvasContainer.getBoundingClientRect();
        
        // Use viewport-based dimensions for the visible area
        var visibleContainerWidth = viewportWidth;
        var visibleContainerHeight = viewportHeight - buttonBarHeight;
        
        console.log('Viewport:', viewportWidth, 'x', viewportHeight);
        console.log('Button bar height:', buttonBarHeight);
        console.log('Visible container:', visibleContainerWidth, 'x', visibleContainerHeight);
        console.log('Container rect:', containerRect.width, 'x', containerRect.height);
        
        // Get the rendered image bounds (accounting for object-fit: contain)
        var imageBounds = getRenderedImageBounds();
        
        // Get the actual container height (which may be larger than viewport due to image)
        var actualContainerHeight = containerRect.height;
        
        // Store text box positions relative to the container
        // We'll scale these positions when applying to the clone
        var textBoxPositions = [];
        textBoxContainers.forEach(function(container, index) {
            var boxRect = container.getBoundingClientRect();
            // Calculate position relative to container
            var leftInContainer = boxRect.left - containerRect.left;
            var topInContainer = boxRect.top - containerRect.top;
            
            // Convert to percentage of ACTUAL container dimensions
            // This allows us to scale correctly when the container size changes
            var leftPercent = leftInContainer / visibleContainerWidth;
            var topPercent = topInContainer / actualContainerHeight;
            
            textBoxPositions.push({
                index: index,
                leftPercent: leftPercent,
                topPercent: topPercent,
                originalLeft: leftInContainer,
                originalTop: topInContainer,
                actualContainerHeight: actualContainerHeight
            });
            
            console.log('Text box', index, 'position:', leftInContainer, topInContainer, 'percent:', leftPercent, topPercent);
        });

        // CRITICAL: Fix the container dimensions BEFORE html2canvas captures
        // This ensures the clone has the same dimensions as the original
        var originalContainerStyle = {
            width: canvasContainer.style.width,
            height: canvasContainer.style.height,
            flex: canvasContainer.style.flex,
            position: canvasContainer.style.position,
            overflow: canvasContainer.style.overflow
        };
        
        // Set explicit dimensions on the container to match the visible viewport
        canvasContainer.style.width = visibleContainerWidth + 'px';
        canvasContainer.style.height = visibleContainerHeight + 'px';
        canvasContainer.style.flex = 'none';
        canvasContainer.style.overflow = 'hidden';

        // Helper function to restore container style
        function restoreContainerStyle() {
            canvasContainer.style.width = originalContainerStyle.width;
            canvasContainer.style.height = originalContainerStyle.height;
            canvasContainer.style.flex = originalContainerStyle.flex;
            canvasContainer.style.position = originalContainerStyle.position;
            canvasContainer.style.overflow = originalContainerStyle.overflow;
        }

        // Helper function to restore button state
        function restoreButtonState() {
            printBtn.disabled = false;
            printBtn.textContent = 'Print Page';
        }

        // Helper function to remove printing class from all containers
        function removePrintingClass() {
            textBoxContainers.forEach(function(container) {
                container.classList.remove('printing');
            });
        }

        // Helper function to trigger print with fallback (prints current page without screenshot)
        function triggerFallbackPrint() {
            removePrintingClass();
            restoreContainerStyle();
            restoreButtonState();
            
            // Inform user about fallback
            var userConfirmed = confirm('Screenshot capture failed. Would you like to print the page directly instead? Note: Some elements may not appear as expected.');
            if (userConfirmed) {
                window.print();
            }
        }

        // Helper function to create and display print container with screenshot
        function displayPrintContainer(canvas) {
            var printContainer = document.createElement('div');
            printContainer.id = 'print-screenshot-container';
            
            var img = document.createElement('img');
            
            try {
                img.src = canvas.toDataURL('image/png');
            } catch (dataUrlError) {
                console.error('Error converting canvas to data URL:', dataUrlError);
                throw new Error('Failed to convert screenshot to image format');
            }
            
            // Add load event to ensure image is ready before printing
            img.onload = function() {
                // Hide original content during print
                canvasContainer.style.visibility = 'hidden';

                // Cleanup function after print
                function cleanup() {
                    if (printContainer && printContainer.parentNode) {
                        printContainer.remove();
                    }
                    canvasContainer.style.visibility = 'visible';
                    restoreButtonState();
                    window.removeEventListener('afterprint', cleanup);
                }

                window.addEventListener('afterprint', cleanup);

                // Fallback cleanup timeout for browsers that don't support afterprint
                // or if the print dialog is cancelled without triggering afterprint
                setTimeout(function() {
                    if (printContainer && printContainer.parentNode) {
                        cleanup();
                    }
                }, 60000); // 60 second timeout

                // Trigger print dialog
                try {
                    window.print();
                } catch (printError) {
                    console.error('Error triggering print dialog:', printError);
                    cleanup();
                    alert('Unable to open print dialog. Please try using your browser\'s print function (Ctrl+P or Cmd+P).');
                }
            };

            img.onerror = function() {
                console.error('Error loading screenshot image');
                restoreButtonState();
                triggerFallbackPrint();
            };
            
            printContainer.appendChild(img);
            document.body.appendChild(printContainer);
        }

        // Check if html2canvas is available
        if (typeof html2canvas !== 'function') {
            console.error('html2canvas library not loaded');
            triggerFallbackPrint();
            return;
        }

        // Set a timeout for the screenshot capture
        var captureTimeout = setTimeout(function() {
            console.error('Screenshot capture timed out');
            removePrintingClass();
            triggerFallbackPrint();
        }, 30000); // 30 second timeout

        // Use html2canvas to capture the canvas-container with comprehensive CORS settings
        html2canvas(canvasContainer, {
            useCORS: true,              // Attempt to load images using CORS
            allowTaint: false,          // Disable tainted canvas for security (prevents cross-origin data exposure)
            foreignObjectRendering: false, // Disable foreignObject for better compatibility
            backgroundColor: '#f0f0f0', // Match the container background
            scale: 2,                   // Higher quality for print
            logging: true,              // Enable logging for debugging
            imageTimeout: 15000,        // Timeout for loading images (15 seconds)
            removeContainer: true,      // Remove cloned container after rendering
            // Explicitly set the capture dimensions to match the visible container
            width: visibleContainerWidth,
            height: visibleContainerHeight,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            onclone: function(clonedDoc) {
                console.log('onclone called, visibleContainerWidth:', visibleContainerWidth, 'visibleContainerHeight:', visibleContainerHeight);
                
                // CRITICAL: Fix the entire document layout to prevent flex recalculations
                var clonedBody = clonedDoc.body;
                
                // Reset body layout to prevent flex affecting container height
                clonedBody.style.display = 'block';
                clonedBody.style.height = visibleContainerHeight + 'px';
                clonedBody.style.minHeight = visibleContainerHeight + 'px';
                clonedBody.style.maxHeight = visibleContainerHeight + 'px';
                clonedBody.style.overflow = 'hidden';
                clonedBody.style.margin = '0';
                clonedBody.style.padding = '0';
                
                // Hide the button bar in the clone
                var clonedButtonBar = clonedDoc.getElementById('button-bar');
                if (clonedButtonBar) {
                    clonedButtonBar.style.display = 'none';
                }
                
                var clonedContainer = clonedDoc.getElementById('canvas-container');
                if (clonedContainer) {
                    clonedContainer.style.visibility = 'visible';
                    
                    // CRITICAL: Set exact pixel dimensions and remove flex behavior
                    clonedContainer.style.width = visibleContainerWidth + 'px';
                    clonedContainer.style.height = visibleContainerHeight + 'px';
                    clonedContainer.style.minHeight = visibleContainerHeight + 'px';
                    clonedContainer.style.maxHeight = visibleContainerHeight + 'px';
                    clonedContainer.style.flex = 'none';
                    clonedContainer.style.flexGrow = '0';
                    clonedContainer.style.flexShrink = '0';
                    clonedContainer.style.overflow = 'hidden';
                    clonedContainer.style.position = 'relative';
                    clonedContainer.style.top = '0';
                    clonedContainer.style.left = '0';
                    
                    console.log('Cloned container dimensions set to:', visibleContainerWidth, 'x', visibleContainerHeight);
                    
                    // Fix the text layer dimensions to match exactly
                    var clonedTextLayer = clonedContainer.querySelector('#text-layer');
                    if (clonedTextLayer) {
                        clonedTextLayer.style.width = visibleContainerWidth + 'px';
                        clonedTextLayer.style.height = visibleContainerHeight + 'px';
                        clonedTextLayer.style.position = 'absolute';
                        clonedTextLayer.style.top = '0';
                        clonedTextLayer.style.left = '0';
                    }
                    
                    // Fix the background image to have exact dimensions
                    var clonedBackground = clonedContainer.querySelector('#background');
                    if (clonedBackground) {
                        clonedBackground.style.width = visibleContainerWidth + 'px';
                        clonedBackground.style.height = visibleContainerHeight + 'px';
                        clonedBackground.style.objectFit = 'contain';
                        clonedBackground.style.position = 'relative';
                        clonedBackground.style.top = '0';
                        clonedBackground.style.left = '0';
                    }
                    
                    // Fix text box positions in the cloned document
                    // Use percentage-based positioning to scale correctly
                    var clonedTextBoxContainers = clonedContainer.querySelectorAll('.text-box-container');
                    clonedTextBoxContainers.forEach(function(clonedBox, index) {
                        if (textBoxPositions[index]) {
                            // Scale the positions based on the new container dimensions
                            var scaledLeft = textBoxPositions[index].leftPercent * visibleContainerWidth;
                            var scaledTop = textBoxPositions[index].topPercent * visibleContainerHeight;
                            
                            console.log('Setting text box', index, 'to scaled position:', scaledLeft, scaledTop);
                            
                            clonedBox.style.left = scaledLeft + 'px';
                            clonedBox.style.top = scaledTop + 'px';
                            clonedBox.style.position = 'absolute';
                        }
                    });
                }
            }
        }).then(function(canvas) {
            clearTimeout(captureTimeout);
            
            // Restore container style after capture
            restoreContainerStyle();
            
            // Remove printing class
            removePrintingClass();

            // Validate canvas
            if (!canvas || canvas.width === 0 || canvas.height === 0) {
                console.error('Invalid canvas generated');
                triggerFallbackPrint();
                return;
            }

            try {
                displayPrintContainer(canvas);
            } catch (displayError) {
                console.error('Error displaying print container:', displayError);
                triggerFallbackPrint();
            }
        }).catch(function(error) {
            clearTimeout(captureTimeout);
            console.error('Error capturing screenshot:', error);
            
            // Restore container style on error
            restoreContainerStyle();
            
            // Remove printing class on error
            removePrintingClass();
            
            // Provide specific error messages based on error type
            var errorMessage = 'Screenshot capture failed. ';
            
            if (error && error.message) {
                if (error.message.includes('cross-origin') || error.message.includes('CORS') || error.message.includes('tainted')) {
                    errorMessage += 'This may be due to cross-origin image restrictions. ';
                } else if (error.message.includes('timeout')) {
                    errorMessage += 'The operation timed out. ';
                } else if (error.message.includes('security')) {
                    errorMessage += 'A security restriction prevented the operation. ';
                }
            }
            
            errorMessage += 'Would you like to print the page directly instead?';
            
            var userConfirmed = confirm(errorMessage);
            if (userConfirmed) {
                window.print();
            }
            
            restoreButtonState();
        });
    });

    // Reset button
    resetBtn.addEventListener('click', function() {
        textLayer.innerHTML = '';
    });
});
