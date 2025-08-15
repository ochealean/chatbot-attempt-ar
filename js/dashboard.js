import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, onValue, set } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
// import { increment, push } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAuPALylh11cTArigeGJZmLwrFwoAsNPSI",
    authDomain: "opportunity-9d3bf.firebaseapp.com",
    databaseURL: "https://opportunity-9d3bf-default-rtdb.firebaseio.com",
    projectId: "opportunity-9d3bf",
    storageBucket: "opportunity-9d3bf.firebasestorage.app",
    messagingSenderId: "57906230058",
    appId: "1:57906230058:web:2d7cd9cc68354722536453",
    measurementId: "G-QC2JSR1FJW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getDatabase(app);

// ito ay kapag may nagtype ng url papuntang dashboard kahit di naka login
document.body.style.display = 'none';

onAuthStateChanged(auth, (user) => {
    if (user) {
        get(ref(db, `AR_shoe_users/customer/${user.uid}`))
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    document.getElementById('userName_display1').textContent = userData.firstName;
                    document.getElementById('userName_display2').textContent = userData.firstName + " " + userData.lastName;
                    document.getElementById('imageProfile').src = userData.profilePhoto?.profilePhoto?.url || "https://firebasestorage.googleapis.com/v0/b/opportunity-9d3bf.appspot.com/o/profile%2Fdefault_profile.png?alt=media&token=5f1a4b8c-7e6b-4f1c-8a2d-0e5f3b7c4a2e";
                    document.body.style.display = '';
                    Recent_OrdersFunc(user.uid);
                    loadAllShoes();
                } else {
                    alert("Account does not exist");
                    auth.signOut();
                }
            });
    } else {
        window.location.href = "/user_login.html";
    }
});

function Recent_OrdersFunc(uid) {
    if (!uid) {
        console.warn("User ID is missing for Recent_OrdersFunc.");
        return;
    }

    const recentOrdersRef = ref(db, `AR_shoe_users/transactions/${uid}`);

    onValue(recentOrdersRef, (snapshot) => {
        const orderCount = snapshot.exists() ? snapshot.size || snapshot.numChildren() : 0;
        console.log("Number of recent orders:", orderCount);

        const ordersElement = document.getElementById("Recent_Orders");
        if (ordersElement) {
            ordersElement.textContent = orderCount;
        } else {
            console.warn("Element with ID 'Recent_Orders' not found in DOM.");
        }
    }, (error) => {
        console.error("Failed to fetch recent orders:", error);
    });
}



function loadAllShoes() {
    const shoesRef = ref(db, 'AR_shoe_users/shoe/');
    const shopsRef = ref(db, 'AR_shoe_users/shop/');

    // Fetch all shops first to map shopId -> shopName
    get(shopsRef).then(shopsSnapshot => {
        const shopNames = {};
        if (shopsSnapshot.exists()) {
            shopsSnapshot.forEach(shopSnap => {
                const shopData = shopSnap.val();
                // Use both possible ID formats for backward compatibility
                shopNames[shopSnap.key] = shopData.shopName || 'Unknown Shop';
            });
        }

        onValue(shoesRef, (snapshot) => {
            const shoesContainer = document.getElementById('shoesContainer');
            if (!shoesContainer) return;

            shoesContainer.innerHTML = '';

            if (snapshot.exists()) {
                const allShoes = [];

                snapshot.forEach((shopSnapshot) => {
                    const shopId = shopSnapshot.key;

                    shopSnapshot.forEach((shoeSnapshot) => {
                        const shoeData = shoeSnapshot.val();
                        // Handle both shopID and shopId cases
                        const actualShopId = shoeData.shopID || shoeData.shopId || shopId;
                        const shopName = shopNames[actualShopId] ||
                            shoeData.shopName ||
                            'Unknown Shop';

                        // Create a clean shoe object with guaranteed fields
                        const shoe = {
                            ...shoeData,
                            shopId: actualShopId,
                            shopName: shopName,
                            shoeId: shoeSnapshot.key
                        };

                        allShoes.push(shoe);
                    });
                });

                if (allShoes.length > 0) {
                    allShoes.forEach(shoe => {
                        displayShoe(shoe);
                    });
                } else {
                    shoesContainer.innerHTML = '<p class="no-shoes">No shoes available at the moment.</p>';
                }
            } else {
                shoesContainer.innerHTML = '<p class="no-shoes">No shoes available at the moment.</p>';
            }
        });
    }).catch(error => {
        console.error("Error loading shops:", error);
        // Fallback - load shoes even if shops fail to load
        onValue(shoesRef, (snapshot) => {
        });
    });
}

