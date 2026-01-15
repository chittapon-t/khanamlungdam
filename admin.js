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


async function loadAll() {
    loadRoomsConfig();
    loadBookings();
}

async function loadRoomsConfig() {
    try {
        const res = await fetch(`${BACKEND_URL}?action=getRoomsAdmin`);
        const result = await res.json();
        if (result.status === "success") renderRoomManagement(result.data);
    } catch (e) { console.error(e); }
}

function renderRoomManagement(rooms) {
    const container = document.getElementById("roomManageTable");
    container.innerHTML = rooms.map(room => `
        <div class="flex items-center justify-between p-4 border rounded-xl bg-gray-50">
            <div><span class="font-bold block">${room.name}</span><span class="text-[10px] text-gray-400">ID: ${room.id}</span></div>
            <button onclick="toggleRoomStatus('${room.id}', '${room.status}')" 
                class="px-3 py-1 rounded-full text-[10px] font-bold transition ${
                    room.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }">${room.status === 'Available' ? 'กำลังเปิดขาย' : 'ปิดการจอง'}</button>
        </div>
    `).join('');
}

async function toggleRoomStatus(roomId, currentStatus) {
    const newStatus = currentStatus === "Available" ? "Closed" : "Available";
    if (!confirm(`ยืนยันการเปลี่ยนสถานะเป็น ${newStatus === 'Available' ? 'เปิดขาย' : 'หยุดขาย'}?`)) return;
    const res = await fetch(BACKEND_URL, { method: "POST", body: JSON.stringify({ action: "updateRoomStatus", roomId, status: newStatus }) });
    if ((await res.json()).status === "success") loadRoomsConfig();
}

async function loadBookings() {
    const res = await fetch(`${BACKEND_URL}?action=getAllBookings`);
    const json = await res.json();
    const list = document.getElementById("bookingTableBody");
    list.innerHTML = json.data.slice(1).reverse().map(r => `
        <tr class="hover:bg-gray-50">
            <td class="p-4 font-bold text-emerald-800">${r[0]}</td>
            <td class="p-4">${r[4]}<br><span class="text-[10px] text-gray-400">${r[5]}</span></td>
            <td class="p-4">${r[7]}<br><span class="text-[10px] italic text-emerald-600">${r[16]} ถึง ${r[17]}</span></td>
            <td class="p-4 font-bold">฿${r[13]}</td>
            <td class="p-4"><span class="px-2 py-1 rounded text-[10px] font-bold ${r[19] === 'ยืนยันแล้ว' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${r[19]}</span></td>
            <td class="p-4">${r[19] === 'รอตรวจสอบ' ? `<button onclick="confirmBooking('${r[0]}')" class="bg-emerald-600 text-white px-2 py-1 rounded text-[10px]">ยืนยันโอน</button>` : '-'}</td>
        </tr>
    `).join('');
}

async function confirmBooking(id) {
    if (!confirm("ยืนยันรายการนี้?")) return;
    const res = await fetch(BACKEND_URL, { method: "POST", body: JSON.stringify({ action: "confirmBooking", id }) });
    if ((await res.json()).status === "success") loadBookings();
}

window.onload = loadAll;
