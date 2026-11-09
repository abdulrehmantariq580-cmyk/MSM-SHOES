// ================= MS SHOES GLOBAL E-COMMERCE CORE (store.js) =================
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRIq2mhbJ-a307EMNVCEAeU7LlYqDaCA7eYhvRNhhryZfw6KXFySbcZZ-3glOFf_f48y2grKm7SLM5c/pub?output=csv';
const WHATSAPP_PHONE = '923136127088'; // Official MS Shoes WhatsApp
const SHIPPING_FEE = 250; // Standard Courier Shipping Across Pakistan
const FREE_SHIPPING_THRESHOLD = 5000; // Free shipping over Rs. 5000

// ---------------- LOCAL STORAGE CART ENGINE ----------------
function getCart() {
    try {
        const stored = localStorage.getItem('msm_cart');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem('msm_cart', JSON.stringify(cart));
    } catch (e) {}
    updateCartUI();
}

function addToCart(product, size = '42') {
    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.title === product.title && item.size === size);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        const cleanPrice = parseInt(String(product.salePrice || product.origPrice || '5999').replace(/[^0-9]/g, '')) || 5999;
        cart.push({
            id: 'prod_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            title: product.title,
            desc: product.desc || '',
            image: product.image || 'media/product_1.webp',
            price: cleanPrice,
            size: size,
            quantity: 1
        });
    }

    saveCart(cart);
    openCart();
}

function removeFromCart(index) {
    const cart = getCart();
    if (index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        saveCart(cart);
    }
}

function updateCartQty(index, delta) {
    const cart = getCart();
    if (cart[index]) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart(cart);
    }
}

function getCartCount() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

function getCartSubtotal() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
}

function updateCartUI() {
    const countBadges = document.querySelectorAll('.cart-count');
    const totalCount = getCartCount();
    countBadges.forEach(b => b.textContent = totalCount);

    const cartBody = document.getElementById('cartBody');
    const cartFooter = document.getElementById('cartFooter');
    const cartSubtotal = document.getElementById('cartSubtotal');
    if (!cartBody) return;

    const cart = getCart();
    if (cart.length === 0) {
        cartBody.innerHTML = '<p style="margin:auto; color:#999; font-size:14px;"><i class="fa-solid fa-bag-shopping" style="font-size:32px; display:block; margin-bottom:10px; color:#ccc;"></i>Your cart is currently empty.</p>';
        if (cartFooter) cartFooter.style.display = 'none';
        return;
    }

    let itemsHtml = '<div class="cart-items-list">';
    cart.forEach((item, idx) => {
        itemsHtml += `
        <div class="cart-item-card">
            <img src="${item.image}" alt="${item.title}" class="cart-item-img" onerror="this.src='media/product_1.webp'">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-meta">Size: <strong>${item.size}</strong> | Qty: <strong>${item.quantity}</strong></div>
                <div class="cart-item-price">Rs. ${(item.price * item.quantity).toLocaleString()}</div>
            </div>
            <div class="cart-remove-btn" onclick="removeFromCart(${idx})" title="Remove">
                <i class="fa-solid fa-trash-can"></i>
            </div>
        </div>`;
    });
    itemsHtml += '</div>';

    cartBody.innerHTML = itemsHtml;
    if (cartFooter) {
        cartFooter.style.display = 'block';
        if (cartSubtotal) cartSubtotal.textContent = 'Rs. ' + getCartSubtotal().toLocaleString();
    }
}

function openCart() {
    const cartDrawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (cartDrawer && overlay) {
        cartDrawer.classList.add('active');
        overlay.classList.add('active');
    }
}

// ---------------- CSV PARSER & IMAGE NORMALIZER ----------------
function parseCSV(text) {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(current.trim());
            current = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            row.push(current.trim());
            if (row.some(val => val !== '')) rows.push(row);
            row = [];
            current = '';
        } else {
            current += char;
        }
    }
    if (current || row.length > 0) {
        row.push(current.trim());
        if (row.some(val => val !== '')) rows.push(row);
    }
    return rows;
}

function normalizeImageUrl(url) {
    if (!url || url.trim() === '') return 'media/product_1.webp';
    url = url.trim();

    if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
        const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                        url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || 
                        url.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            return 'https://drive.google.com/thumbnail?id=' + idMatch[1] + '&sz=w1000';
        }
    }

    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('media/') && !url.startsWith('./') && !url.startsWith('/')) {
        if (url.includes('.')) {
            return 'media/' + url;
        }
    }
    return url;
}

// ---------------- GLOBAL SHEET FETCHER ----------------
let allGlobalProducts = [];