function displayShoe(shoe) {
    const shoesContainer = document.getElementById('shoesContainer');
    const shoeCard = document.createElement('div');
    shoeCard.className = 'shoe-card';

    // Get first variant for display
    const firstVariantKey = Object.keys(shoe.variants)[0];
    const firstVariant = shoe.variants[firstVariantKey];

    // Get lowest price
    let lowestPrice = Infinity;
    Object.values(shoe.variants).forEach(variant => {
        if (variant.price < lowestPrice) {
            lowestPrice = variant.price;
        }
    });

    function fixedDescription(description) {
        return description.length > 100 ? description.substring(0, 100) + '...' : description;
    }

    shoeCard.innerHTML = `
        <div class="shoe-image">
            <img src="${shoe.defaultImage || firstVariant.imageUrl || 'https://via.placeholder.com/300'}" alt="${shoe.shoeName}">
        </div>
        <div class="shoe-details">
            <h3>${shoe.shoeName}</h3>
            <p class="shoe-code">Code: ${shoe.shoeCode}</p>
            <h4>Shop Name: ${shoe.shopName}</h4>
            <div class="product-meta">
                <span class="product-brand">${shoe.brand || 'No Brand'}</span>
                <span class="product-type">${shoe.type || 'No Type'}</span>
            </div>
            <p class="shoe-description">${fixedDescription(shoe.generalDescription) || 'No description available'}</p>
            <p class="shoe-price">From ₱${lowestPrice.toFixed(2)}</p>
            <div class="shoe-variants">
                <p>Available in ${Object.keys(shoe.variants).length} color${Object.keys(shoe.variants).length > 1 ? 's' : ''}</p>
            </div>
            <button class="btn-view" onclick="viewShoeDetails('${shoe.shopId}', '${shoe.shoeId}')">
                View Details
            </button>
        </div>
    `;

    shoesContainer.appendChild(shoeCard);
}

let selectedVariantKey = null;
let selectedSizeKey = null;
let currentShoeData = null;

window.viewShoeDetails = async function (shopId, shoeId) {
    const shoeRef = ref(db, `AR_shoe_users/shoe/${shopId}/${shoeId}`);

    try {
        const snapshot = await get(shoeRef);
        if (!snapshot.exists()) {
            alert('Shoe not found');
            return;
        }

        currentShoeData = snapshot.val();
        currentShoeData.shopId = shopId;
        currentShoeData.shoeId = shoeId;

        // Select first variant by default
        selectedVariantKey = Object.keys(currentShoeData.variants)[0];
        selectedSizeKey = null;

        updateProductModalContent();
        document.getElementById('productDetailsModal').classList.add('show');
        document.body.classList.add('modal-open');

    } catch (error) {
        console.error("Error fetching shoe details:", error);
        alert('Error loading shoe details');
    }
};

