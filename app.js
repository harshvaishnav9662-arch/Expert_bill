// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.log('SW error:', err));
  });
}

const PRODUCT_CATALOG = [
  { name: "RGB ROPE LIGHT COMPLETE SET (STRIP, SENSOR)", rate: 350.00 },
  { name: "RGB ROPE LED LIGHT", rate: 260.00 },
  { name: "FABELLE BLANK PLATE BLACK (POLYCAB)", rate: 13.86 },
  { name: "1.5 SQ MM COPPER WIRE (90M)", rate: 1450.00 },
  { name: "2.5 SQ MM COPPER WIRE (90M)", rate: 2350.00 },
  { name: "1.0 SQ MM COPPER WIRE (90M)", rate: 980.00 },
  { name: "10A 1-WAY MODULAR SWITCH", rate: 24.00 },
  { name: "20A 1-WAY MODULAR SWITCH", rate: 45.00 },
  { name: "6A MODULAR 3-PIN SOCKET", rate: 38.00 },
  { name: "16A MODULAR POWER SOCKET", rate: 68.00 },
  { name: "12V 5A LED SLIM DRIVER/POWER SUPPLY", rate: 320.00 },
  { name: "12V 10A LED SLIM DRIVER/POWER SUPPLY", rate: 540.00 },
  { name: "LED COB PROFILE LIGHT 5M ROLL (WARM WHITE)", rate: 420.00 },
  { name: "LED COB PROFILE LIGHT 5M ROLL (NATURAL WHITE)", rate: 420.00 },
  { name: "ALUMINUM PROFILE CHANNEL WITH DIFFUSER (2 MTR)", rate: 160.00 },
  { name: "CONCEALED BOX 6-MODULE METAL", rate: 65.00 },
  { name: "CONCEALED BOX 8-MODULE METAL", rate: 85.00 },
  { name: "CONCEALED BOX 12-MODULE METAL", rate: 120.00 }
];

let items = [
  { name: "RGB ROPE LIGHT COMPLETE SET (STRIP, SENSOR)", qty: 2.0, rate: 350.00 },
  { name: "RGB ROPE LED LIGHT", qty: 1.0, rate: 260.00 }
];

const BILL_PREFIX = "EEL-";
let selectedBillNumbers = new Set();

// Utility: Clean phone numbers to Indian 10/12-digit standard
function cleanPhoneNumber(str) {
  const digits = (str || "").replace(/\D/g, '');
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return "91" + digits.substring(1);
  if (digits.length > 10) return "91" + digits.slice(-10);
  return "";
}

// Bill Sequence Helpers
function formatSequenceBillNo(num) {
  const validNum = Math.max(1, parseInt(num, 10) || 1);
  const formatted = validNum < 10000 ? String(validNum).padStart(4, '0') : String(validNum);
  return BILL_PREFIX + formatted;
}

function getCurrentSequenceNumber() {
  const saved = localStorage.getItem('expert_light_current_seq');
  if (!saved) {
    localStorage.setItem('expert_light_current_seq', '1');
    return 1;
  }
  return parseInt(saved, 10) || 1;
}

function incrementSequenceNumber() {
  const next = getCurrentSequenceNumber() + 1;
  localStorage.setItem('expert_light_current_seq', String(next));
  return next;
}

function onBillNoManualChange(val) {
  const match = val.match(/\d+\$/);
  if (match) {
    localStorage.setItem('expert_light_current_seq', match[0]);
  }
  saveAndRender();
}

function setupCatalogList() {
  const datalist = document.getElementById('catalogList');
  if (!datalist) return;
  datalist.innerHTML = '';
  PRODUCT_CATALOG.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = `₹${p.rate.toFixed(2)}`;
    datalist.appendChild(opt);
  });
}

