# Sentinel (Bản tiếng Việt)

Sentinel là một ứng dụng phi tập trung (dApp) chạy trên GenLayer giúp đăng ký và kiểm tra các đường link lừa đảo (phishing), giả mạo thương hiệu và rút tiền ví (wallet-drainer).

Hệ thống cho phép các thương hiệu (brand) tạo các nhóm phần thưởng (bounty pool) và đăng ký thông tin nhận diện chính thức của họ. Các thợ săn (hunter) sau đó tìm kiếm và báo cáo các URL đáng ngờ. Hợp đồng thông minh của GenLayer sẽ tự động render trang web dưới dạng văn bản (text), chụp ảnh màn hình (screenshot), gửi yêu cầu kiểm tra đến hội đồng AI on-chain để đạt đồng thuận và tự động chuyển thưởng cho thợ săn khi xác nhận có lừa đảo.

Sentinel được xây dựng với cơ chế phòng thủ tối đa. Giao diện người dùng sẽ chỉ hiển thị các URL đáng ngờ dưới dạng văn bản tĩnh (inert text) và không bao giờ tự động mở chúng.

---

## Cấu trúc thư mục

```text
contracts/
  storage_test.py
  sentinel.py           # Hợp đồng thông minh Sentinel v2
frontend/
  index.html
  package.json
  src/
    genlayer.js         # Giao tiếp với GenLayer SDK
    main.js             # Logic xử lý giao diện
    styles.css          # Giao diện CSS
docs/
  ARCHITECTURE.md       # Tài liệu kiến trúc hệ thống
  ECONOMICS.md          # Tài liệu mô hình kinh tế & phí
  CONTRIBUTING.md       # Hướng dẫn chạy local
  REPUTATION.md         # Hệ thống danh tiếng của Hunter
  APPEAL.md             # Cơ chế khiếu nại & phúc thẩm
```

---

## Tính năng nổi bật của v2

1. **AI Consensus nâng cấp**: Sử dụng `gl.eq_principle.prompt_comparative` với nhiều nguồn dữ liệu (Wayback Machine, urlscan.io, VirusTotal) và 3 góc nhìn phân tích (Kỹ thuật, Góc nhìn người dùng hoài nghi, Pháp lý).
2. **Hệ thống danh tiếng (Hunter Reputation)**: Tích hợp 4 cấp bậc danh tiếng: Đồng, Bạc, Vàng, Kim cương. Cấp bậc cao giúp giảm đến 75% phí đặt cọc (stake) và được miễn phí nền tảng 2.5% (payout boost).
3. **Cơ chế khiếu nại (Appeal Flow)**: Cho phép thợ săn khiếu nại các phán quyết sai hoặc chưa rõ ràng bằng cách khóa phí khiếu nại. Hội đồng AI phúc thẩm sẽ đưa ra phán quyết cuối cùng.
4. **Chế độ Demo (Demo Mode)**: Hỗ trợ kiểm thử trực tiếp giao diện thông qua tham số `?demo=1` mà không cần deploy hợp đồng thực tế.

---

## Cài đặt và Chạy thử local

Xem tài liệu hướng dẫn chi tiết tại [CONTRIBUTING.md](docs/CONTRIBUTING.md).

### 1. Chạy Unit Tests
```bash
pytest -v tests/
```

### 2. Chạy Frontend
```bash
cd frontend
npm install
npm run dev
```

Truy cập `http://localhost:5173/?demo=1` để trải nghiệm trực tiếp chế độ mô phỏng Demo.
