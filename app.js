        // Setup Lucide Icons safely
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Initialize PDF.js worker reference safely to avoid ReferenceErrors
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }

        document.addEventListener('keydown', (event) => {
            if (event.altKey && event.key === '1') switchTab('encode');
            if (event.altKey && event.key === '2') switchTab('decode');
        });

        // Application State
        let currentTab = 'encode';
        let generatedBlobUrl = null;
        let originalFileName = 'secret-noise.png';

        // Magic Header signature to verify a valid Noisify file ("N", "O", "I" in UTF-8)
        const MAGIC_HEADER = [78, 79, 73]; 

        // Handle text area character count
        const textInput = document.getElementById('text-input');
        const charCounter = document.getElementById('char-counter');
        const DRAFT_KEY = 'noisify-draft-v1';

        try {
            const savedDraft = localStorage.getItem(DRAFT_KEY);
            if (savedDraft) textInput.value = savedDraft;
        } catch (err) {
            console.warn('Draft storage is unavailable.', err);
        }
        
        textInput.addEventListener('input', () => {
            // Using Array.from to correctly measure actual Unicode characters (including high plane characters/emojis)
            const chars = Array.from(textInput.value);
            charCounter.textContent = `${chars.length.toLocaleString()} characters`;
            charCounter.setAttribute('aria-label', `${chars.length.toLocaleString()} characters`);
            try {
                if (textInput.value) localStorage.setItem(DRAFT_KEY, textInput.value);
                else localStorage.removeItem(DRAFT_KEY);
            } catch (err) {
                console.warn('Could not save draft locally.', err);
            }
        });
        textInput.dispatchEvent(new Event('input'));

        // Sample insert helper
        function insertSampleText() {
            textInput.value = `Hello! 🤫 This sample message demonstrates that Noisify can fit and encode every single Unicode character!

🌟 Emojis & Symbols: 🤫✨🎉🔥🚀 Runes: ᚛ ᚑᚔᚁ ᚜ Math: ∀ ∃ ∈ ∉ ∑ ∏
🌏 Multilingual test:
• Chinese: 漢字 (Hanzi)
• Japanese: ひらがな (Hiragana)
• Arabic: العربية (Al-ʿArabiyyah)
• Hindi: हिन्दी (Hindi)
• Greek: Ελληνικά (Elliniká)
• Cyrillic: Русский (Russkiy)

Because every single character is mapped directly to exactly one pixel in the generated PNG, there is absolutely no loss of text data. Enjoy this visual cryptography tool! 🚀`;
            // Trigger input count update
            textInput.dispatchEvent(new Event('input'));
            showToast('Sample text inserted successfully.', 'info');
        }

        // Clear text input
        function clearTextInput() {
            textInput.value = '';
            textInput.dispatchEvent(new Event('input'));
            document.getElementById('btn-copy-image').disabled = true;
            showToast('Text input cleared.', 'info');
        }

        // Tab switcher
        function switchTab(tab) {
            currentTab = tab;
            const tabEncode = document.getElementById('tab-encode');
            const tabDecode = document.getElementById('tab-decode');
            const viewEncode = document.getElementById('view-encode');
            const viewDecode = document.getElementById('view-decode');

            if (tab === 'encode') {
                tabEncode.className = "flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition duration-200 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/20";
                tabDecode.className = "flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition duration-200 text-slate-400 hover:text-slate-200 hover:bg-white/5";
                viewEncode.classList.remove('hidden');
                viewDecode.classList.add('hidden');
                viewEncode.hidden = false;
                viewDecode.hidden = true;
                tabEncode.setAttribute('aria-selected', 'true');
                tabDecode.setAttribute('aria-selected', 'false');
                tabEncode.focus();
            } else {
                tabDecode.className = "flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition duration-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/20";
                tabEncode.className = "flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition duration-200 text-slate-400 hover:text-slate-200 hover:bg-white/5";
                viewDecode.classList.remove('hidden');
                viewEncode.classList.add('hidden');
                viewDecode.hidden = false;
                viewEncode.hidden = true;
                tabDecode.setAttribute('aria-selected', 'true');
                tabEncode.setAttribute('aria-selected', 'false');
                tabDecode.focus();
            }
        }

        // Custom toast helper
        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            
            let bgClass = 'bg-slate-900 border-white/10 text-slate-100';
            let icon = 'info';
            
            if (type === 'success') {
                bgClass = 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100';
                icon = 'check-circle';
            } else if (type === 'error') {
                bgClass = 'bg-red-950/90 border-red-500/30 text-red-100';
                icon = 'alert-triangle';
            }

            toast.className = `p-4 rounded-xl border ${bgClass} shadow-2xl flex items-center gap-3 transform translate-y-2 opacity-0 transition duration-300 pointer-events-auto`;
            toast.innerHTML = `
                <i data-lucide="${icon}" class="w-5 h-5 flex-shrink-0"></i>
                <p class="text-xs font-semibold leading-normal">${message}</p>
            `;
            
            container.appendChild(toast);
            lucide.createIcons();

            // Animate In
            setTimeout(() => {
                toast.classList.remove('translate-y-2', 'opacity-0');
            }, 50);

            // Animate Out
            setTimeout(() => {
                toast.classList.add('translate-y-2', 'opacity-0');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 3500);
        }

        // Update zoom view
        function updateZoomValue(val) {
            document.getElementById('zoom-val').textContent = `${val}x`;
            const canvas = document.getElementById('noise-canvas');
            if (canvas) {
                canvas.style.transform = `scale(${val / 10})`;
            }
        }

        // Document loader triggers
        function triggerDocUpload() {
            document.getElementById('doc-loader').click();
        }

        const docImportZone = document.getElementById('doc-import-zone');
        
        ['dragenter', 'dragover'].forEach(eventName => {
            docImportZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                docImportZone.classList.add('border-purple-500', 'bg-purple-500/5');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            docImportZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                docImportZone.classList.remove('border-purple-500', 'bg-purple-500/5');
            }, false);
        });

        docImportZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                document.getElementById('doc-loader').files = files;
                handleDocUpload({ target: { files: files } });
            }
        });

        // Document ingestion pipeline
        async function handleDocUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const filename = file.name.toLowerCase();
            const promptEl = document.getElementById('doc-import-prompt');
            const loadingEl = document.getElementById('doc-import-loading');

            // Show loading state
            promptEl.classList.add('hidden');
            loadingEl.classList.remove('hidden');

            try {
                let extractedText = '';

                if (filename.endsWith('.txt')) {
                    extractedText = await readTxtFile(file);
                } else if (filename.endsWith('.pdf')) {
                    extractedText = await readPdfFile(file);
                } else if (filename.endsWith('.epub')) {
                    extractedText = await readEpubFile(file);
                } else {
                    throw new Error("Unsupported file format. Please upload a .txt, .pdf, or .epub file.");
                }

                if (!extractedText.trim()) {
                    throw new Error("The uploaded document appears to be empty or contains no extractable text.");
                }

                // Populate text input
                textInput.value = extractedText;
                textInput.dispatchEvent(new Event('input'));
                showToast(`Successfully extracted text from ${file.name}!`, "success");

            } catch (err) {
                console.error(err);
                showToast(err.message || "An error occurred while parsing the document.", "error");
            } finally {
                // Reset visual state
                promptEl.classList.remove('hidden');
                loadingEl.classList.add('hidden');
                document.getElementById('doc-loader').value = '';
            }
        }

        // Plain Text Reader
        function readTxtFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error("Failed to read the text file."));
                reader.readAsText(file);
            });
        }

        // PDF Text Reader using PDF.js
        function readPdfFile(file) {
            return new Promise((resolve, reject) => {
                if (typeof pdfjsLib === 'undefined') {
                    reject(new Error("The PDF library (PDF.js) failed to load. Please check your internet connection or try again."));
                    return;
                }
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        let extractedText = '';
                        
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            extractedText += pageText + '\n';
                        }
                        resolve(extractedText);
                    } catch (err) {
                        reject(new Error("Failed to parse PDF document. It might be scan-only or password protected."));
                    }
                };
                reader.onerror = () => reject(new Error("Failed to read PDF file."));
                reader.readAsArrayBuffer(file);
            });
        }

        // EPUB Reader using JSZip
        function readEpubFile(file) {
            return new Promise((resolve, reject) => {
                if (typeof JSZip === 'undefined') {
                    reject(new Error("The zip library (JSZip) failed to load. Please check your internet connection."));
                    return;
                }
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const zip = await JSZip.loadAsync(arrayBuffer);
                        
                        // 1. Resolve reading order (OPF mapping)
                        let opfPath = '';
                        const containerFile = zip.file("META-INF/container.xml");
                        if (containerFile) {
                            const containerXmlText = await containerFile.async("text");
                            const parser = new DOMParser();
                            const containerDoc = parser.parseFromString(containerXmlText, "text/xml");
                            const rootfile = containerDoc.querySelector("rootfile");
                            if (rootfile) {
                                opfPath = rootfile.getAttribute("full-path");
                            }
                        }
                        
                        // Fallback search for OPF inside the archive
                        if (!opfPath) {
                            const opfFiles = Object.keys(zip.files).filter(name => name.endsWith('.opf'));
                            if (opfFiles.length > 0) {
                                opfPath = opfFiles[0];
                            }
                        }
                        
                        if (!opfPath) {
                            throw new Error("Could not locate OPF metadata in EPUB package.");
                        }

                        // 2. Parse OPF document reading order
                        const opfFile = zip.file(opfPath);
                        const opfText = await opfFile.async("text");
                        const parser = new DOMParser();
                        const opfDoc = parser.parseFromString(opfText, "text/xml");
                        
                        // Build manifest database
                        const manifestItems = {};
                        const items = opfDoc.querySelectorAll("manifest > item");
                        items.forEach(item => {
                            manifestItems[item.getAttribute("id")] = item.getAttribute("href");
                        });
                        
                        // Retrieve OPF Directory to properly compute relative resource urls
                        const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
                        
                        // Loop through spine items sequentially to read files in proper reading order
                        const itemrefs = opfDoc.querySelectorAll("spine > itemref");
                        let fullText = '';
                        
                        for (let ref of itemrefs) {
                            const idref = ref.getAttribute("idref");
                            const relativeHref = manifestItems[idref];
                            if (relativeHref) {
                                const fullHref = resolveRelativePath(opfDir, relativeHref);
                                let htmlFile = zip.file(fullHref);
                                
                                // Robust fallback path finder (ignores leading slash or slight path differences)
                                if (!htmlFile) {
                                    const cleanHref = relativeHref.split('/').pop();
                                    const matchedKey = Object.keys(zip.files).find(key => key.endsWith(cleanHref));
                                    if (matchedKey) {
                                        htmlFile = zip.file(matchedKey);
                                    }
                                }

                                if (htmlFile) {
                                    const htmlText = await htmlFile.async("text");
                                    fullText += stripHtmlTags(htmlText) + '\n\n';
                                }
                            }
                        }
                        
                        // Fallback reading order (all html files sorted alphabetically) if OPF spine failed
                        if (!fullText.trim()) {
                            const htmlFiles = Object.keys(zip.files)
                                .filter(name => name.endsWith('.html') || name.endsWith('.xhtml') || name.endsWith('.htm'))
                                .sort();
                            for (let filename of htmlFiles) {
                                const htmlText = await zip.file(filename).async("text");
                                fullText += stripHtmlTags(htmlText) + '\n\n';
                            }
                        }
                        
                        resolve(fullText);

                    } catch (err) {
                        reject(new Error("Failed to process EPUB document framework: " + err.message));
                    }
                };
                reader.onerror = () => reject(new Error("Failed to read EPUB archive."));
                reader.readAsArrayBuffer(file);
            });
        }

        // EPUB Path helpers
        function resolveRelativePath(baseDir, relativePath) {
            if (!baseDir) return relativePath;
            const baseParts = baseDir.split('/').filter(Boolean);
            const relParts = relativePath.split('/');
            
            for (const part of relParts) {
                if (part === '.') continue;
                if (part === '..') {
                    baseParts.pop();
                } else {
                    baseParts.push(part);
                }
            }
            return baseParts.join('/');
        }

        // HTML parser utility to extract clean plain text from documents
        function stripHtmlTags(html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            return doc.body.textContent || doc.body.innerText || "";
        }

        // Unicode character-to-Pixel Generator Logic
        function generateNoiseImage() {
            const rawText = textInput.value;
            if (!rawText.trim()) {
                showToast("Please enter some text to encode before generating.", "error");
                return;
            }

            // Correctly parse high plane characters & emojis into single array elements
            const chars = Array.from(rawText);
            const totalDataChars = chars.length;

            // Space Requirements:
            // Pixel 0: Magic Header (R,G,B)
            // Pixel 1: Message Length (32-bit uint spread across R,G,B,A)
            // Pixel 2 to N: Data pixels (one pixel per Unicode character codepoint)
            const requiredPixels = 2 + totalDataChars;

            // Decide grid dimensions (Width & Height)
            let width = 0;
            let height = 0;

            const gridSelect = document.getElementById('noise-pad').value;
            if (gridSelect === 'auto') {
                // Find nearest square that fits all required pixels
                const side = Math.ceil(Math.sqrt(requiredPixels));
                width = side;
                height = side;
            } else {
                const side = parseInt(gridSelect, 10);
                if (requiredPixels > side * side) {
                    showToast(`The text contains too many characters (${totalDataChars.toLocaleString()}) for a ${side}x${side} grid. Please increase the resolution.`, "error");
                    return;
                }
                width = side;
                height = side;
            }

            const totalPixels = width * height;
            const padPixels = totalPixels - requiredPixels;

            // Initialize canvas and context
            const canvas = document.getElementById('noise-canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            canvas.width = width;
            canvas.height = height;

            // Update display style
            canvas.style.transform = `scale(${document.getElementById('zoom-slider').value / 10})`;
            document.getElementById('canvas-placeholder').classList.add('hidden');
            
            // Create target ImageData array
            const imgData = ctx.createImageData(width, height);
            const data = imgData.data;

            // Write Pixel 0: Magic Header
            data[0] = MAGIC_HEADER[0]; // R
            data[1] = MAGIC_HEADER[1]; // G
            data[2] = MAGIC_HEADER[2]; // B
            data[3] = 255;             // A (Keep header opaque)

            // Write Pixel 1: Payload Length (32-bit Integer representable up to 2^32 characters)
            data[4] = (totalDataChars >>> 24) & 255; // R
            data[5] = (totalDataChars >>> 16) & 255; // G
            data[6] = (totalDataChars >>> 8) & 255;  // B
            data[7] = totalDataChars & 255;         // A

            // Write Data Pixels (Starting from pixel index 2)
            for (let i = 0; i < totalDataChars; i++) {
                const cp = chars[i].codePointAt(0); // Safely get full 21-bit codepoint
                const pixelOffset = (2 + i) * 4;

                // Extract 3 bytes of Unicode codepoint (Max standard unicode is 0x10FFFF)
                const rByte = (cp >>> 16) & 255;
                const gByte = (cp >>> 8) & 255;
                const bByte = cp & 255;

                // Apply position-dependent scrambling offsets to distribute colors evenly
                // This makes plain ASCII text visually dynamic instead of flat dark cyan.
                let offset_R = (i * 37) % 256;
                let offset_G = (i * 59) % 256;
                let offset_B = (i * 113) % 256;

                data[pixelOffset]     = (rByte + offset_R) % 256; 
                data[pixelOffset + 1] = (gByte + offset_G) % 256; 
                data[pixelOffset + 2] = (bByte + offset_B) % 256; 

                // Alpha is kept at 255 for data pixels. This is crucial:
                // If opacity < 255, browser canvas engines perform lossy alpha premultiplication,
                // modifying RGB values on readback and corrupting delicate Unicode values.
                data[pixelOffset + 3] = 255; 
            }

            // Fill Remaining Pixels with random visual noise (and random opacity for background aesthetics)
            for (let i = requiredPixels; i < totalPixels; i++) {
                const pixelOffset = i * 4;
                data[pixelOffset] = Math.floor(Math.random() * 256);     // R
                data[pixelOffset + 1] = Math.floor(Math.random() * 256); // G
                data[pixelOffset + 2] = Math.floor(Math.random() * 256); // B
                data[pixelOffset + 3] = 180 + Math.floor(Math.random() * 76); // Random Alpha (A)
            }

            // Paint the pixels onto the canvas
            ctx.putImageData(imgData, 0, 0);

            // Update Stats Display
            document.getElementById('canvas-status').textContent = 'Image Ready';
            document.getElementById('canvas-status').className = 'text-[10px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20';
            
            document.getElementById('stat-res').textContent = `${width} x ${height}`;
            document.getElementById('stat-pixels').textContent = totalDataChars.toLocaleString();
            document.getElementById('stat-pad').textContent = padPixels.toLocaleString();
            
            // File size estimation based on canvas dimensions
            const estBytes = (width * height * 4);
            document.getElementById('stat-size').textContent = `~${(estBytes / 1024).toFixed(1)} KB`;
            document.getElementById('canvas-stats').classList.remove('hidden');

            // Enable download action
            const downloadBtn = document.getElementById('btn-download');
            downloadBtn.removeAttribute('disabled');
            downloadBtn.classList.remove('text-slate-400');
            downloadBtn.classList.add('text-slate-100');
            document.getElementById('btn-copy-image').disabled = false;

            showToast("Text successfully encoded into noise image.", "success");
        }

        // Trigger Download of the Canvas
        function downloadNoisePNG() {
            const canvas = document.getElementById('noise-canvas');
            if (!canvas || canvas.width === 0) return;

            // Generate PNG blob
            canvas.toBlob((blob) => {
                if (generatedBlobUrl) {
                    URL.revokeObjectURL(generatedBlobUrl);
                }
                generatedBlobUrl = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = generatedBlobUrl;
                link.download = `noisify-canvas-${canvas.width}x${canvas.height}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                showToast("PNG downloaded successfully.", "success");
            }, 'image/png');
        }

        async function copyNoisePNG() {
            const canvas = document.getElementById('noise-canvas');
            if (!canvas.width || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
                showToast('Image clipboard is not supported in this browser. Download the PNG instead.', 'error');
                return;
            }
            try {
                const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('PNG encoding failed.')), 'image/png'));
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                showToast('PNG copied to clipboard.', 'success');
            } catch (err) {
                showToast('Could not copy the PNG. Clipboard access may require HTTPS.', 'error');
            }
        }

        // Upload and Decode Elements
        function triggerImageUpload() {
            document.getElementById('image-loader').click();
        }

        // Drag and Drop implementation
        const dropZone = document.getElementById('drop-zone');
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.add('border-purple-500', 'bg-purple-500/5');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-purple-500', 'bg-purple-500/5');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                document.getElementById('image-loader').files = files;
                handleImageUpload({ target: { files: files } });
            }
        });

        // Parse File and Feed to Canvas
        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (file.type !== 'image/png') {
                showToast("Invalid file format. Please upload a lossless PNG image.", "error");
                resetUploadZone();
                return;
            }

            originalFileName = file.name;
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    // Display image info in Drop zone
                    document.getElementById('upload-prompt').classList.add('hidden');
                    const previewContainer = document.getElementById('upload-preview-container');
                    previewContainer.classList.remove('hidden');
                    previewContainer.classList.add('flex');
                    
                    document.getElementById('upload-preview').src = e.target.result;
                    document.getElementById('upload-filename').textContent = file.name;
                    document.getElementById('upload-dimensions').textContent = `${img.width} x ${img.height} pixels`;

                    // Run decoding
                    decodeNoiseFromImage(img);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        // Clean up upload interface
        function resetUploadZone() {
            document.getElementById('image-loader').value = '';
            document.getElementById('upload-prompt').classList.remove('hidden');
            document.getElementById('upload-preview-container').classList.add('hidden');
            document.getElementById('upload-preview-container').classList.remove('flex');
            document.getElementById('decoded-output').value = '';
            
            // Disable buttons
            const copyBtn = document.getElementById('btn-copy');
            copyBtn.setAttribute('disabled', 'true');
            copyBtn.className = "sm:col-span-1 py-3 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-100 font-bold text-xs tracking-wide transition border border-white/10 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed";

            ['btn-export-txt', 'btn-export-pdf', 'btn-export-epub'].forEach(id => {
                const btn = document.getElementById(id);
                btn.setAttribute('disabled', 'true');
                btn.className = "py-3 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-100 font-bold text-xs tracking-wide transition border border-white/10 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed";
            });
            
            const decStatus = document.getElementById('decode-status');
            decStatus.textContent = 'Waiting...';
            decStatus.className = 'text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-white/5 text-slate-400 border border-white/5';
        }

        // Decoder Engine
        function decodeNoiseFromImage(img) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            try {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;

                // Validate Magic Header on Pixel 0 (R, G, B channels)
                if (data[0] !== MAGIC_HEADER[0] || data[1] !== MAGIC_HEADER[1] || data[2] !== MAGIC_HEADER[2]) {
                    showToast("Decryption failed. This is not a valid Noisify image file.", "error");
                    const decStatus = document.getElementById('decode-status');
                    decStatus.textContent = 'Invalid Image';
                    decStatus.className = 'text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20';
                    return;
                }

                // Read Length on Pixel 1 (32-bit uint)
                const length = (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7];

                if (length <= 0 || length > (canvas.width * canvas.height - 2)) {
                    showToast("Metadata corruption detected. Length mismatch.", "error");
                    return;
                }

                // Gather codepoints starting from Pixel 2
                const decodedChars = [];
                for (let i = 0; i < length; i++) {
                    const pixelOffset = (2 + i) * 4;

                    // Read channels
                    const r_disp = data[pixelOffset];
                    const g_disp = data[pixelOffset + 1];
                    const b_disp = data[pixelOffset + 2];

                    // Recalculate dynamic visual offsets
                    let offset_R = (i * 37) % 256;
                    let offset_G = (i * 59) % 256;
                    let offset_B = (i * 113) % 256;

                    // Reverse math offsets safely
                    const rByte = (r_disp - offset_R + 256) % 256;
                    const gByte = (g_disp - offset_G + 256) % 256;
                    const bByte = (b_disp - offset_B + 256) % 256;

                    // Reconstruct 21-bit Unicode codepoint
                    const cp = (rByte << 16) | (gByte << 8) | bByte;

                    // Map codepoint back to high/low plane characters
                    decodedChars.push(String.fromCodePoint(cp));
                }

                const decodedText = decodedChars.join('');

                // Update UI Elements with output
                const outputField = document.getElementById('decoded-output');
                outputField.value = decodedText;

                // Enable copy button
                const copyBtn = document.getElementById('btn-copy');
                copyBtn.removeAttribute('disabled');
                copyBtn.classList.remove('text-slate-400');
                copyBtn.classList.add('text-slate-100', 'bg-gradient-to-r', 'from-emerald-500', 'to-teal-600', 'hover:from-emerald-600', 'hover:to-teal-700', 'border-none');

                // Enable export action buttons
                ['btn-export-txt', 'btn-export-pdf', 'btn-export-epub'].forEach(id => {
                    const btn = document.getElementById(id);
                    btn.removeAttribute('disabled');
                    btn.classList.remove('text-slate-400');
                    btn.classList.add('text-slate-200', 'bg-white/10', 'hover:bg-white/20', 'border-white/20');
                });

                const decStatus = document.getElementById('decode-status');
                decStatus.textContent = 'Decoded Successfully';
                decStatus.className = 'text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

                showToast("Text successfully decoded from image.", "success");
            } catch (err) {
                console.error(err);
                showToast("An error occurred while decoding the image.", "error");
            }
        }

        // Copy decoded payload to clipboard
        function copyDecodedText() {
            const outputText = document.getElementById('decoded-output');
            if (!outputText.value) return;

            outputText.select();
            outputText.setSelectionRange(0, 99999); // For mobile compatibility

            try {
                document.execCommand('copy');
                showToast('Text copied to clipboard!', 'success');
            } catch (err) {
                showToast('Failed to copy to clipboard. Please select and copy manually.', 'error');
            }
        }

        // Universal Document Export Dispatcher
        async function exportDecoded(format) {
            const text = document.getElementById('decoded-output').value;
            if (!text.trim()) {
                showToast("There is no decoded text to export.", "error");
                return;
            }

            if (format === 'txt') {
                exportAsTxt(text);
            } else if (format === 'pdf') {
                exportAsPdf(text);
            } else if (format === 'epub') {
                await exportAsEpub(text);
            }
        }

        // TXT Export Pipeline
        function exportAsTxt(text) {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `decoded-noisify-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Successfully exported as .txt file!", "success");
        }

        // PDF Export Pipeline
        function exportAsPdf(text) {
            try {
                // Highly compatible jsPDF constructor lookup
                let jsPDFClass = null;
                if (window.jspdf && window.jspdf.jsPDF) {
                    jsPDFClass = window.jspdf.jsPDF;
                } else if (window.jsPDF) {
                    jsPDFClass = window.jsPDF;
                }

                if (!jsPDFClass) {
                    showToast("PDF generation library failed to load. Please try again or check your connection.", "error");
                    return;
                }

                const doc = new jsPDFClass();
                
                // Format lines to fit Standard A4 width boundary nicely
                const splitText = doc.splitTextToSize(text, 180);
                let y = 20;
                const pageHeight = doc.internal.pageSize.height;

                for (let i = 0; i < splitText.length; i++) {
                    if (y > pageHeight - 20) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.text(splitText[i], 15, y);
                    y += 7; // Line spacing increments
                }

                doc.save(`decoded-noisify-${Date.now()}.pdf`);
                showToast("Successfully exported as .pdf document!", "success");
            } catch (err) {
                console.error(err);
                showToast("Failed to compile PDF document.", "error");
            }
        }

        // EPUB Export Pipeline via client-side XML tree assembly in JSZip
        async function exportAsEpub(text) {
            if (typeof JSZip === 'undefined') {
                showToast("EPUB compiler library is not loaded. Please try again.", "error");
                return;
            }

            try {
                const zip = new JSZip();
                
                // 1. mimetype (MUST be store-only / uncompressed according to epub specifications)
                zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
                
                // 2. META-INF/container.xml pointing towards OPF layout schema
                const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
                zip.file("META-INF/container.xml", containerXml);
                
                // Format the text inside strict XHTML tags, resolving characters safely for DOM XML streams
                const escapedText = text
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&apos;")
                    .replace(/\n/g, "<br/>");

                // 3. OEBPS/text.xhtml - XHTML Strict template for E-Reader parsing
                const textXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Decoded Message</title>
  <style type="text/css">
    body { font-family: sans-serif; padding: 5%; line-height: 1.6; color: #222222; }
    h1 { text-align: center; font-size: 1.5em; margin-bottom: 1.5em; color: #111111; }
    div.content { margin: 0 auto; max-width: 600px; font-size: 1em; }
  </style>
</head>
<body>
  <h1>Decoded Noisify Message</h1>
  <div class="content">
    ${escapedText}
  </div>
</body>
</html>`;
                zip.file("OEBPS/text.xhtml", textXhtml);
                
                // 4. OEBPS/toc.ncx (eBook structure index)
                const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:decoded-message-unique-id"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>Decoded Noisify Message</text>
  </docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel>
        <text>Decoded Content</text>
      </navLabel>
      <content src="text.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
                zip.file("OEBPS/toc.ncx", tocNcx);
                
                // 5. OEBPS/content.opf (Manifest index and reading order)
                const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>Decoded Noisify Message</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="BookID" opf:scheme="UUID">urn:uuid:decoded-message-unique-id</dc:identifier>
    <dc:creator>Noisify Encoder</dc:creator>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="content" href="text.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`;
                zip.file("OEBPS/content.opf", contentOpf);
                
                // Generate container and trigger file download cleanly using standard Blob wrappers
                const content = await zip.generateAsync({ type: "blob" });
                const epubBlob = new Blob([content], { type: "application/epub+zip" });
                const url = URL.createObjectURL(epubBlob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `decoded-noisify-${Date.now()}.epub`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast("Successfully compiled and exported .epub eBook!", "success");
            } catch (err) {
                console.error("EPUB creation failed", err);
                showToast("An error occurred compiling the eBook file.", "error");
            }
        }