function getTodayFormatted() {
  const date = new Date();
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

// Converts numbers into readable Indian currency text
function numberToWords(amount) {
  const single = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function parseChunk(val) {
    let out = '';
    val = parseInt(val, 10);
    if (val > 19) {
      out += tens[Math.floor(val / 10)] + ' ' + single[val % 10];
    } else {
      out += single[val];
    }
    return out;
  }

  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Only';

  const padded = String(rounded).padStart(9, '0');
  const crore = parseInt(padded.substring(0, 2), 10);
  const lakh = parseInt(padded.substring(2, 4), 10);
  const thousand = parseInt(padded.substring(4, 6), 10);
  const hundred = parseInt(padded.substring(6, 7), 10);
  const remainder = parseInt(padded.substring(7, 9), 10);

  let res = '';
  if (crore > 0) res += parseChunk(crore) + 'Crore ';
  if (lakh > 0) res += parseChunk(lakh) + 'Lakh ';
  if (thousand > 0) res += parseChunk(thousand) + 'Thousand ';
  if (hundred > 0) res += parseChunk(hundred) + 'Hundred ';
  if (remainder > 0) res += (res !== '' ? 'and ' : '') + parseChunk(remainder);

  return res.trim() + ' Only';
}

function handleProductNameInput(idx, text) {
  items[idx].name = text;
  const match = PRODUCT_CATALOG.find(p => p.name.toLowerCase() === text.trim().toLowerCase());
  if (match) {
    items[idx].rate = match.rate;
    const rateEl = document.getElementById(`item-rate-${idx}`);
    if (rateEl) rateEl.value = match.rate;
  }
  saveAndRender();
}

function renderEditor() {
  const container = document.getElementById('itemsContainer');
  if (!container) return;
  container.innerHTML = '';

  items.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'p-3 bg-gray-50 border border-gray-300 rounded space-y-2';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-gray-700">Item #${idx + 1}</span>
        ${items.length > 1 ? `<button onclick="removeItem(\${idx})" class="text-red-600 hover:text-red-800 text-xs font-bold flex items-center"><i data-lucide="trash-2" class="w-3.5 h-3.5 mr-0.5"></i> Delete</button>` : ''}
      </div>
      <div>
        <label class="block text-[11px] font-semibold text-gray-600">Product Name (Autofill)</label>
        <input 
          type="text" 
          list="catalogList" 
          value="${item.name}" 
          placeholder="Search or enter product..." 
          oninput="handleProductNameInput(${idx}, this.value)" 
          class="w-full text-xs p-1.5 border border-gray-300 rounded uppercase font-semibold outline-none bg-white" 
        />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[11px] font-semibold text-gray-600">Qty</label>
          <input type="number" step="any" value="${item.qty}" oninput="updateItem(${idx}, 'qty', this.value)" class="w-full text-xs p-1.5 border border-gray-300 rounded font-medium outline-none bg-white" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-gray-600">Rate (₹)</label>
          <input type="number" id="item-rate-${idx}" step="any" value="${item.rate}" oninput="updateItem(${idx}, 'rate', this.value)" class="w-full text-xs p-1.5 border border-gray-300 rounded font-medium outline-none bg-white" />
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

function addItem() {
  items.push({ name: "", qty: 1, rate: 0 });
  renderEditor();
  saveAndRender();
}

function removeItem(idx) {
  if (items.length > 1) {
    items.splice(idx, 1);
    renderEditor();
    saveAndRender();
  }
}

function updateItem(idx, key, val) {
  items[idx][key] = (key === 'qty' || key === 'rate') ? (parseFloat(val) || 0) : val;
  saveAndRender();
}

function saveAndRender() {
  const formPayload = {
    name: document.getElementById('custNamePhone').value,
    city: document.getElementById('custCity').value,
    billNo: document.getElementById('billNo').value,
    date: document.getElementById('billDate').value,
    oldBal: document.getElementById('oldBalance').value,
    note: document.getElementById('memoNote').value,
    status: document.getElementById('billPaymentStatus').value,
    items: items
  };

  localStorage.setItem('expert_light_last_bill', JSON.stringify(formPayload));

  // Sync printable invoice preview
  document.getElementById('pvCustNamePhone').textContent = formPayload.name || '-';
  document.getElementById('pvCustCity').textContent = formPayload.city || '-';
  document.getElementById('pvBillNo').textContent = formPayload.billNo || formatSequenceBillNo(1);
  document.getElementById('pvBillDate').textContent = formPayload.date || '-';
  document.getElementById('pvNote').textContent = formPayload.note || '';

  const tbody = document.getElementById('pvItemsBody');
  tbody.innerHTML = '';
  let subtotal = 0;

  items.forEach((item, idx) => {
    const total = (item.qty || 0) * (item.rate || 0);
    subtotal += total;
    const row = document.createElement('tr');
    row.className = 'text-center';
    row.innerHTML = `
      <td class="border-r border-black py-1">${idx + 1}</td>
      <td class="border-r border-black py-1 px-2 text-left uppercase font-normal">${item.name}</td>
      <td class="border-r border-black py-1">${Number(item.qty).toFixed(3)}</td>
      <td class="border-r border-black py-1">${Number(item.rate).toFixed(2)}</td>
      <td class="border-r border-black py-1"></td>
      <td class="border-r border-black py-1"></td>
      <td class="py-1 px-2 text-right">${total.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });

  const grandTotal = Math.round(subtotal);
  const roundDiff = grandTotal - subtotal;
  const oldBal = parseFloat(formPayload.oldBal) || 0;
  const netDue = oldBal + grandTotal;

  document.getElementById('pvSubTotal').textContent = subtotal.toFixed(2);
  document.getElementById('pvRoundOff').textContent = (roundDiff >= 0 ? '+' : '') + roundDiff.toFixed(2);
  document.getElementById('pvGrandTotal').textContent = grandTotal.toFixed(2);
  document.getElementById('pvAmountInWords').textContent = numberToWords(grandTotal);

  document.getElementById('pvOldBalance').textContent = oldBal.toFixed(2);
  document.getElementById('pvThisBill').textContent = grandTotal.toFixed(2);
  document.getElementById('pvNetBalance').textContent = netDue.toFixed(2);

  saveCurrentBill();
}

// Storage and Ledger Functions
function getAllSavedBills() {
  const records = localStorage.getItem('expert_light_saved_bills_history');
  return records ? JSON.parse(records) : [];
}

function saveCurrentBill() {
  const billNo = document.getElementById('billNo').value;
  const customer = document.getElementById('custNamePhone').value;
  if (!customer.trim() && items.every(i => !i.name)) return;

  const history = getAllSavedBills();
  const record = {
    billNo: billNo,
    date: document.getElementById('billDate').value,
    custNamePhone: customer,
    city: document.getElementById('custCity').value,
    thisBill: parseFloat(document.getElementById('pvGrandTotal').textContent) || 0,
    netBal: parseFloat(document.getElementById('pvNetBalance').textContent) || 0,
    status: document.getElementById('billPaymentStatus').value,
    note: document.getElementById('memoNote').value,
    timestamp: Date.now()
  };

  const existingIdx = history.findIndex(b => b.billNo === billNo);
  if (existingIdx >= 0) {
    history[existingIdx] = record;
  } else {
    history.unshift(record);
  }

  localStorage.setItem('expert_light_saved_bills_history', JSON.stringify(history));
  renderSavedBillsTable();
  calculateSelectedTotal();
}

function toggleBillPaymentStatus(billNo) {
  const history = getAllSavedBills();
  const entry = history.find(b => b.billNo === billNo);
  if (entry) {
    entry.status = entry.status === 'Paid' ? 'Unpaid' : 'Paid';
    localStorage.setItem('expert_light_saved_bills_history', JSON.stringify(history));

    if (document.getElementById('billNo').value === billNo) {
      document.getElementById('billPaymentStatus').value = entry.status;
    }
    renderSavedBillsTable();
    calculateSelectedTotal();
  }
}

// Checkbox and Multi-Bill Calculations
function toggleSelectAllBills(isChecked) {
  const history = getAllSavedBills();
  if (isChecked) {
    history.forEach(b => selectedBillNumbers.add(b.billNo));
  } else {
    selectedBillNumbers.clear();
  }
  renderSavedBillsTable();
  calculateSelectedTotal();
}

function toggleBillSelection(billNo) {
  if (selectedBillNumbers.has(billNo)) {
    selectedBillNumbers.delete(billNo);
  } else {
    selectedBillNumbers.add(billNo);
  }
  calculateSelectedTotal();
}

function calculateSelectedTotal() {
  const history = getAllSavedBills();
  let subtotal = 0;
  let count = 0;

  history.forEach(b => {
    if (selectedBillNumbers.has(b.billNo)) {
      subtotal += parseFloat(b.thisBill) || 0;
      count++;
    }
  });

  const adjustmentInput = document.getElementById('adjustmentInput');
  const adjustment = adjustmentInput ? (parseFloat(adjustmentInput.value) || 0) : 0;
  const netCalculated = subtotal + adjustment;

  const countEl = document.getElementById('selectedCount');
  const subtotalEl = document.getElementById('selectedSubtotal');
  const finalEl = document.getElementById('selectedFinalTotal');

  if (countEl) countEl.textContent = `${count} બિલ પસંદ કરેલ છે`;
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
  if (finalEl) finalEl.textContent = `₹${netCalculated.toFixed(2)} DB`;
}

function renderSavedBillsTable() {
  const tbody = document.getElementById('savedBillsTableBody');
  if (!tbody) return;
  const history = getAllSavedBills();
  const filterTerm = (document.getElementById('searchBillInput')?.value || '').toLowerCase();

  tbody.innerHTML = '';
  const filtered = history.filter(b => 
    (b.billNo || '').toLowerCase().includes(filterTerm) || 
    (b.custNamePhone || '').toLowerCase().includes(filterTerm)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-gray-400 font-semibold">કોઈ રેકોર્ડ મળ્યો નથી.</td></tr>`;
    return;
  }

  filtered.forEach(b => {
    const isPaid = b.status === 'Paid';
    const isChecked = selectedBillNumbers.has(b.billNo);

    const tr = document.createElement('tr');
    tr.className = `hover:bg-gray-50 ${isChecked ? 'bg-blue-50/70' : ''}`;
    tr.innerHTML = `
      <td class="p-2.5 text-center">
        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleBillSelection('${b.billNo}')" class="w-4 h-4 cursor-pointer" />
      </td>
      <td class="p-2.5 font-bold">${b.billNo}</td>
      <td class="p-2.5 text-gray-600">${b.date}</td>
      <td class="p-2.5 font-medium uppercase">${b.custNamePhone || '-'}</td>
      <td class="p-2.5 text-right font-semibold">₹${Number(b.thisBill).toFixed(2)}</td>
      <td class="p-2.5 text-right font-bold ${isPaid ? 'text-gray-500 line-through' : 'text-red-600'}">₹${Number(b.netBal).toFixed(2)} DB</td>
      <td class="p-2.5 text-center">
        <button onclick="toggleBillPaymentStatus('${b.billNo}')" class="px-2 py-1 rounded text-[10.5px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}">
          ${isPaid ? '✓ Paid' : 'Pending'}
        </button>
      </td>
      <td class="p-2.5 text-center">
        <button onclick="deleteSavedBill('${b.billNo}')" title="Delete Bill" class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-bold inline-flex items-center border border-red-200 transition">
          <i data-lucide="trash-2" class="w-3.5 h-3.5 mr-1"></i> Delete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

// Send Selected Multi-Bills with (+) or (-) adjustments via WhatsApp
function sendSelectedBillsWhatsApp() {
  if (selectedBillNumbers.size === 0) {
    alert("કૃપા કરીને ઓછામાં ઓછું 1 બિલ પસંદ કરો.");
    return;
  }

  const history = getAllSavedBills();
  const selectedBills = history.filter(b => selectedBillNumbers.has(b.billNo));

  let phone = "";
  let customerName = "";

  for (let b of selectedBills) {
    const p = cleanPhoneNumber(b.custNamePhone);
    if (p) {
      phone = p;
      customerName = b.custNamePhone;
      break;
    }
  }

  if (!phone) {
    const input = window.prompt("ગ્રાહકનો 10 આંકડાનો મોબાઈલ નંબર દાખલ કરો:", "");
    if (!input) return;
    phone = cleanPhoneNumber(input);
    customerName = input;
  }

  let lines = "";
  let subtotal = 0;

  selectedBills.forEach(b => {
    subtotal += parseFloat(b.thisBill) || 0;
    lines += `• બિલ ${b.billNo} (${b.date}): +₹${Number(b.thisBill).toFixed(2)} DB\n`;
  });

  const adjustment = parseFloat(document.getElementById('adjustmentInput')?.value) || 0;
  let adjustText = "";

  if (adjustment > 0) {
    adjustText = `• જૂનો હિસાબ / અન્ય રકમ: +₹${adjustment.toFixed(2)} DB\n`;
  } else if (adjustment < 0) {
    adjustText = `• માલ રીટર્ન / જમા રકમ: -₹${Math.abs(adjustment).toFixed(2)} CR\n`;
  }

  const grandFinal = subtotal + adjustment;

  const message = 
`*ખાતા વિગત / બાકી પેમેન્ટ હિસાબ - EXPERT LIGHT*
----------------------------------------
*ગ્રાહકનું નામ:* ${customerName}
*તારીખ:* ${getTodayFormatted()}

*પસંદ કરેલ બિલોની વિગત:*
${lines}${adjustText}----------------------------------------
*કુલ બાકી રકમ: ₹${grandFinal.toFixed(2)} DB*
----------------------------------------
મહેરબાની કરીને ઉપર મુજબનો હિસાબ ચકાસી રકમ રોકડ અથવા UPI દ્વારા જમા કરાવી આપવા નમ્ર વિનંતી.

આભાર,
*EXPERT LIGHT, રાજકોટ*
📞 સંપર્ક: 96620 09413`;

  const waLink = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(waLink, '_blank') || (window.location.href = waLink);
}

// Action Handlers
function newBill() {
  saveCurrentBill();
  const nextNumber = incrementSequenceNumber();
  document.getElementById('billNo').value = formatSequenceBillNo(nextNumber);
  document.getElementById('billDate').value = getTodayFormatted();
  document.getElementById('custNamePhone').value = "";
  document.getElementById('oldBalance').value = "0.00";
  document.getElementById('memoNote').value = "";
  document.getElementById('billPaymentStatus').value = "Unpaid";
  items = [{ name: "", qty: 1, rate: 0 }];
  renderEditor();
  saveAndRender();
}

function downloadPDF() {
  saveCurrentBill();
  const target = document.getElementById('printArea');
  const currentNo = document.getElementById('billNo').value || 'EEL-0001';

  const config = {
    margin: [4, 6, 4, 6],
    filename: `SalesBill_${currentNo}.pdf`,
    image: { type: 'jpeg', quality: 0.99 },
    html2canvas: { scale: 3, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(config).from(target).save().then(() => {
    const nextSeq = incrementSequenceNumber();
    document.getElementById('billNo').value = formatSequenceBillNo(nextSeq);
    saveAndRender();
  });
}
// Delete a specific bill from history
function deleteSavedBill(billNo) {
  const confirmDelete = window.confirm(`શું તમે ખરેખર બિલ ${billNo} ડિલીટ કરવા માંગો છો? (Are you sure you want to delete bill ${billNo}?)`);
  if (!confirmDelete) return;

  let history = getAllSavedBills();
  // Filter out the selected bill
  history = history.filter(b => b.billNo !== billNo);

  // Remove from selected set if it was checked
  if (selectedBillNumbers.has(billNo)) {
    selectedBillNumbers.delete(billNo);
  }

  // Save updated array to localStorage
  localStorage.setItem('expert_light_saved_bills_history', JSON.stringify(history));

  // Re-render table and update total
  renderSavedBillsTable();
  calculateSelectedTotal();
}
// Render dedicated "Pending Payments to Collect" view
function renderMyPendingPayments() {
  const tbody = document.getElementById('myPendingTableBody');
  const grandPendingEl = document.getElementById('grandPendingTotal');
  if (!tbody) return;

  const history = getAllSavedBills();
  const customerMap = {};
  let overallPendingSum = 0;

  // Group only UNPAID bills by customer
  history.forEach(bill => {
    if (bill.status === 'Paid') return;

    const phoneKey = cleanPhoneNumber(bill.custNamePhone) || (bill.custNamePhone || "").trim().toLowerCase();
    if (!phoneKey) return;

    if (!customerMap[phoneKey]) {
      customerMap[phoneKey] = {
        key: phoneKey,
        name: bill.custNamePhone,
        bills: [],
        totalDue: 0
      };
    }

    const billAmt = parseFloat(bill.thisBill) || 0;
    customerMap[phoneKey].bills.push(bill);
    customerMap[phoneKey].totalDue += billAmt;
    overallPendingSum += billAmt;
  });

  const pendingCustomers = Object.values(customerMap);
  tbody.innerHTML = '';

  if (grandPendingEl) {
    grandPendingEl.textContent = `₹${overallPendingSum.toFixed(2)} DB`;
  }

  if (pendingCustomers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-emerald-700 font-bold">🎉 તમામ પેમેન્ટ મળી ગયેલ છે! કોઈ બાકી રકમ નથી.</td></tr>`;
    return;
  }

  pendingCustomers.forEach(c => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-red-50/50';
    tr.innerHTML = `
      <td class="p-3 font-bold uppercase text-gray-800">${c.name}</td>
      <td class="p-3 text-center font-bold">
        <span class="bg-red-100 text-red-800 px-2 py-0.5 rounded-full">${c.bills.length} બિલ બાકી</span>
      </td>
      <td class="p-3 text-right font-black text-red-600 text-sm">₹${c.totalDue.toFixed(2)} DB</td>
      <td class="p-3 text-center">
        <button onclick="sendPendingCollectionReminder('${c.key}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold inline-flex items-center shadow transition">
          <i data-lucide="bell-ring" class="w-3.5 h-3.5 mr-1.5"></i> પેમેન્ટ રીમાઇન્ડર મોકલો
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

// Send detailed pending payment message to customer on WhatsApp
function sendPendingCollectionReminder(customerKey) {
  const history = getAllSavedBills();
  const unpaid = history.filter(b => {
    const key = cleanPhoneNumber(b.custNamePhone) || (b.custNamePhone || "").trim().toLowerCase();
    return key === customerKey && b.status !== 'Paid';
  });

  if (unpaid.length === 0) {
    alert("કોઈ બાકી બિલ મળ્યું નથી.");
    return;
  }

  const sample = unpaid[0];
  let phone = cleanPhoneNumber(sample.custNamePhone);

  if (!phone) {
    const manual = window.prompt("ગ્રાહકનો 10 આંકડાનો મોબાઈલ નંબર દાખલ કરો:", "");
    if (!manual) return;
    phone = cleanPhoneNumber(manual);
  }

  let totalDue = 0;
  let breakdown = "";

  unpaid.slice().reverse().forEach(b => {
    const amt = parseFloat(b.thisBill) || 0;
    totalDue += amt;
    breakdown += `• બિલ નં. ${b.billNo} (${b.date}): ₹${amt.toFixed(2)} DB\n`;
    if (b.note && b.note.trim()) {
      breakdown += `   ↳ નોંધ: ${b.note}\n`;
    }
  });

  // Open and Populate the Pending Payments Popup
function checkAndShowPendingReminderPopup() {
  const history = getAllSavedBills();
  const customerMap = {};
  let overallPendingSum = 0;

  // Aggregate pending amounts by customer
  history.forEach(b => {
    if (b.status === 'Paid') return;
    const key = cleanPhoneNumber(b.custNamePhone) || (b.custNamePhone || "").trim().toLowerCase();
    if (!key) return;

    if (!customerMap[key]) {
      customerMap[key] = {
        key: key,
        name: b.custNamePhone,
        totalDue: 0,
        billsCount: 0
      };
    }
    const amt = parseFloat(b.thisBill) || 0;
    customerMap[key].totalDue += amt;
    customerMap[key].billsCount += 1;
    overallPendingSum += amt;
  });

  const pendingList = Object.values(customerMap);

  // If there are no pending payments, do not show popup
  if (pendingList.length === 0 || overallPendingSum <= 0) return;

  // Set Modal Stats
  document.getElementById('modalGrandPendingTotal').textContent = `₹${overallPendingSum.toFixed(2)} DB`;
  document.getElementById('modalPendingCountBadge').textContent = `${pendingList.length} ગ્રાહકો બાકી`;

  const listContainer = document.getElementById('modalPendingCustomerList');
  listContainer.innerHTML = '';

  pendingList.forEach(c => {
    const item = document.createElement('div');
    item.className = 'p-2.5 flex items-center justify-between hover:bg-gray-50';
    item.innerHTML = `
      <div>
        <div class="text-xs font-bold uppercase text-gray-800">${c.name}</div>
        <div class="text-[11px] text-gray-500">${c.billsCount} બિલ બાકી</div>
      </div>
      <div class="flex items-center space-x-2">
        <span class="text-xs font-extrabold text-red-600">₹${c.totalDue.toFixed(2)} DB</span>
        <button onclick="sendPendingCollectionReminder('${c.key}')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold inline-flex items-center shadow-sm transition">
          <i data-lucide="send" class="w-3 h-3 mr-1"></i> Remind
        </button>
      </div>
    `;
    listContainer.appendChild(item);
  });

  // Reveal Modal
  const modal = document.getElementById('pendingPaymentModal');
  if (modal) {
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }
}

// Close Modal
function closePendingReminderModal() {
  const modal = document.getElementById('pendingPaymentModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}
// App Initialization
window.onload = () => {
  setupCatalogList();
  const today = getTodayFormatted();
  document.getElementById('billDate').value = today;

  const currentSeq = getCurrentSequenceNumber();
  const activeBillNo = formatSequenceBillNo(currentSeq);
  document.getElementById('billNo').value = activeBillNo;

  const cached = localStorage.getItem('expert_light_last_bill');
  if (cached) {
    try {
      const data = JSON.parse(cached);
      document.getElementById('custNamePhone').value = data.name || '';
      document.getElementById('custCity').value = data.city || 'RAJKOT';
      document.getElementById('oldBalance').value = data.oldBal || '0.00';
      document.getElementById('memoNote').value = data.note || '';
      document.getElementById('billPaymentStatus').value = data.status || 'Unpaid';
      document.getElementById('billDate').value = today;
      if (data.items && data.items.length) items = data.items;
    } catch (e) {
      console.error(e);
    }
  }

  document.getElementById('billNo').value = activeBillNo;

  renderEditor();
  saveAndRender();
  renderSavedBillsTable();
  calculateSelectedTotal();

  // Trigger Pending Alert Popup on opening
  setTimeout(checkAndShowPendingReminderPopup, 700);
};
