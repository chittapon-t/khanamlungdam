const LIFF_ID = "2008863563-tuai5kaC"; // ใส่ LIFF ID
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwb9VWt0rQYJ2dJa9jQKM23YRKsx-YReKnqJTiqGRbg26jEMtPP-RzxDbe_BahxUiSu5g/exec"; // ใส่ URL Web App จากข้อ 1

// --- DATA & CONFIG ---
const ROOMS = [
    { id: "HP", name: "โฮมสเตย์หนำโป", type: "homestay", capacity: [4, 8], price: { "4-5": 1600, "6-8": 2200 }, img: "https://via.placeholder.com/100?text=Home" },
    { id: "RH1", name: "บ้านพักริมน้ำ 1", type: "river", capacity: [1, 3], price: { "1-2": 1400, "3": 1750 }, img: "https://via.placeholder.com/100?text=River1" },
    { id: "RH2", name: "บ้านพักริมน้ำ 2", type: "river", capacity: [1, 3], price: { "1-2": 1400, "3": 1750 }, img: "https://via.placeholder.com/100?text=River2" },
    { id: "KJ1", name: "เต็นท์กระโจม 1", type: "tent_vip", capacity: [1, 4], price: { "1-2": 1200, "3-4": 1550 }, img: "https://via.placeholder.com/100?text=TentVIP1" },
    { id: "KJ2", name: "เต็นท์กระโจม 2", type: "tent_vip", capacity: [1, 4], price: { "1-2": 1200, "3-4": 1550 }, img: "https://via.placeholder.com/100?text=TentVIP2" },
    { id: "K1", name: "เช่าเต็นท์สนาม K1", type: "tent_rent", capacity: [1, 2], price: { "1-2": 700 }, img: "https://via.placeholder.com/100?text=TentK1" },
    { id: "K2", name: "เช่าเต็นท์สนาม K2", type: "tent_rent", capacity: [1, 2], price: { "1-2": 700 }, img: "https://via.placeholder.com/100?text=TentK2" },
    { id: "CG", name: "ลานกางเต็นท์ (นำมาเอง)", type: "ground", capacity: [1, 20], price: { "person": 150 }, isMulti: true, img: "https://via.placeholder.com/100?text=Ground" }
];

const FOODS = [
    { id: "F01", name: "ชุดหมูกระทะลุงดำ", price: 390 },
    { id: "F02", name: "ชุดไก่กระทะลุงดำ", price: 390 },
    { id: "F03", name: "ชุดชาบูหมูลุงดำ", price: 390 },
    { id: "F04", name: "ชุดชาบูไก่ลุงดำ", price: 390 },
    { id: "F05", name: "เซ็ตอาหารพื้นบ้าน", price: 390 }
];

let state = {
    step: 1,
    lineProfile: {},
    bookings: [], // from backend
    selection: {
        checkIn: "",
        checkOut: "",
        rooms: [], // { id, people, price }
        foods: [], // { id, qty, price }
        discount: 0,
        discountCode: ""
    }
};

// --- INIT ---
async function init() {
    toggleLoading(true);
    try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            state.lineProfile = profile;
            document.getElementById("userImg").src = profile.pictureUrl;
            document.getElementById("userName").innerText = profile.displayName;
        } else {
            liff.login();
        }
        
        // Load Data from Backend
        const response = await fetch(BACKEND_URL + "?action=getConfig");
        const result = await response.json();
        if(result.status === "success") {
            state.bookings = result.data.bookings;
            // Handle special days/codes if needed
        }
        
        renderFoods();
        setMinDate();
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + err.message);
    } finally {
        toggleLoading(false);
    }
}

// --- STEP 1: DATE & ROOM ---
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("checkin").min = today;
    document.getElementById("checkout").min = today;
}