async function loadProductsFromSheet() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error('Sheet network error');

        const csvText = await response.text();
        const data = parseCSV(csvText);
        if (data.length <= 1) return [];

        const headers = data[0].map(h => h.toLowerCase().trim());

        // Exact Column Matchers (Avoiding substring conflicts like 'size' in 'less then 1 mb size')
        let titleIdx = headers.findIndex(h => h.includes('title') || h.includes('name'));
        let descIdx = headers.findIndex(h => h.includes('description') || h.includes('subtitle'));
        let origPriceIdx = headers.findIndex(h => h.includes('original price'));
        let salePriceIdx = headers.findIndex(h => h.includes('sale price'));
        let imgIdx = headers.findIndex(h => h.includes('image') || h.includes('photo'));
        let sizesIdx = headers.findIndex(h => h.includes('shoes size') || h.includes('size available'));
        let qtyIdx = headers.findIndex(h => h.includes('stock') || h.includes('quantity'));
        let badgeIdx = headers.findIndex(h => h.includes('badge') || h.includes('tag'));

        // Fallbacks if not matched by full name
        if (titleIdx === -1) titleIdx = 1;
        if (descIdx === -1) descIdx = 2;
        if (origPriceIdx === -1) origPriceIdx = 3;
        if (salePriceIdx === -1) salePriceIdx = 4;
        if (imgIdx === -1) imgIdx = 5;
        if (sizesIdx === -1) sizesIdx = 6;
        if (qtyIdx === -1) qtyIdx = 7;
        if (badgeIdx === -1) badgeIdx = 8;

        const products = [];
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const title = titleIdx !== -1 ? (row[titleIdx] || '') : '';
            if (!title) continue;

            const desc = descIdx !== -1 ? (row[descIdx] || '') : '';
            const origPrice = origPriceIdx !== -1 ? (row[origPriceIdx] || '') : '';
            const salePrice = salePriceIdx !== -1 ? (row[salePriceIdx] || '') : '';
            const rawImg = imgIdx !== -1 ? (row[imgIdx] || '') : '';
            const image = normalizeImageUrl(rawImg);
            const sizes = sizesIdx !== -1 ? (row[sizesIdx] || '') : '';
            const badge = badgeIdx !== -1 ? (row[badgeIdx] || '') : '';

            products.push({ id: i, title, desc, origPrice, salePrice, image, sizes, badge });
        }
        allGlobalProducts = products;
        return products;
    } catch (err) {
        console.warn('Error fetching products from sheet:', err);
        return [];
    }
}

// ---------------- MODAL QUICK VIEW LOGIC ----------------
let currentModalProduct = null;
let selectedModalSize = '42';

function openProductModal(productIndex) {
    const product = allGlobalProducts[productIndex];
    if (!product) return;
    currentModalProduct = product;

    const overlay = document.getElementById('productModalOverlay');
    const badgeEl = document.getElementById('modalBadge');
    const imgEl = document.getElementById('modalImage');
    const subtitleEl = document.getElementById('modalSubtitle');
    const titleEl = document.getElementById('modalTitle');
    const salePriceEl = document.getElementById('modalSalePrice');
    const origPriceEl = document.getElementById('modalOrigPrice');
    const descEl = document.getElementById('modalDesc');
    const sizesContainer = document.getElementById('modalSizes');

    if (!overlay) return;

    if (badgeEl) {
        if (product.badge && product.badge.toLowerCase() !== 'none' && product.badge.trim() !== '') {
            badgeEl.textContent = product.badge;
            badgeEl.style.display = 'block';
        } else {
            badgeEl.style.display = 'none';
        }
    }

    if (imgEl) imgEl.src = product.image;
    if (subtitleEl) subtitleEl.textContent = product.desc || 'Premium Footwear';
    if (titleEl) titleEl.textContent = product.title;

    const displayPrice = product.salePrice || product.origPrice || '5999';
    const cleanNum = parseInt(String(displayPrice).replace(/[^0-9]/g, '')) || 5999;
    if (salePriceEl) salePriceEl.textContent = 'Rs. ' + cleanNum.toLocaleString();

    if (origPriceEl) {
        if (product.origPrice && product.salePrice && product.origPrice !== product.salePrice) {
            const oldNum = parseInt(String(product.origPrice).replace(/[^0-9]/g, '')) || 0;
            origPriceEl.textContent = 'Rs. ' + oldNum.toLocaleString();
            origPriceEl.style.display = 'inline';
        } else {
            origPriceEl.style.display = 'none';
        }
    }

    if (descEl) {
        descEl.textContent = product.desc ? `The ${product.title} in ${product.desc} edition is handcrafted with master-grade materials, precision stitching, and all-day cushioned sole comfort.` : `Experience unmatched elegance and streetwear authority with the ${product.title}. Premium finish and durable sole.`;
    }

    let sizeList = ['40', '41', '42', '43', '44'];
    if (product.sizes && product.sizes.trim() !== '') {
        sizeList = product.sizes.split(/[,/ -]+/).map(s => s.trim()).filter(Boolean);
    }
    selectedModalSize = sizeList[0] || '42';

    if (sizesContainer) {
        let sizeHtml = '';
        sizeList.forEach((sz, idx) => {
            const activeClass = idx === 0 ? 'active' : '';
            sizeHtml += `<button type="button" class="size-pill ${activeClass}" onclick="selectModalSize('${sz}', this)">${sz}</button>`;
        });
        sizesContainer.innerHTML = sizeHtml;
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function selectModalSize(size, btn) {
    selectedModalSize = size;
    const parent = btn.parentElement;
    if (parent) {
        parent.querySelectorAll('.size-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
    }
}

function closeProductModal(event) {
    if (event && event.target && event.target.id !== 'productModalOverlay' && !event.target.closest('.modal-close-btn')) {
        return;
    }
    const overlay = document.getElementById('productModalOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function addModalProductToCart() {
    if (!currentModalProduct) return;
    addToCart(currentModalProduct, selectedModalSize);
    closeProductModal();
}

function buyModalProductNow() {
    if (!currentModalProduct) return;
    addToCart(currentModalProduct, selectedModalSize);
    closeProductModal();
    window.location.href = 'checkout.html';
}

// Sync cart UI on script load
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
});
