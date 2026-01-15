/**
 * admin.js
 * ควบคุมการทำงานของหน้า Dashboard ผู้ดูแลระบบ
 * - ดึงข้อมูลการจองจาก Google Sheets
 * - แสดงผลในตาราง
 * - ยืนยันการจอง
 * - ดูรูปสลิป
 */

// --- CONFIGURATION ---
// ใส่ URL ของ Google Apps Script Web App ที่ Deploy แล้ว (อันเดียวกับที่ใช้ใน script.js ของฝั่งลูกค้า)
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwb9VWt0rQYJ2dJa9jQKM23YRKsx-YReKnqJTiqGRbg26jEMtPP-RzxDbe_BahxUiSu5g/exec";

// --- STATE MANAGEMENT ---
let allBookings = []; // ตัวแปรเก็บข้อมูลการจองทั้งหมดชั่วคราว

// --- INITIALIZATION ---
// ทำงานเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    loadBookings();

    // Event Listener สำหรับปิด Modal เมื่อกดที่พื้นหลัง
    const modal = document.getElementById('imgModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
});

// --- CORE FUNCTIONS ---

/**
 * โหลดข้อมูลการจองทั้งหมดจาก Backend
 */
async function loadBookings() {
    showLoading(true);
    try {
        // เรียก API ไปยัง Google Script (doGet action=getAllBookings)
        const response = await fetch(`${BACKEND_URL}?action=getAllBookings`);
        const result = await response.json();

        if (result.status === "success") {
            // ตัดแถวแรกออก (Header ของ Sheet)
            allBookings = result.data.slice(1);
            
            // เรียงลำดับข้อมูล: ใหม่สุดอยู่บน (ใช้ Timestamp คอลัมน์ index 1)
            allBookings.sort((a, b) => new Date(b[1]) - new Date(a[1]));
            
            renderTable(allBookings);
            updateDashboardStats(allBookings);
        } else {
            alert("ไม่สามารถโหลดข้อมูลได้: " + result.message);
        }
    } catch (error) {
        console.error("Error loading bookings:", error);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
        showLoading(false);
    }
}

/**
 * แสดงข้อมูลในตาราง HTML
 * @param {Array} bookings - อาร์เรย์ข้อมูลการจอง
 */