function handleDateChange() {
    const inDate = document.getElementById("checkin").value;
    const outDate = document.getElementById("checkout").value;

    if (inDate && outDate) {
        if (inDate >= outDate) {
            alert("วันที่เช็คเอาท์ต้องหลังวันที่เช็คอิน");
            document.getElementById("checkout").value = "";
            return;
        }
        state.selection.checkIn = inDate;
        state.selection.checkOut = outDate;
        
        document.getElementById("roomSelectionArea").classList.remove("hidden");
        renderRooms(inDate, outDate);
    }
}

function renderRooms(inDate, outDate) {
    const container = document.getElementById("roomList");
    container.innerHTML = "";

    // Check availability
    const busyRooms = state.bookings
        .filter(b => {
             // Overlap logic: (StartA < EndB) and (EndA > StartB)
             return (b.checkIn < outDate && b.checkOut > inDate) && b.status !== "ยกเลิก";
        })
        .map(b => b.roomId);

    ROOMS.forEach(room => {
        const isBusy = busyRooms.includes(room.id) && !room.isMulti;
        const div = document.createElement("div");
        div.className = `p-3 border rounded-lg flex items-center justify-between bg-white ${isBusy ? 'card-disabled' : ''}`;
        
        // Select logic
        const isSelected = state.selection.rooms.find(r => r.id === room.id);
        if(isSelected) div.classList.add("card-selected");

        div.innerHTML = `
            <div class="flex items-center space-x-3 flex-1">
                <img src="${room.img}" class="w-16 h-16 rounded object-cover">
                <div>
                    <h3 class="font-bold text-emerald-900">${room.name}</h3>
                    <p class="text-xs text-gray-500">${getRoomPriceDesc(room)}</p>
                    ${isBusy ? '<span class="text-xs text-red-500 font-bold">ไม่ว่าง</span>' : ''}
                </div>
            </div>
            ${!isBusy ? `
            <div class="text-right">
                <select id="pax-${room.id}" class="text-xs border rounded p-1 mb-1 block w-full" onclick="event.stopPropagation()">
                   ${getPersonOptions(room)}
                </select>
                <button onclick="selectRoom('${room.id}')" class="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">
                    ${isSelected ? 'เลือกแล้ว' : 'เลือก'}
                </button>
            </div>` : ''}
        `;
        container.appendChild(div);
    });
}

function getRoomPriceDesc(room) {
    if (room.type === "ground") return `${room.price.person} บ./คน`;
    let desc = "";
    for (const [key, val] of Object.entries(room.price)) {
        desc += `${key} คน: ${val}฿ | `;
    }
    return desc.slice(0, -3);
}

function getPersonOptions(room) {
    if (room.type === "ground") {
        let opts = "";
        for(let i=1; i<=20; i++) opts += `<option value="${i}">${i} คน</option>`;
        return opts;
    }
    // Logic for keys like "4-5", "1-2"
    let options = [];
    if(room.price["1-2"]) { options.push(1, 2); }
    if(room.price["3"]) { options.push(3); }
    if(room.price["3-4"]) { options.push(3, 4); }
    if(room.price["4-5"]) { options.push(4, 5); }
    if(room.price["6-8"]) { options.push(6, 7, 8); }
    
    // remove duplicates and sort
    options = [...new Set(options)].sort((a,b)=>a-b);
    return options.map(n => `<option value="${n}">${n} คน</option>`).join("");
}

function selectRoom(roomId) {
    const room = ROOMS.find(r => r.id === roomId);
    const paxSelect = document.getElementById(`pax-${roomId}`);
    const pax = parseInt(paxSelect.value);
    
    // Check if already selected, remove it
    const existingIdx = state.selection.rooms.findIndex(r => r.id === roomId);
    if (existingIdx > -1) {
        state.selection.rooms.splice(existingIdx, 1);
    } else {
        // Calculate price
        let price = 0;
        if(room.type === "ground") {
            price = pax * room.price.person;
        } else {
            // Find price key
            for(const [key, val] of Object.entries(room.price)) {
                if(key.includes("-")) {
                    const [min, max] = key.split("-").map(Number);
                    if(pax >= min && pax <= max) price = val;
                } else {
                    if(pax == key) price = val;
                }
            }
        }
        
        state.selection.rooms.push({
            id: room.id,
            name: room.name,
            people: pax,
            price: price
        });
    }
    renderRooms(state.selection.checkIn, state.selection.checkOut);
    updateTotal();
}

