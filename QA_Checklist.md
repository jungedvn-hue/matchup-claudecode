# Tour Manager Beta - QA Checklist

## 1. Cơ sở hạ tầng (Database)
- [ ] Thêm cột `pools` (JSONB) vào bảng `tour_categories`
- [ ] Thêm cột `bracket_rounds` (JSONB) vào bảng `tour_categories`
- [x] Cột `referees` và `courts` trong bảng `tournaments` (Đã có)

## 2. Luồng Khởi tạo (Creation Flow)
- [ ] Tạo giải đấu mới -> Lưu thành công lên Cloud
- [ ] Thêm vận động viên vào từng hạng mục -> Lưu thành công
- [ ] Xóa giải đấu -> Xóa sạch dữ liệu liên quan (Categories, Matches, Participants)

## 3. Luồng Thi đấu (Tournament Engine)
- [ ] Chia bảng (Auto/Manual) -> Lưu được cấu trúc Pool lên Cloud
- [ ] Sinh trận đấu (Generate Matches) -> Trận đấu xuất hiện đầy đủ
- [ ] Nhập điểm (Score Entry) -> Real-time đồng bộ sang máy khác
- [ ] Tính bảng xếp hạng (Standings) -> Chính xác theo luật (H2H, Point Diff...)
- [ ] Kết thúc bảng -> Sinh nhánh Knockout (Bracket) tự động

## 4. Trải nghiệm người dùng (UX/UI)
- [x] Loading overlay khi đang đồng bộ (Đã có)
- [x] Batching Real-time để tránh treo máy (Đã có)
- [ ] Hiển thị thông báo lỗi rõ ràng khi mất kết nối
