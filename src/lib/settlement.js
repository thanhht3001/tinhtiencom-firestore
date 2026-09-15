const SETTLEMENT_EPSILON = 1;

// Thuật toán tham lam tối giản hoá công nợ: ghép người nợ nhiều nhất với người
// được nợ nhiều nhất, cấn trừ tối đa có thể, lặp lại tới khi hết. Tối đa (n-1)
// giao dịch cho n người. Y hệt donGianHoaNo() trong Code.gs bản Apps Script gốc.
export function donGianHoaNo(perPerson) {
  const debtors = [];
  const creditors = [];
  perPerson.forEach((p) => {
    if (p.net < -SETTLEMENT_EPSILON) debtors.push({ ten: p.ten, soTien: -p.net });
    else if (p.net > SETTLEMENT_EPSILON) creditors.push({ ten: p.ten, soTien: p.net });
  });
  debtors.sort((a, b) => b.soTien - a.soTien);
  creditors.sort((a, b) => b.soTien - a.soTien);

  const giaoDich = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.round(Math.min(debtors[i].soTien, creditors[j].soTien));
    if (amt > 0) giaoDich.push({ tu: debtors[i].ten, den: creditors[j].ten, soTien: amt });
    debtors[i].soTien -= amt;
    creditors[j].soTien -= amt;
    if (debtors[i].soTien <= SETTLEMENT_EPSILON) i++;
    if (creditors[j].soTien <= SETTLEMENT_EPSILON) j++;
  }
  return giaoDich;
}

function sortByNgayChi(a, b) {
  return a.ngayChi < b.ngayChi ? -1 : a.ngayChi > b.ngayChi ? 1 : 0;
}

// Tính tổng đã trả/phải trả từng người từ danh sách khoản chi + phần chia đang
// mở, và gợi ý giao dịch tối giản. Tương đương computeOpenSettlement() trong
// Code.gs, chỉ khác nguồn dữ liệu đầu vào (mảng đọc từ Firestore thay vì sheet).
export function computeSettlement(expenses, shares, memberNames) {
  const daTra = {};
  const chiTietTheoNguoiChi = {};
  const chiTieuInfoById = {};
  let tongSoTien = 0;
  let tuNgay = null;
  let denNgay = null;

  expenses.forEach((exp) => {
    daTra[exp.nguoiChi] = (daTra[exp.nguoiChi] || 0) + exp.soTien;
    tongSoTien += exp.soTien;
    if (!tuNgay || exp.ngayChi < tuNgay) tuNgay = exp.ngayChi;
    if (!denNgay || exp.ngayChi > denNgay) denNgay = exp.ngayChi;
    chiTieuInfoById[exp.id] = { ngayChi: exp.ngayChi, noiDung: exp.noiDung, nguoiChi: exp.nguoiChi };
    if (!chiTietTheoNguoiChi[exp.nguoiChi]) chiTietTheoNguoiChi[exp.nguoiChi] = [];
    chiTietTheoNguoiChi[exp.nguoiChi].push({
      ngayChi: exp.ngayChi,
      noiDung: exp.noiDung,
      soTien: exp.soTien,
    });
  });

  const phaiTra = {};
  const chiTietThamGiaTheoNguoi = {};

  shares.forEach((s) => {
    phaiTra[s.nguoiThamGia] = (phaiTra[s.nguoiThamGia] || 0) + s.soTien;
    const info = chiTieuInfoById[s.expenseId] || {};
    if (!chiTietThamGiaTheoNguoi[s.nguoiThamGia]) chiTietThamGiaTheoNguoi[s.nguoiThamGia] = [];
    chiTietThamGiaTheoNguoi[s.nguoiThamGia].push({
      ngayChi: info.ngayChi,
      noiDung: info.noiDung,
      nguoiChi: info.nguoiChi,
      soTien: s.soTien,
    });
  });

  const tenAll = new Set([...memberNames, ...Object.keys(daTra), ...Object.keys(phaiTra)]);

  const perPerson = Array.from(tenAll).map((ten) => {
    const da = Math.round((daTra[ten] || 0) * 100) / 100;
    const phai = Math.round((phaiTra[ten] || 0) * 100) / 100;
    return {
      ten,
      daTra: da,
      phaiTra: phai,
      net: Math.round((da - phai) * 100) / 100,
      chiTietDaChi: (chiTietTheoNguoiChi[ten] || []).slice().sort(sortByNgayChi),
      chiTietPhaiTra: (chiTietThamGiaTheoNguoi[ten] || []).slice().sort(sortByNgayChi),
    };
  });

  return {
    perPerson,
    transactions: donGianHoaNo(perPerson),
    soDongChiTieu: expenses.length,
    tongSoTien,
    tuNgay,
    denNgay,
  };
}