function updateProductModalContent() {
    const shoe = currentShoeData;
    const variant = shoe.variants[selectedVariantKey];

    // Generate variants HTML
    let variantsHtml = Object.entries(shoe.variants).map(([key, variant]) => `
        <div class="variant-option ${key === selectedVariantKey ? 'selected' : ''}" 
             onclick="selectVariant('${key}')">
            <div class="variant-header">
                <span class="variant-name">${variant.variantName}</span>
                <span class="variant-price">₱${variant.price}</span>
            </div>
            <div>
                ${variant.imageUrl ? `<img src="${variant.imageUrl}" class="variant-image">` : ''}
                <span>Color: ${variant.color}</span>
            </div>
            <div class="variant-sizes">
                ${Object.entries(variant.sizes).map(([sizeKey, sizeObj]) => {
        const sizeValue = Object.keys(sizeObj)[0];
        const stock = sizeObj[sizeValue].stock;
        return `
                        <div class="size-option 
                            ${stock <= 0 ? 'out-of-stock' : ''}
                            ${key === selectedVariantKey && selectedSizeKey === sizeKey ? 'selected' : ''}"
                            onclick="event.stopPropagation(); selectSize('${key}', '${sizeKey}')">
                            ${sizeValue}
                            ${stock > 0 ? `(${stock})` : '(out)'}
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `).join('');

    // Get available stock for selected size
    let availableStock = 0;
    if (selectedSizeKey) {
        const sizeObj = variant.sizes[selectedSizeKey];
        const sizeValue = Object.keys(sizeObj)[0];
        availableStock = sizeObj[sizeValue].stock;
    }

    // Set modal content
    document.getElementById('productModalTitle').textContent = shoe.shoeName;
    document.getElementById('productModalBody').innerHTML = `
        <div class="product-details-container">
            <div class="product-main-image">
                <img src="${variant.imageUrl || shoe.defaultImage || 'https://via.placeholder.com/300'}">
            </div>
            <div class="product-info">
                <h2 class="product-name">Shop Name: ${shoe.shopName}</h2>
                <div class="product-code">Product Code: ${shoe.shoeCode}</div>
                <div class="product-price">₱${variant.price}</div>
                
                <!-- Add quantity selector -->
                <div class="quantity-selector" ${!selectedSizeKey ? 'style="display:none;"' : ''}>
                    <label for="quantity">Quantity:</label>
                    <div class="quantity-controls">
                        <button type="button" class="quantity-btn minus" onclick="adjustQuantity(-1)">-</button>
                        <input type="number" id="quantity" name="quantity" min="1" max="${availableStock}" value="1" onchange="validateQuantity()">
                        <button type="button" class="quantity-btn plus" onclick="adjustQuantity(1)">+</button>
                    </div>
                    <div class="available-stock">Available: ${availableStock}</div>
                </div>
                
                <div class="product-description">
                    <h4>Description</h4>
                    <p>${shoe.generalDescription || 'No description available'}</p>
                </div>
            </div>
        </div>
        <div class="product-variants">
            <h3>Available Variants</h3>
            ${variantsHtml}
        </div>
    `;

    updateButtonStates();
}


function updateButtonStates() {
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');

    if (selectedSizeKey === null) {
        addToCartBtn.disabled = true;
        buyNowBtn.disabled = true;
        addToCartBtn.classList.add('btn-disabled');
        buyNowBtn.classList.add('btn-disabled');
    } else {
        addToCartBtn.disabled = false;
        buyNowBtn.disabled = false;
        addToCartBtn.classList.remove('btn-disabled');
        buyNowBtn.classList.remove('btn-disabled');
    }
}

async function searchShoes(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();

    if (!searchTerm) {
        loadAllShoes(); // Show all shoes if search is empty
        return;
    }

    const shoesRef = ref(db, 'AR_shoe_users/shoe/');
    const snapshot = await get(shoesRef);
    const shoesContainer = document.getElementById('shoesContainer');

    if (!shoesContainer) return;
    shoesContainer.innerHTML = '';

    if (snapshot.exists()) {
        const allShoes = [];

        snapshot.forEach((shopSnapshot) => {
            const shopId = shopSnapshot.key;

            shopSnapshot.forEach((shoeSnapshot) => {
                const shoeData = shoeSnapshot.val();
                shoeData.shopId = shopId;
                shoeData.shoeId = shoeSnapshot.key;
                allShoes.push(shoeData);
            });
        });

        const filteredShoes = allShoes.filter(shoe => {
            return (
                shoe.shoeName.toLowerCase().includes(searchTerm) ||
                shoe.shoeCode.toLowerCase().includes(searchTerm) ||
                (shoe.generalDescription && shoe.generalDescription.toLowerCase().includes(searchTerm))
            )
        });

        if (filteredShoes.length > 0) {
            filteredShoes.forEach(shoe => {
                displayShoe(shoe);
            });
        } else {
            shoesContainer.innerHTML = '<p class="no-shoes">No shoes found matching your search.</p>';
        }
    } else {
        shoesContainer.innerHTML = '<p class="no-shoes">No shoes available at the moment.</p>';
    }
}

function generate18CharID() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 18; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}



//  event listeners

const unique18CharID = generate18CharID();
console.log(unique18CharID); // Outputs something like 'Ab3XyZ89QlMnO1pRsT'

window.selectVariant = function (variantKey) {
    selectedVariantKey = variantKey;
    selectedSizeKey = null;
    updateProductModalContent();
};

window.selectSize = function (variantKey, sizeKey) {
    selectedVariantKey = variantKey;

    // Check stock
    const sizeObj = currentShoeData.variants[variantKey].sizes[sizeKey];
    const sizeValue = Object.keys(sizeObj)[0];
    const stock = sizeObj[sizeValue].stock;

    if (stock > 0) {
        selectedSizeKey = sizeKey;
        updateProductModalContent();

        // Show quantity selector and set max value
        const quantitySelector = document.querySelector('.quantity-selector');
        if (quantitySelector) {
            quantitySelector.style.display = 'block';
            document.getElementById('quantity').max = stock;
        }
    }
};

window.closeProductModal = function () {
    document.getElementById('productDetailsModal').classList.remove('show');
    document.body.classList.remove('modal-open');
};

// addToCart function 
window.addToCart = async function (cartItem) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to add items to cart');
        return false;
    }

    try {
        // Generate a unique cart item ID
        const cartItemId = generate18CharID();

        // Create the cart item structure
        const cartItemData = {
            shopId: cartItem.shopId,
            shoeId: cartItem.shoeId,
            variantKey: cartItem.variantKey,
            sizeKey: cartItem.sizeKey,
            shoeName: cartItem.shoeName,
            variantName: cartItem.variantName,
            color: cartItem.color,
            size: cartItem.size,
            price: cartItem.price,
            image: cartItem.image,
            quantity: cartItem.quantity || 1,
            addedAt: new Date().toISOString()
        };

        // Save to Firebase
        const cartRef = ref(db, `AR_shoe_users/carts/${user.uid}/${cartItemId}`);
        await set(cartRef, cartItemData);

        console.log("Item added to cart successfully");
        return true;

    } catch (error) {
        console.error("Error adding to cart:", error);
        alert("Failed to add item to cart");
        return false;
    }
};

document.getElementById('addToCartBtn').addEventListener('click', async function () {
    if (!currentShoeData || !selectedVariantKey) {
        alert('Please select a variant first');
        return;
    }

    if (!selectedSizeKey) {
        alert('Please select a size first');
        return;
    }

    const variant = currentShoeData.variants[selectedVariantKey];
    const sizeObj = variant.sizes[selectedSizeKey];
    const sizeValue = Object.keys(sizeObj)[0];
    const stock = sizeObj[sizeValue].stock;
    const quantity = parseInt(document.getElementById('quantity').value) || 1;

    if (stock > 0 && quantity > 0 && quantity <= stock) {
        const cartItem = {
            shopId: currentShoeData.shopId,
            shoeId: currentShoeData.shoeId,
            variantKey: selectedVariantKey,
            sizeKey: selectedSizeKey,
            shoeName: currentShoeData.shoeName,
            variantName: variant.variantName,
            color: variant.color,
            size: sizeValue,
            price: variant.price,
            image: variant.imageUrl || currentShoeData.defaultImage,
            quantity: quantity
        };

        const success = await addToCart(cartItem);
        if (success) {
            alert('Item added to cart successfully!');
        }
    } else {
        alert('Selected quantity exceeds available stock');
    }
});

document.getElementById('buyNowBtn').addEventListener('click', function () {
    if (!currentShoeData || !selectedVariantKey) {
        alert('Please select a variant first');
        return;
    }

    if (!selectedSizeKey) {
        alert('Please select a size first');
        return;
    }

    const variant = currentShoeData.variants[selectedVariantKey];
    const sizeObj = variant.sizes[selectedSizeKey];
    const sizeValue = Object.keys(sizeObj)[0];
    const quantity = parseInt(document.getElementById('quantity').value) || 1;

    // Create URL parameters
    const params = new URLSearchParams();
    params.append('method', 'buyNow');
    params.append('shopId', currentShoeData.shopId);
    params.append('shoeId', currentShoeData.shoeId);
    params.append('variantKey', selectedVariantKey);
    params.append('sizeKey', selectedSizeKey);
    params.append('shopName', currentShoeData.shopName);
    params.append('size', sizeValue);
    params.append('quantity', quantity);
    params.append('price', variant.price);
    params.append('shoeName', currentShoeData.shoeName);
    params.append('variantName', variant.variantName);
    params.append('color', variant.color);
    params.append('image', variant.imageUrl || currentShoeData.defaultImage);

    // Redirect to checkout with parameters
    window.location.href = `checkout.html?${params.toString()}`;
});

document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        closeProductModal();
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeProductModal();
    }
});

// for search bar
// document.querySelector('.search-bar').addEventListener('input', function (e) {
//     searchShoes(e.target.value);
// });

// for logout
document.getElementById('logout_btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log("User signed out");
    }).catch((error) => {
        console.error("Error signing out: ", error);
    });
});

// for quantity
window.adjustQuantity = function (change) {
    const quantityInput = document.getElementById('quantity');
    let newValue = parseInt(quantityInput.value) + change;
    const max = parseInt(quantityInput.max);

    if (newValue < 1) newValue = 1;
    if (newValue > max) newValue = max;

    quantityInput.value = newValue;
};

window.validateQuantity = function () {
    const quantityInput = document.getElementById('quantity');
    let value = parseInt(quantityInput.value);
    const max = parseInt(quantityInput.max);

    if (isNaN(value) || value < 1) {
        value = 1;
    } else if (value > max) {
        value = max;
    }

    quantityInput.value = value;
};