function renderTable(bookings) {
    const tbody = document.getElementById("bookingTable");
    tbody.innerHTML = ""; // ล้างข้อมูลเก่า

    if (bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">ไม่มีรายการจอง</td></tr>`;
        return;
    }

    bookings.forEach(row => {
        // Mapping Data ตาม Index ของ Column ใน Google Sheet
        // [0]=ID, [1]=Timestamp, [2]=LineID, [3]=LineName, [4]=Name, [5]=Tel, 
        // [6]=RoomID, [7]=RoomName, [8]=People, [9]=Food, [10]=FoodCount, 
        // [11]=Code, [12]=Amount, [13]=Total, [14]=Deposit, [15]=Balance, 
        // [16]=CheckIn, [17]=CheckOut, [18]=SlipURL, [19]=Status

        const bookingId = row[0];
        const customerName = row[4];
        const customerTel = row[5];
        const roomName = row[7];
        const checkIn = formatDate(row[16]);
        const checkOut = formatDate(row[17]);
        const slipUrl = row[18];
        const status = row[19];
        const deposit = formatCurrency(row[14]);

        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 transition-colors";

        // สร้าง HTML สำหรับแต่ละแถว
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-900">
                ${bookingId}
                <div class="text-xs text-gray-400 font-light">${formatDateTime(row[1])}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <div class="font-bold">${customerName}</div>
                <div class="text-xs text-gray-500">📞 ${customerTel}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
                <div class="font-semibold">${roomName}</div>
                <div class="text-xs text-gray-500">เข้าพัก: ${checkIn} - ${checkOut}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                ${deposit}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                ${renderSlipButton(slipUrl)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                ${renderStatusBadge(status)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                ${renderActionButtons(bookingId, status)}
            </td>
        `;

        tbody.appendChild(tr);
    });
}

/**
 * ส่งคำขอยืนยันการจองไปยัง Backend
 * @param {string} bookingId - รหัสการจอง
 */
async function confirmBooking(bookingId) {
    if (!confirm(`ยืนยันการจองรายการ ${bookingId} ใช่หรือไม่? \n(ระบบจะส่งไลน์แจ้งลูกค้าทันที)`)) {
        return;
    }

    showLoading(true);

    try {
        const payload = {
            action: "confirmBooking",
            id: bookingId
        };

        // ส่ง POST Request (ใช้ no-cors ในบางกรณีอาจต้องปรับ config แต่ถ้าเป็น Web App 'Anyone' จะส่งกลับได้ปกติ)
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            alert("✅ ยืนยันรายการเรียบร้อย!");
            loadBookings(); // โหลดข้อมูลใหม่
        } else {
            alert("❌ เกิดข้อผิดพลาด: " + result.message);
        }

    } catch (error) {
        console.error("Error confirming:", error);
        // ในบางกรณี GAS อาจ return cors error แต่ทำงานสำเร็จ ให้ลอง refresh ดู
        alert("ส่งคำขอแล้ว (หากไม่ขึ้นยืนยัน กรุณากด Refresh)"); 
        loadBookings();
    } finally {
        showLoading(false);
    }
}

// --- HELPER FUNCTIONS (ฟังก์ชันช่วยทำงานทั่วไป) ---

// แสดงปุ่มดูสลิป
function renderSlipButton(url) {
    if (!url || url === "") return '<span class="text-gray-300">-</span>';
    return `<button onclick="openModal('${url}')" class="text-blue-600 hover:text-blue-800 text-xs font-bold border border-blue-200 px-2 py-1 rounded bg-blue-50">ดูสลิป</button>`;
}

// แสดง Badge สถานะสีต่างๆ
function renderStatusBadge(status) {
    let colorClass = "bg-gray-100 text-gray-800";
    
    if (status === "ยืนยันแล้ว") colorClass = "bg-green-100 text-green-800 border border-green-200";
    else if (status === "รอตรวจสอบ") colorClass = "bg-yellow-100 text-yellow-800 border border-yellow-200";
    else if (status === "ยกเลิก") colorClass = "bg-red-100 text-red-800";

    return `<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}">${status}</span>`;
}

// แสดงปุ่ม Action ตามสถานะ
function renderActionButtons(id, status) {
    if (status === "รอตรวจสอบ") {
        return `<button onclick="confirmBooking('${id}')" class="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs transition shadow-sm">ยืนยัน</button>`;
    } else if (status === "ยืนยันแล้ว") {
        return `<span class="text-green-600 text-lg">✓</span>`;
    }
    return `-`;
}

// เปิด Modal รูปภาพ
function openModal(imgUrl) {
    const modal = document.getElementById("imgModal");
    const modalImg = document.getElementById("modalImg");
    modalImg.src = imgUrl;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

// ปิด Modal
function closeModal() {
    const modal = document.getElementById("imgModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.getElementById("modalImg").src = "";
}

// แสดง Loading Overlay
function showLoading(isLoading) {
    // สมมติว่าใน HTML มี div id="loadingOverlay" (ถ้าไม่มีให้สร้างเพิ่ม หรือข้ามไป)
    const overlay = document.getElementById("loading");
    if (overlay) {
        if (isLoading) overlay.classList.remove("hidden");
        else overlay.classList.add("hidden");
    }
}

// อัปเดตตัวเลขสถิติบน Dashboard (ถ้ามี)
function updateDashboardStats(bookings) {
    const total = bookings.length;
    const pending = bookings.filter(b => b[19] === "รอตรวจสอบ").length;
    const confirmed = bookings.filter(b => b[19] === "ยืนยันแล้ว").length;

    // ตรวจสอบว่ามี Element ให้แสดงผลไหม
    if (document.getElementById("statTotal")) document.getElementById("statTotal").innerText = total;
    if (document.getElementById("statPending")) document.getElementById("statPending").innerText = pending;
    if (document.getElementById("statConfirmed")) document.getElementById("statConfirmed").innerText = confirmed;
}

// แปลงรูปแบบวันที่ (DD/MM/YYYY)
function formatDate(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// แปลงรูปแบบวันเวลา (DD/MM/YYYY HH:MM)
function formatDateTime(dateString) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute:'2-digit' });
}

// แปลงตัวเลขเป็นเงินบาท (฿1,000.00)
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
}