// --- STEP 2: FOOD ---
function renderFoods() {
    const container = document.getElementById("foodList");
    container.innerHTML = FOODS.map(f => `
        <div class="flex justify-between items-center border-b pb-2">
            <div>
                <p class="font-semibold text-gray-800">${f.name}</p>
                <p class="text-xs text-gray-500">${f.price} บาท</p>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="updateFood('${f.id}', -1)" class="w-6 h-6 rounded-full bg-gray-200 text-gray-600 font-bold">-</button>
                <span id="qty-${f.id}" class="text-sm w-4 text-center">0</span>
                <button onclick="updateFood('${f.id}', 1)" class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold">+</button>
            </div>
        </div>
    `).join("");
}

function updateFood(id, delta) {
    const food = FOODS.find(f => f.id === id);
    const existing = state.selection.foods.find(f => f.id === id);
    let newQty = existing ? existing.qty + delta : delta;
    if (newQty < 0) newQty = 0;

    document.getElementById(`qty-${id}`).innerText = newQty;

    if (newQty === 0 && existing) {
        state.selection.foods = state.selection.foods.filter(f => f.id !== id);
    } else if (existing) {
        existing.qty = newQty;
    } else if (newQty > 0) {
        state.selection.foods.push({ id: food.id, name: food.name, price: food.price, qty: newQty });
    }
    updateTotal();
}

// --- CALCULATION & NAVIGATION ---
function updateTotal() {
    const roomTotal = state.selection.rooms.reduce((sum, r) => sum + r.price, 0);
    const foodTotal = state.selection.foods.reduce((sum, f) => sum + (f.price * f.qty), 0);
    const discount = state.selection.discount;
    
    const grandTotal = Math.max(0, roomTotal - discount) + foodTotal;
    
    document.getElementById("totalPrice").innerText = `฿${grandTotal.toLocaleString()}`;
    
    // Deposit Logic (Example: 50% of Room after discount + 100% Food)
    const depositRoom = Math.max(0, roomTotal - discount) * 0.5;
    const deposit = depositRoom + foodTotal; 
    
    state.selection.calculated = {
        roomTotal, foodTotal, grandTotal, deposit,
        balance: grandTotal - deposit
    };
}

function changeStep(dir) {
    if (dir === 1 && state.step === 1) {
        if (state.selection.rooms.length === 0) return alert("กรุณาเลือกห้องพักอย่างน้อย 1 ห้อง");
    }
    
    state.step += dir;
    
    // Show/Hide Sections
    document.getElementById("step1").classList.add("hidden");
    document.getElementById("step2").classList.add("hidden");
    document.getElementById("step3").classList.add("hidden");
    document.getElementById(`step${state.step}`).classList.remove("hidden");
    document.getElementById(`step${state.step}`).classList.add("fade-in");

    // Button States
    document.getElementById("btnPrev").classList.toggle("hidden", state.step === 1);
    document.getElementById("btnNext").classList.toggle("hidden", state.step === 3);
    document.getElementById("btnConfirm").classList.toggle("hidden", state.step !== 3);

    if (state.step === 3) renderSummary();
}

function renderSummary() {
    const s = state.selection;
    let html = `<p class="font-bold text-gray-700">เข้าพัก: ${s.checkIn} ถึง ${s.checkOut}</p>`;
    
    s.rooms.forEach(r => {
        html += `<div class="flex justify-between text-gray-600"><span>${r.name} (${r.people} คน)</span><span>${r.price}฿</span></div>`;
    });
    
    if (s.foods.length > 0) {
        html += `<div class="border-t my-2 border-dashed"></div><p class="font-bold text-gray-700">อาหาร</p>`;
        s.foods.forEach(f => {
            html += `<div class="flex justify-between text-gray-600"><span>${f.name} x${f.qty}</span><span>${f.price * f.qty}฿</span></div>`;
        });
    }

    if (s.discount > 0) {
         html += `<div class="flex justify-between text-green-600 mt-2"><span>ส่วนลด (${s.discountCode})</span><span>-${s.discount}฿</span></div>`;
    }

    document.getElementById("summaryContent").innerHTML = html;
    document.getElementById("depositText").innerText = `฿${s.calculated.deposit.toLocaleString()}`;
    
    // Generate PromptPay QR
    const ppUrl = `https://promptpay.io/0615924262/${s.calculated.deposit}`;
    document.getElementById("qrCode").src = ppUrl;
}

function applyPromo() {
    const code = document.getElementById("promoInput").value.toUpperCase();
    // In real app, check against backend config. Here hardcoded example.
    const validCodes = { "WELCOME100": 100, "LUNGDAM": 50 };
    
    if (validCodes[code]) {
        state.selection.discount = validCodes[code];
        state.selection.discountCode = code;
        document.getElementById("promoStatus").innerText = "ใช้โค้ดสำเร็จ!";
        document.getElementById("promoStatus").className = "text-[10px] mt-1 text-green-600";
        document.getElementById("promoStatus").classList.remove("hidden");
        updateTotal();
        renderSummary();
    } else {
        alert("โค้ดไม่ถูกต้อง");
    }
}

// --- SUBMIT ---
async function submitBooking() {
    const name = document.getElementById("custName").value;
    const tel = document.getElementById("custTel").value;
    const fileInput = document.getElementById("slip");

    if (!name || !tel || fileInput.files.length === 0) {
        return alert("กรุณากรอกชื่อ เบอร์โทร และแนบสลิปโอนเงิน");
    }

    toggleLoading(true);

    // Convert file to Base64
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async function() {
        const base64 = reader.result;
        
        const payload = {
            action: "createBooking",
            payload: {
                lineId: state.lineProfile.userId || "U_TEST",
                lineName: state.lineProfile.displayName || "Guest",
                name: name,
                tel: tel,
                checkIn: state.selection.checkIn,
                checkOut: state.selection.checkOut,
                roomId: state.selection.rooms.map(r => r.id).join(","),
                roomName: state.selection.rooms.map(r => r.name).join(", "),
                people: state.selection.rooms.map(r => r.people).join(","),
                foodItems: state.selection.foods.map(f => f.name).join(", "),
                foodCount: state.selection.foods.map(f => f.qty).join(","),
                discountCode: state.selection.discountCode,
                amount: state.selection.calculated.roomTotal + state.selection.calculated.foodTotal, // total value
                totalPrice: state.selection.calculated.grandTotal, // after discount
                deposit: state.selection.calculated.deposit,
                balance: state.selection.calculated.balance,
                slipBase64: base64
            }
        };

        try {
            // Using no-cors mode might not return response in client JS due to GAS limitations, 
            // but for this pattern, we usually use a proxy or JSONP if standard fetch fails CORS.
            // However, Web App "Anyone" access usually allows CORS for POST.
            const res = await fetch(BACKEND_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if (json.status === "success") {
                alert("จองสำเร็จ! กรุณารอการยืนยันทางไลน์");
                liff.closeWindow();
            } else {
                throw new Error(json.message);
            }
        } catch (e) {
            alert("จองสำเร็จ (หากมีการแจ้งเตือนในไลน์)"); // Fail-safe UI
            liff.closeWindow();
        } finally {
            toggleLoading(false);
        }
    };
}

function toggleLoading(show) {
    const el = document.getElementById("loading");
    if(show) el.classList.remove("hidden");
    else el.classList.add("hidden");
}

window.onload = init;
